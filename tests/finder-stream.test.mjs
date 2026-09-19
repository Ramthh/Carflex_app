import test from 'node:test';
import assert from 'node:assert/strict';
import {finderCursor,proxyFinderStream} from '../lib/finder-stream.mjs';
const key='cf_finder_'+'a'.repeat(64),request=()=>new Request('https://app.test/api/finder/stream?cursor=0');
test('stream credentials stay in upstream headers; chunks forward without waiting for the whole response',async()=>{
 let upstream,captured;const response=await proxyFinderStream({request:request(),key,cursor:3,authorize:async()=>true,fetcher:async(url,options)=>{captured={url,options};return new Response(new ReadableStream({start(c){upstream=c;}}),{headers:{'Content-Type':'text/event-stream'}});}});
 assert.equal(captured.options.headers['X-API-Key'],key);assert.ok(!captured.url.includes(key));assert.ok(captured.url.endsWith('cursor=3'));assert.equal(captured.options.redirect,'error');
 const reader=response.body.getReader();upstream.enqueue(new TextEncoder().encode('id: 4\nevent: change\ndata: {}\n\n'));const part=await reader.read();assert.match(new TextDecoder().decode(part.value),/id: 4/);await reader.cancel();assert.equal(captured.options.signal.aborted,true);
});
test('revoked access closes a quiet live connection without requiring another upstream message',{timeout:1000},async()=>{
 let allowed=true;const response=await proxyFinderStream({request:request(),key,cursor:0,authorize:async()=>allowed,authorizeMs:10,fetcher:async()=>new Response(new ReadableStream({}),{headers:{'Content-Type':'text/event-stream'}})});
 const reader=response.body.getReader();allowed=false;const result=await reader.read();assert.match(new TextDecoder().decode(result.value),/access-revoked/);assert.equal((await reader.read()).done,true);
});
test('unauthenticated access, redirects/non-stream replies and malformed cursors fail closed',async()=>{
 assert.equal((await proxyFinderStream({request:request(),key,cursor:0,authorize:async()=>false,fetcher:()=>{throw Error('Must not fetch');}})).status,401);
 assert.equal((await proxyFinderStream({request:request(),key,cursor:0,authorize:async()=>true,fetcher:async()=>Response.json({})})).status,503);
 for(const value of ['','-1','1.5','9007199254740992','1\n'])assert.throws(()=>finderCursor(value));assert.equal(finderCursor('42'),42);
});
