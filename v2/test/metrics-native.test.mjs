import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { prepareGeneral,generalEnvironment } from '../../../opencode-stack/v2/general/profile.mjs';
import { startOwnedServer,until } from '../../../opencode-stack/v2/general/owned-server.mjs';
import { officialRuntime } from '../../../opencode-stack/v2/general/lifecycle.mjs';
import { nativeAddonFixture } from '../../../opencode-stack/v2/testing/fixtures/general-addon-stack.mjs';

test('official native capture/report uses stored messages, preserves ask/rejection/role boundaries and writes only projected metrics',async t=>{
  const root=fs.mkdtempSync('/tmp/opencode/native-ticket-metrics-');t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const project=path.join(root,'project'),control=path.join(root,'control');fs.mkdirSync(project);fs.mkdirSync(control);fs.writeFileSync(path.join(control,'package.json'),'{"type":"module"}');fs.writeFileSync(path.join(control,'index.ts'),'import {Plugin} from "@opencode/plugin";export default Plugin.define({id:"fixture.metric-title",async setup(ctx){await ctx.session.hook("title",e=>{e.result="Synthetic ticket metrics"})}});');
  assert.equal(spawnSync('/usr/bin/git',['init','--quiet'],{cwd:project,env:{PATH:'/usr/bin:/bin',HOME:root,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}}).status,0);
  let seedID,server,error;const finished=new Set(),results=new Map(),approvals=new Set();
  const mock=http.createServer(async(request,response)=>{try{
    let raw='';for await(const chunk of request)raw+=chunk;const body=JSON.parse(raw),kind=JSON.stringify(body.messages.filter(row=>row.role==='user').at(-1)).match(/METRIC_CASE_(SEED|CAPTURE|REPORT|REJECT|DENY)/)?.[1];assert(kind,'Unexpected fixture model request');
    const result=body.messages.find(row=>row.role==='tool'&&row.tool_call_id===kind);if(result)results.set(kind,JSON.stringify(result.content));
    response.writeHead(200,{'Content-Type':'text/event-stream'});const emit=(delta,finish_reason=null,usage)=>response.write('data: '+JSON.stringify({id:'metric-fixture',object:'chat.completion.chunk',created:1,model:'mock',choices:[{index:0,delta,finish_reason}],...(usage?{usage}:{})})+'\n\n');
    if(kind==='SEED'){finished.add(kind);emit({role:'assistant',content:'SYNTHETIC_PRIVATE_BODY_NOT_TO_PERSIST'});emit({},'stop',{prompt_tokens:12,completion_tokens:4,total_tokens:16});}
    else if(!result){const input={operation:kind==='REPORT'?'report':'capture',ticket:'TEST-1',phase:kind==='REJECT'?'rejected':'plan',session:seedID,projectRoot:project};emit({role:'assistant',tool_calls:[{index:0,id:kind,type:'function',function:{name:'ticket-metrics',arguments:JSON.stringify(input)}}]});emit({},'tool_calls');}
    else{finished.add(kind);emit({role:'assistant',content:'Synthetic metrics complete'});emit({},'stop');}response.end('data: [DONE]\n\n');
  }catch(failure){error=failure.message;response.writeHead(500);response.end('Fixture failure');}});
  await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));
  try{
    const owners=nativeAddonFixture(root),plan=prepareGeneral(path.join(root,'profile'),{project,runtimeHome:owners.runtimeHome,mock:'http://127.0.0.1:'+mock.address().port+'/v1',contributions:owners.contributions,plugins:[control]});
    server=await startOwnedServer(officialRuntime(path.join(os.homedir(),'.local/share/opencode-v2-clean')).binary,plan,generalEnvironment);
    await until(async()=>{const value=(await server.request('GET','/api/plugin')).value;return (Array.isArray(value)?value:value.data)?.some(row=>row.id==='opencode-ticketing.metrics');},'Metrics plugin');
    for(const kind of ['SEED','CAPTURE','REPORT','REJECT','DENY']){
      const made=await server.request('POST','/api/session',{agent:kind==='DENY'?'code-inspector':'master-dev',title:kind==='SEED'?'TEST-1 seed':'Synthetic metrics operator',location:{directory:project},model:{providerID:'workshop-mock',id:'mock'},...(kind==='DENY'?{permissions:[{action:'ticket-metrics',resource:'*',effect:'allow'}]}:{})});assert.equal(made.status,200);const id=made.value.data.id;if(kind==='SEED')seedID=id;
      await server.request('POST','/api/session/'+id+'/prompt',{text:'METRIC_CASE_'+kind+' only synthetic fixture, no actual workflow'});
      await until(async()=>{if(error)throw new Error(error);const pending=(await server.request('GET','/api/session/'+id+'/permission')).value.data??[];for(const permission of pending){assert.equal(permission.action,'ticket-metrics');if(!approvals.has(permission.id)){approvals.add(permission.id);const result=await server.request('POST','/api/session/'+id+'/permission/'+permission.id+'/reply',{decision:kind==='REJECT'?'reject':'once',message:'Synthetic metrics permission fixture'});assert(result.status>=200&&result.status<300);}}return finished.has(kind)&&(await server.request('GET','/api/session/'+id+'/context')).value.data.at(-1)?.type==='idle';},kind,30000);
    }
    const directory=path.join(project,'tmp/TEST-1/metrics'),phase=JSON.parse(fs.readFileSync(path.join(directory,'plan.json')));
    assert.equal(phase.session.id,seedID);assert(phase.models['workshop-mock/mock#default']>=1);assert.equal(phase.measurement.backend,'opencode-public-api-2.2.7');
    for(const file of ['plan.json','summary.json','summary.md','history/plan-1.json'])assert(!fs.readFileSync(path.join(directory,file),'utf8').includes('SYNTHETIC_PRIVATE_BODY_NOT_TO_PERSIST'));
    assert(!fs.existsSync(path.join(directory,'rejected.json')));assert(results.get('DENY').includes('native actor contract'));assert(results.get('REPORT').includes('Ticket metrics'));assert(approvals.size>=3);
    const report=spawnSync('bash',[path.join(plan.config,'opencode/scripts/ticket_metrics.sh'),'report','--ticket','TEST-1','--project-root',project],{encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:plan.home},timeout:10000});assert.equal(report.status,0);assert.equal(report.stdout,fs.readFileSync(path.join(directory,'summary.md'),'utf8'));
  }finally{await server?.close();mock.closeAllConnections();await new Promise(resolve=>mock.close(resolve));}
});
