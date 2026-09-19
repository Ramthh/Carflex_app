import test from 'node:test';
import assert from 'node:assert/strict';
import {finderFilterId,finderFilterRevision,finderSelection,readFinderFilters} from '../lib/finder-filters.mjs';
import {readFinderFeed,createFinderFeedReader} from '../lib/finder-feed.mjs';
import {proxyFinderStream} from '../lib/finder-stream.mjs';
const key='cf_finder_'+'a'.repeat(64),revision='b'.repeat(64),filter={id:'saved-1',name:'No Dealer, No Safe, No AR',sort:'posted',available:true};
const catalog={items:[filter],defaultId:filter.id};
test('provider filters and default are projected; key stays in server headers',async()=>{
 let captured;const result=await readFinderFilters({key,fetcher:async(url,options)=>{captured={url,options};return Response.json({...catalog,privateOwner:'hidden',items:[{...filter,filters:{seller:'private'}}]});}});
 assert.deepEqual(result,{status:200,body:catalog});assert.equal(captured.options.headers['X-API-Key'],key);assert.equal(new URL(captured.url).pathname,'/api/integrations/railway/listings/filters');assert.ok(!captured.url.includes(key));assert.equal(captured.options.redirect,'error');
 for(const bad of [{items:[filter,filter],defaultId:null},{...catalog,defaultId:'missing'},{items:[{...filter,sort:'private'}],defaultId:null}])assert.equal((await readFinderFilters({key,fetcher:async()=>Response.json(bad)})).status,503);
});
test('default is used only without explicit choice; deleted/unavailable selection cannot become All',()=>{
 assert.equal(finderSelection(catalog,undefined).id,filter.id);assert.equal(finderSelection(catalog,'').id,'');assert.match(finderSelection(catalog,'deleted').error,/deleted/);
 assert.match(finderSelection({items:[{...filter,available:false,unavailableReason:'Private seller search cannot be shared.'}],defaultId:filter.id},undefined).error,/Private seller/);
 for(const value of ['','../owner','one&scope=all','a'.repeat(201)])assert.throws(()=>finderFilterId(value));assert.equal(finderFilterId(null),null);
 assert.equal(finderFilterRevision(revision,filter.id),revision);assert.throws(()=>finderFilterRevision(null,filter.id));assert.throws(()=>finderFilterRevision(revision,null));
});
test('page cache and upstream query are isolated by saved filter, with matching scope/revision validation',async()=>{
 let calls=0;const reader=createFinderFeedReader({read:async options=>{calls++;return {status:200,body:options.filterId};}});
 await reader({key,filterId:'one'});await reader({key,filterId:'two'});await reader({key});await reader({key,filterId:'one'});assert.equal(calls,3);
 const page={items:[{id:'1',source:'facebook'}],total:1,offset:0,limit:24,nextOffset:null,selectedFilter:{id:filter.id,name:filter.name,sort:'posted'},filterRevision:revision,sort:'posted',scope:'saved-public-facebook'};
 let request;const result=await readFinderFeed({key,filterId:filter.id,fetcher:async url=>{request=url;return Response.json(page);}});assert.equal(result.status,200);assert.equal(new URL(request).searchParams.get('filterId'),filter.id);
 for(const bad of [{...page,scope:'all-public-facebook'},{...page,selectedFilter:{...page.selectedFilter,id:'another'}},{...page,filterRevision:null}])assert.equal((await readFinderFeed({key,filterId:filter.id,fetcher:async()=>Response.json(bad)})).status,503);
 for(const status of [404,409]){const failed=await readFinderFeed({key,filterId:filter.id,fetcher:async()=>Response.json({error:'Choose another saved filter.'},{status})});assert.equal(failed.status,status);assert.match(failed.body.error,/another saved filter/);}
});
test('selected streams pass the exact snapshot revision and preserve actionable filter errors',async()=>{
 let captured;const response=await proxyFinderStream({request:new Request('https://app.test'),key,cursor:4,filterId:filter.id,filterRevision:revision,authorize:async()=>true,fetcher:async(url)=>{captured=url;return new Response('retry: 500\n\n',{headers:{'Content-Type':'text/event-stream'}});}});
 assert.equal(new URL(captured).searchParams.get('filterId'),filter.id);assert.equal(new URL(captured).searchParams.get('filterRevision'),revision);await response.body.cancel();
 for(const status of [404,409]){const result=await proxyFinderStream({request:new Request('https://app.test'),key,cursor:4,filterId:filter.id,filterRevision:revision,authorize:async()=>true,fetcher:async()=>Response.json({error:'Saved filter unavailable.'},{status})});assert.equal(result.status,status);}
});
