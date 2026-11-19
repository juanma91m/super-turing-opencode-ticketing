import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { nativeMessages } from './native-messages.mjs';

const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const iso = value => number(value) === null ? null : new Date(value).toISOString().replace(/\.\d{3}Z$/, '+00:00');
const info = value => value?.data?.id ? value.data : value;
const count = values => Object.fromEntries([...values.reduce((map,value)=>map.set(value,(map.get(value)??0)+1),new Map())]);
const sum = values => values.some(value=>value===null) ? null : values.reduce((left,right)=>left+right,0);
const publicText = value => { assert(typeof value==='string'&&!/<\/?private\b|(?:password|bearer|api[_-]?key|access[_-]?token)\s*[=:]/i.test(value),'Private/sensitive metric metadata refused; values suppressed');return value; };
export const slug = value => [...value].map(char=>/[\p{L}\p{N}_-]/u.test(char)?char.toLowerCase():'-').join('').replace(/^-+|-+$/g,'')||'ticket';
export const measurement = {backend:'opencode-public-api-2.2.7',tokens:'normalized-exclusive-component-sum-v1',history:'stored-native-messages-v1',snapshotAtomic:false};

export function computeMetrics(session, rows) {
  // Raw text/tool output is used only by selection in host RAM, never copied
  // into this projection, files, subprocess input, logs or the tool response.
  const assistants=rows.filter(row=>row.type==='assistant'||row.type==='compaction'&&row.status==='completed');
  const tools=assistants.flatMap(row=>(row.content??[]).filter(part=>part.type==='tool'));
  const components=assistants.map(row=>[row.tokens?.input,row.tokens?.output,row.tokens?.reasoning,row.tokens?.cache?.read,row.tokens?.cache?.write].map(number));
  const models=assistants.map(row=>row.model?.providerID&&row.model?.id?publicText(row.model.providerID+'/'+row.model.id+(row.model.variant?'#'+row.model.variant:'')):null).filter(Boolean);
  const created=assistants.map(row=>number(row.time?.created)).filter(value=>value!==null),completed=assistants.map(row=>number(row.time?.completed)).filter(value=>value!==null);
  const totalCost=sum(assistants.map(row=>number(row.cost)));
  return {
    session:{id:session.id,title:session.title==null?null:publicText(session.title),project_id:session.projectID??null,directory:session.location?.directory??null,agent:session.agent??null,model:session.model??null,
      created_at:iso(session.time?.created),updated_at:iso(session.time?.updated),duration_ms:number(session.time?.created)!==null&&number(session.time?.updated)!==null?Math.max(0,session.time.updated-session.time.created):null},
    messages:{count:rows.length,assistant_count:assistants.length,by_role:count(rows.map(row=>row.type==='compaction'&&row.status==='completed'?'assistant':row.type)),finish_reasons:count(assistants.map(row=>row.finish).filter(Boolean))},
    tokens:{total:sum(components.map(sum)),input:sum(components.map(row=>row[0])),output:sum(components.map(row=>row[1])),reasoning:sum(components.map(row=>row[2])),cache_read:sum(components.map(row=>row[3])),cache_write:sum(components.map(row=>row[4]))},
    cost:{total:totalCost===null?null:Math.round(totalCost*1e6)/1e6},models:count(models),agents:count(assistants.map(row=>row.type==='compaction'?'compaction':row.agent).filter(Boolean).map(publicText)),
    tools:{count:tools.length,by_name:count(tools.map(row=>publicText(row.name))),by_name_and_status:count(tools.map(row=>publicText(row.name+':'+(row.state?.status??'unknown'))))},
    timing:{assistant_wall_ms:assistants.reduce((total,row)=>total+(number(row.time?.created)!==null&&number(row.time?.completed)!==null?Math.max(0,row.time.completed-row.time.created):0),0),assistant_first_created_at:created.length?iso(Math.min(...created)):null,assistant_last_completed_at:completed.length?iso(Math.max(...completed)):null},
    measurement:{...measurement,missingUsage:components.some(row=>row.includes(null))}
  };
}

function ticketMatch(session, rows, ticket) {
  if ((session.title??'').toUpperCase().includes(ticket)) return true;
  const queue=[...rows];
  while(queue.length){const value=queue.pop();if(typeof value==='string'&&value.toUpperCase().includes(ticket))return true;if(value&&typeof value==='object')queue.push(...Object.values(value));}
  return false;
}
export async function storedRows(messages, sessionID, signal) {
  const rows=[],seen=new Set(),cursors=new Set();let cursor;
  while(true){signal?.throwIfAborted();const page=await messages.list({sessionID,limit:100,...(cursor?{cursor}:{order:'asc'})},signal);
    assert(Array.isArray(page.data)&&page.cursor,'Native message pagination changed; no partial metrics');
    for(const row of page.data){assert(typeof row.id==='string'&&typeof row.type==='string'&&!seen.has(row.id),'Duplicate/unknown stored message');seen.add(row.id);rows.push(row);}
    if(!page.cursor.next)return rows;assert(!cursors.has(page.cursor.next),'Repeated native history cursor');cursors.add(page.cursor.next);cursor=page.cursor.next;
  }
}
export async function selectMetrics(ctx, input, root, signal, messages=nativeMessages()) {
  const ticket=publicText(input.ticket.trim().toUpperCase());assert(ticket,'Nonempty ticket required');
  if(input.session){assert(/^ses_[A-Za-z0-9]+$/.test(input.session),'Native session ID required');const session=info(await ctx.session.get({sessionID:input.session})),rows=await storedRows(messages,session.id,signal);return {session,rows,matched:ticketMatch(session,rows,ticket)};}
  const maximum=input.maxCount??20;assert(Number.isSafeInteger(maximum)&&maximum>0,'Positive max-count required');
  const candidates=[],seen=new Set(),cursors=new Set();let cursor;
  while(candidates.length<maximum){const page=await ctx.session.list(cursor?{cursor}:{limit:Math.min(100,maximum),order:'desc'});assert(Array.isArray(page.data)&&page.cursor,'Native session pagination changed');
    for(const session of page.data){assert(!seen.has(session.id),'Duplicate session metadata');seen.add(session.id);candidates.push(session);if(candidates.length===maximum)break;}
    if(!page.cursor.next||candidates.length===maximum)break;assert(!cursors.has(page.cursor.next),'Repeated session cursor');cursors.add(page.cursor.next);cursor=page.cursor.next;
  }
  let fallback;
  for(const session of candidates){const directory=session.location?.directory;if(!directory||!(directory===root||directory.startsWith(root+path.sep)))continue;
    const rows=await storedRows(messages,session.id,signal),selected={session,rows,matched:ticketMatch(session,rows,ticket)};
    fallback??=selected;if(selected.matched)return selected;
  }
  assert(fallback,'No recent session under the selected project');return fallback;
}

function noLinks(file) { let current=path.parse(file).root;for(const part of path.relative(current,file).split(path.sep)){current=path.join(current,part);try{assert(!fs.lstatSync(current).isSymbolicLink(),'Metrics symlink refused');}catch(error){if(error.code!=='ENOENT')throw error;}} }
export function metricsDirectory(root,ticket){assert(path.isAbsolute(root)&&fs.realpathSync(root)===root,'Physical project root required');const temporary=path.join(root,'tmp'),directory=path.resolve(temporary,ticket,'metrics');assert(directory.startsWith(temporary+path.sep),'Metrics must remain under project tmp');noLinks(directory);return directory;}
const readJSON=file=>{noLinks(file);const text=publicText(fs.readFileSync(file,'utf8'));return JSON.parse(text);};
function write(file,bytes,exclusive=false){noLinks(file);if(exclusive){fs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});return;}const temporary=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(temporary,bytes,{flag:'wx',mode:0o600});fs.renameSync(temporary,file);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}}
const json=value=>JSON.stringify(value,null,2)+'\n';
const display=value=>value===null||value===undefined?'n/a':value;
export function summaryMarkdown(ticket,summary){
  const lines=['# Ticket metrics — '+ticket,''],phases=Object.entries(summary.phases??{});
  if(!phases.length)lines.push('No hay fases capturadas todavía.');else{lines.push('| Phase | Session | Model | Duration | Total tokens | Input | Output | Reasoning | Tools |','|---|---|---|---:|---:|---:|---:|---:|---:|');for(const [phase,payload]of phases){const session=payload.session??{},tokens=payload.tokens??{};lines.push(`| ${phase} | \`${session.id??'n/a'}\` | \`${Object.keys(payload.models??{})[0]??'n/a'}\` | ${session.duration_ms===null?'n/a':((session.duration_ms??0)/1000).toFixed(1)+'s'} | ${display(tokens.total)} | ${display(tokens.input)} | ${display(tokens.output)} | ${display(tokens.reasoning)} | ${payload.tools?.count??0} |`);}}
  const history=Object.entries(summary.history??{}).flatMap(([phase,entries])=>entries.map(entry=>({phase,...entry}))).sort((left,right)=>(left.captured_at??'').localeCompare(right.captured_at??'')||left.phase.localeCompare(right.phase));
  if(history.length){lines.push('','## Historial','','| Phase | Iteration | Summary | Model | Duration | Total tokens | Tools |','|---|---:|---|---|---:|---:|---:|');for(const entry of history)lines.push(`| ${entry.phase} | ${entry.index??'n/a'} | ${entry.summary??'(sin resumen)'} | \`${entry.model??'n/a'}\` | ${entry.duration_ms===null?'n/a':((entry.duration_ms??0)/1000).toFixed(1)+'s'} | ${display(entry.tokens?.total)} | ${entry.tool_count??0} |`);}
  lines.push('');return lines.join('\n')+'\n';
}
export function storeCapture(root,input,selected,now=new Date()){
  const ticket=publicText(input.ticket.trim().toUpperCase()),phase=publicText(input.phase?.trim().toLowerCase()??'');assert(phase,'Nonempty phase required');const description=publicText(input.summary?.trim()||'(sin resumen)'),directory=metricsDirectory(root,ticket);
  const metrics={...computeMetrics(selected.session,selected.rows),ticket,phase,captured_at:now.toISOString().replace(/\.\d{3}Z$/,'+00:00'),summary:description,selection:{explicit_session:input.session??null,matched_ticket:selected.matched,max_count:input.maxCount??20}};
  const history=path.join(directory,'history');fs.mkdirSync(history,{recursive:true,mode:0o700});noLinks(history);
  let maximum=0;for(const name of fs.readdirSync(history)){const prefix=slug(phase)+'-';if(name.startsWith(prefix)&&/^\d+\.json$/.test(name.slice(prefix.length)))maximum=Math.max(maximum,Number(name.slice(prefix.length,-5)));}
  const index=maximum+1;assert(Number.isSafeInteger(index),'History index exceeds safe representation');metrics.history_index=index;const historyFile=path.join(history,slug(phase)+'-'+index+'.json'),phaseFile=path.join(directory,slug(phase)+'.json'),summaryFile=path.join(directory,'summary.json');
  const summary=fs.existsSync(summaryFile)?readJSON(summaryFile):{ticket,updated_at:metrics.captured_at,phases:{},history:{}};
  summary.ticket=ticket;summary.updated_at=metrics.captured_at;summary.phases??={};summary.history??={};
  Object.defineProperty(summary.phases,phase,{value:metrics,enumerable:true,writable:true,configurable:true});
  const entry={phase,index,summary:description,captured_at:metrics.captured_at,session_id:metrics.session.id,session_title:metrics.session.title,model:Object.keys(metrics.models)[0]??'n/a',duration_ms:metrics.session.duration_ms,tokens:{total:metrics.tokens.total,input:metrics.tokens.input,output:metrics.tokens.output,reasoning:metrics.tokens.reasoning},tool_count:metrics.tools.count,file:historyFile,measurement:metrics.measurement};
  const previous=Object.hasOwn(summary.history,phase)?summary.history[phase]:[];assert(Array.isArray(previous),'Phase history changed shape');Object.defineProperty(summary.history,phase,{value:[...previous,entry],enumerable:true,writable:true,configurable:true});
  publicText(json(summary));write(historyFile,json(metrics),true);write(phaseFile,json(metrics));write(summaryFile,json(summary));write(path.join(directory,'summary.md'),summaryMarkdown(ticket,summary));
  return {status:'ok',ticket,phase,history_file:historyFile,history_index:index,metrics_file:phaseFile,summary_file:path.join(directory,'summary.md'),session_id:metrics.session.id,matched_ticket:selected.matched,model_keys:Object.keys(metrics.models),measurement:metrics.measurement};
}
export function reportMetrics(root,input){const directory=metricsDirectory(root,publicText(input.ticket.trim().toUpperCase())),file=path.join(directory,'summary.json');assert(fs.existsSync(file),'Metrics summary does not exist; no capture was performed');const summary=readJSON(file);if(input.json)return json(summary);const markdown=path.join(directory,'summary.md');if(fs.existsSync(markdown)){noLinks(markdown);return publicText(fs.readFileSync(markdown,'utf8'));}return json(summary);}

export async function register(ctx){
  const properties={operation:{type:'string',enum:['capture','report']},ticket:{type:'string'},phase:{type:'string'},session:{type:'string'},summary:{type:'string'},maxCount:{type:'integer',minimum:1,default:20},projectRoot:{type:'string'},json:{type:'boolean',default:false}};
  let queue=Promise.resolve();
  await ctx.tool.transform(editor=>editor.add({name:'ticket-metrics',description:'Capture/report local ticket-phase metrics through public stored V2 history. Preserves phase latest/history/summary files. No CLI export, SQL, conversation dump or automatic workflow activation; unknown usage is null, normalized totals are not V1 billing.',options:{codemode:false},input:{type:'object',properties,required:['operation','ticket'],additionalProperties:false},execute:async(input,context)=>{
    const {data:actor}=await ctx.agent.get({agentID:context.agent});const allowed=actor?.permissions?.findLast(rule=>new RegExp('^'+rule.action.replace(/[.+^${}()|[\]\\]/g,'\\$&').replaceAll('*','.*')+'$').test('ticket-metrics')&&rule.resource==='*')?.effect;assert(['allow','ask'].includes(allowed),'Ticket metrics is outside this native actor contract');
    const project=ctx.location.project?.directory;const root=fs.realpathSync(input.projectRoot??(project&&project!=='/'?project:ctx.location.directory));metricsDirectory(root,publicText(input.ticket.trim().toUpperCase()));
    await ctx.permission.assert({sessionID:context.sessionID,agent:context.agent,source:{type:'tool',messageID:context.messageID,id:context.id},action:'ticket-metrics',resources:[input.operation+':'+root]});
    if(root!==ctx.location.project?.directory&&root!==ctx.location.directory)await ctx.permission.assert({sessionID:context.sessionID,agent:context.agent,action:'external_directory',resources:[root]});
    if(input.operation==='report')return {content:reportMetrics(root,input)};
    assert(input.phase?.trim(),'Capture requires phase');const selected=await selectMetrics(ctx,input,root,context.signal);
    if(selected.session.location?.directory!==root&&!selected.session.location?.directory?.startsWith(root+path.sep))await ctx.permission.assert({sessionID:context.sessionID,agent:context.agent,action:'external_directory',resources:[selected.session.location.directory]});
    const operation=queue.then(()=>{context.signal?.throwIfAborted();return storeCapture(root,input,selected);});queue=operation.catch(()=>{});return {content:JSON.stringify(await operation)};
  }}));
}
