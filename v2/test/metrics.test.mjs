import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { computeMetrics,storedRows,selectMetrics,storeCapture,reportMetrics,metricsDirectory } from '../plugins/metrics/native.mjs';

const session={id:'ses_fixture',title:'TEST-1 fixture',projectID:'project-fixture',location:{directory:'/fixture'},agent:'master-dev',model:{providerID:'fixture',id:'model'},time:{created:0,updated:1000}};
const rows=[{id:'msg_user',type:'user',text:'PRIVATE_USER_BODY_NOT_TO_PERSIST',time:{created:0}},
  ...[0,1].map(index=>({id:'msg_assistant'+index,type:'assistant',agent:'master-dev',model:{providerID:'fixture',id:'model',variant:'medium'},finish:'stop',cost:0.25,tokens:{input:12,output:4,reasoning:2,cache:{read:1,write:3}},time:{created:100+index*400,completed:300+index*500},content:[{type:'text',text:'PRIVATE_ASSISTANT_BODY_NOT_TO_PERSIST'},{type:'tool',name:'fixture_tool',state:{status:index?'error':'completed',content:[{type:'text',text:'PRIVATE_TOOL_BODY_NOT_TO_PERSIST'}]}}]}))];

test('metrics projection retains legacy fields/counts/model variants, exclusive tokens and no bodies',()=>{
  const projected=computeMetrics(session,rows);assert.equal(projected.tokens.total,44);assert.equal(projected.tools.count,2);assert.equal(projected.models['fixture/model#medium'],2);assert.equal(projected.cost.total,0.5);assert.equal(projected.timing.assistant_wall_ms,500);
  assert(!JSON.stringify(projected).includes('PRIVATE_'));assert.equal(computeMetrics(session,[{...rows[1],tokens:undefined,cost:undefined}]).tokens.total,null);
  const compaction={id:'msg_compact',type:'compaction',status:'completed',model:rows[1].model,tokens:rows[1].tokens,cost:1,time:{created:900},summary:'PRIVATE_SUMMARY'};const result=computeMetrics(session,[...rows,compaction]);assert.equal(result.messages.assistant_count,3);assert.equal(result.agents.compaction,1);assert(!JSON.stringify(result).includes('PRIVATE_SUMMARY'));
});

test('projection parity against installed V1 pure compute only, never V1 export/list',t=>{
  const file=path.join(os.homedir(),'.config/opencode/scripts/ticket_metrics.py');if(!fs.existsSync(file)){t.skip('Optional historical pure reference is not installed');return;}
  const exported={info:{...session,directory:session.location.directory},messages:rows.map(row=>({info:row.type==='user'?{role:'user',time:row.time}:{role:'assistant',agent:row.agent,providerID:row.model.providerID,modelID:row.model.id,variant:row.model.variant,finish:row.finish,cost:row.cost,time:row.time,tokens:{...row.tokens,total:22}},parts:row.type==='assistant'?row.content.filter(part=>part.type==='tool').map(part=>({type:'tool',tool:part.name,state:part.state})):[]}))};
  const code='import importlib.util,json,sys\nsys.dont_write_bytecode=True\nspec=importlib.util.spec_from_file_location("reference",sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps(m.compute_metrics(json.load(sys.stdin))))';
  const result=spawnSync('python3',['-c',code,file],{input:JSON.stringify(exported),encoding:'utf8',env:{PATH:'/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1'},timeout:10000});assert.equal(result.status,0);const actual=computeMetrics(session,rows);delete actual.measurement;assert.deepEqual(actual,JSON.parse(result.stdout));
});

test('capture replaces latest, appends numbered history and report/CLI preserve stored summary without recapture',t=>{
  const root=fs.mkdtempSync('/tmp/opencode/ticket-metrics-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const input={ticket:' test-1 ',phase:'PLAN',summary:'fixture only'},selected={session:{...session,location:{directory:root}},rows,matched:true};
  const first=storeCapture(root,input,selected),second=storeCapture(root,{...input,summary:'second fixture'},selected);assert.equal(first.history_index,1);assert.equal(second.history_index,2);
  const latest=JSON.parse(fs.readFileSync(second.metrics_file));assert.equal(latest.summary,'second fixture');assert.equal(JSON.parse(reportMetrics(root,{ticket:'TEST-1',json:true})).history.plan.length,2);
  for(const file of [first.history_file,second.history_file,second.metrics_file,second.summary_file,path.join(root,'tmp/TEST-1/metrics/summary.json')])assert(!fs.readFileSync(file,'utf8').includes('PRIVATE_'));
  const native=reportMetrics(root,{ticket:'TEST-1'}),cli=spawnSync('python3',[new URL('../metrics-report.py',import.meta.url).pathname,'report','--ticket','TEST-1','--project-root',root],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1'},timeout:10000});assert.equal(cli.status,0);assert.equal(cli.stdout,native);
  const denied=spawnSync('python3',[new URL('../metrics-report.py',import.meta.url).pathname,'capture','--ticket','TEST-1','--project-root',root,'--phase','plan'],{encoding:'utf8',env:{PATH:'/usr/bin:/bin'},timeout:10000});assert.equal(denied.status,2);assert(denied.stderr.includes('ticket-metrics'));
});

test('all stored pages are read, body ticket match/fallback and explicit session are preserved; repeated cursors fail',async()=>{
  const recent={...session,id:'ses_recent',title:'Other',location:{directory:'/fixture'}},matching={...session,id:'ses_matching',title:'Other',location:{directory:'/fixture/nested'}};
  const messages={list:async input=>input.cursor?{data:[{id:'msg_match',type:'user',text:input.sessionID==='ses_recent'?'other':'TEST-1 body match',time:{created:1}}],cursor:{}}:{data:[{id:'msg_first',type:'user',text:'other',time:{created:0}}],cursor:{next:'next'}}};
  const ctx={session:{list:async()=>({data:[recent,matching],cursor:{}}),get:async({sessionID})=>({...matching,id:sessionID})}};
  const selected=await selectMetrics(ctx,{ticket:'TEST-1',maxCount:20},'/fixture',undefined,messages);assert.equal(selected.session.id,'ses_matching');assert(selected.matched);assert.equal(selected.rows.length,2);
  const fallback=await selectMetrics(ctx,{ticket:'UNMATCHED'},'/fixture',undefined,messages);assert.equal(fallback.session.id,'ses_recent');assert.equal(fallback.matched,false);
  const explicit=await selectMetrics(ctx,{ticket:'TEST-1',session:'ses_explicit'},'/fixture',undefined,messages);assert.equal(explicit.session.id,'ses_explicit');
  await assert.rejects(()=>storedRows({list:async()=>({data:[],cursor:{next:'stuck'}})},'ses_fixture'),/Repeated/);
});

test('traversal, symlinks and private metadata fail without publishing captures',t=>{
  const root=fs.mkdtempSync('/tmp/opencode/ticket-metrics-safety-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  assert.throws(()=>metricsDirectory(root,'../../escape'));assert.throws(()=>storeCapture(root,{ticket:'TEST-1',phase:'plan',summary:'<private>must not persist</private>'},{session,rows,matched:true}));assert(!fs.existsSync(path.join(root,'tmp')));
  const outside=path.join(root,'outside');fs.mkdirSync(outside);fs.symlinkSync(outside,path.join(root,'tmp'));assert.throws(()=>metricsDirectory(root,'TEST-1'),/symlink/);
});
