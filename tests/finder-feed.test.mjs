import test from 'node:test';
import assert from 'node:assert/strict';
import {readFinderFeed} from '../lib/finder-feed.mjs';
const key='cf_finder_'+'b'.repeat(64);
const page={items:[{id:'1',source:'facebook',reviewCategory:'unknown'}],total:1,offset:0,limit:24,nextOffset:null,scope:'all-public-facebook'};
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
