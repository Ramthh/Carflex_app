import test from 'node:test';
import assert from 'node:assert/strict';
import {readFinderFeed} from '../lib/finder-feed.mjs';
const key='cf_finder_'+'b'.repeat(64);
const page={items:[{id:'1',source:'facebook',reviewCategory:'unknown'}],total:1,offset:0,limit:24,nextOffset:null,scope:'unknown-without-other-sellers'};
test('credentials stay in server headers, endpoint and filters cannot be overridden',async()=>{
 let request;const result=await readFinderFeed({key,fetcher:async(url,options)=>{request={url,options};return Response.json(page);}});
 assert.equal(result.status,200);assert.equal(request.options.headers['X-API-Key'],key);assert.equal(request.options.cache,'no-store');assert.equal(request.options.redirect,'error');assert.ok(!request.url.includes(key));assert.equal(new URL(request.url).hostname,'finder.carflexplus.ca');
 assert.equal((await readFinderFeed({key,offset:-1})).status,400);
});
test('missing keys, HTML responses, rate limiting and broadened seller data never render cars',async()=>{
 assert.equal((await readFinderFeed({key:''})).status,503);
 for(const category of ['dealer','safe','avoid']){const result=await readFinderFeed({key,fetcher:async()=>Response.json({...page,items:[{source:'facebook',reviewCategory:category}]})});assert.equal(result.status,503);assert.equal(result.body.items,undefined);}
 for(const flag of ['otherSellers','otherSellersManual','otherSellersAutomatic'])assert.equal((await readFinderFeed({key,fetcher:async()=>Response.json({...page,items:[{...page.items[0],[flag]:true}]})})).status,503);
 assert.equal((await readFinderFeed({key,fetcher:async()=>new Response('<html>Unavailable</html>')})).status,503);
 assert.equal((await readFinderFeed({key,fetcher:async()=>new Response('',{status:429})})).status,429);
});
