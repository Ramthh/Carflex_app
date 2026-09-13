import test from 'node:test';
import assert from 'node:assert/strict';
import {readFinderFeed,createFinderFeedReader} from '../lib/finder-feed.mjs';
const key='cf_finder_'+'b'.repeat(64);
const page={items:[{id:'1',source:'facebook',reviewCategory:'unknown'}],total:1,offset:0,limit:24,nextOffset:null,scope:'all-public-facebook'};

test('live viewers share an in-flight page and short cache; different keys/pages stay isolated',async()=>{
 let calls=0,time=0,resolve;
 const reader=createFinderFeedReader({now:()=>time,read:async()=>{calls++;return new Promise(done=>{resolve=done;});}});
 const first=reader({key}),second=reader({key});await Promise.resolve();assert.equal(calls,1);
 resolve({status:200,body:page});assert.deepEqual(await first,await second);
 time=749;await reader({key});assert.equal(calls,1);
 time=750;const fresh=reader({key});await Promise.resolve();assert.equal(calls,2);resolve({status:200,body:page});await fresh;
 for(const options of [{key,offset:24},{key:'cf_finder_'+'c'.repeat(64)}]){const result=reader(options);await Promise.resolve();resolve({status:200,body:page});await result;}
 assert.equal(calls,4);
});
test('failed upstream responses are not cached and page cache growth is bounded',async()=>{
 let calls=0;
 const failed=createFinderFeedReader({read:async()=>{calls++;return {status:503};}});
 await failed({key});await failed({key});assert.equal(calls,2);
 calls=0;const reader=createFinderFeedReader({maxEntries:2,now:()=>0,read:async()=>{calls++;return {status:200};}});
 for(const offset of [0,24,48,0])await reader({key,offset});assert.equal(calls,4);
});
test('credentials stay in server headers, endpoint and filters cannot be overridden',async()=>{
 let request;const result=await readFinderFeed({key,fetcher:async(url,options)=>{request={url,options};return Response.json(page);}});
 assert.equal(result.status,200);assert.equal(request.options.headers['X-API-Key'],key);assert.equal(request.options.cache,'no-store');assert.equal(request.options.redirect,'error');assert.ok(!request.url.includes(key));assert.equal(new URL(request.url).hostname,'finder.carflexplus.ca');
 assert.equal(new URL(request.url).searchParams.get('inventory'),'all');
 assert.equal((await readFinderFeed({key,offset:-1})).status,400);
});
test('all seller categories and Other sellers are included in the public inventory',async()=>{
 for(const category of ['unknown','dealer','safe','avoid']){const result=await readFinderFeed({key,fetcher:async()=>Response.json({...page,items:[{source:'facebook',reviewCategory:category}]})});assert.equal(result.status,200);}
 for(const flag of ['otherSellers','otherSellersManual','otherSellersAutomatic'])assert.equal((await readFinderFeed({key,fetcher:async()=>Response.json({...page,items:[{...page.items[0],[flag]:true}]})})).status,200);
});
test('missing keys, wrong scope, private or non-Facebook data, HTML and rate limiting fail closed',async()=>{
 assert.equal((await readFinderFeed({key:''})).status,503);
 for(const item of [{source:'manual'},{source:'facebook',privateImport:true}])assert.equal((await readFinderFeed({key,fetcher:async()=>Response.json({...page,items:[item]})})).status,503);
 assert.equal((await readFinderFeed({key,fetcher:async()=>Response.json({...page,scope:'unknown-without-other-sellers'})})).status,503);
 assert.equal((await readFinderFeed({key,fetcher:async()=>new Response('<html>Unavailable</html>')})).status,503);
 assert.equal((await readFinderFeed({key,fetcher:async()=>new Response('',{status:429})})).status,429);
});
