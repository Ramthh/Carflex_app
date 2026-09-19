import test from 'node:test';
import assert from 'node:assert/strict';
import {finderSearchQuery,finderSearchParams,finderSelectionUrl} from '../lib/finder-search.mjs';
import {readFinderFeed,createFinderFeedReader} from '../lib/finder-feed.mjs';
import {proxyFinderStream} from '../lib/finder-stream.mjs';
import {createFinderController} from '../lib/finder-controller.mjs';
import {createFinderLiveState} from '../lib/finder-live.mjs';

const key='cf_finder_'+'a'.repeat(64),revision='b'.repeat(64);
const car=id=>({id,title:id,source:'facebook',postedAt:'2026-09-19T12:00:00.000Z'});
const page=(q,extra={})=>({items:[car(q)],total:1,offset:0,limit:24,nextOffset:null,changeCursor:1,scope:'saved-public-facebook',selectedFilter:{id:'saved',name:'My filter',sort:'posted'},filterRevision:revision,sort:'posted',searchQuery:q,...extra});

test('request search parsing normalizes whitespace and rejects duplicate, oversized or control input',()=>{
 assert.equal(finderSearchQuery('  Honda\t Civic \n Toronto '),'Honda Civic Toronto');assert.equal(finderSearchQuery(null),'');assert.equal(finderSearchQuery('Québec  2020'),'Québec 2020');
 assert.equal(finderSearchParams(new URLSearchParams('q=Honda+Civic')),'Honda Civic');
 for(const params of ['q=Honda&q=Toyota','q='+ 'a'.repeat(201),'q=Honda%00Civic'])assert.throws(()=>finderSearchParams(new URLSearchParams(params)));
 for(const value of [1,{},['Honda']])assert.throws(()=>finderSearchQuery(value));
 assert.equal(finderSearchQuery("Ford % _ ' OR 1=1"),"Ford % _ ' OR 1=1",'punctuation stays literal text');
});

test('saved-filter selection, car search and unrelated URL state survive reload; clear removes only search',()=>{
 const first=finderSelectionUrl('https://app.test/listings/finder?finderFilter=old&view=list#cars',{filterId:'saved',q:' Honda  Civic '});
 assert.equal(first.searchParams.get('finderFilter'),'saved');assert.equal(finderSearchParams(first.searchParams,'finderSearch'),'Honda Civic');assert.equal(first.searchParams.get('view'),'list');assert.equal(first.hash,'#cars');
 const other=finderSelectionUrl(first,{filterId:'another',q:'Honda Civic'});assert.equal(other.searchParams.get('finderSearch'),'Honda Civic');
 const cleared=finderSelectionUrl(other,{filterId:'another',q:''});assert.equal(cleared.searchParams.has('finderSearch'),false);assert.equal(cleared.searchParams.get('finderFilter'),'another');
});

test('shared page requests remain isolated by normalized search, selected filter and page',async()=>{
 const calls=[],reader=createFinderFeedReader({read:async options=>{calls.push(options);return {status:200,body:{q:options.q}};}});
 await reader({key,filterId:'saved',q:' Honda  Civic '});await reader({key,filterId:'saved',q:'Honda Civic'});assert.equal(calls.length,1);
 await reader({key,filterId:'saved',q:'Toyota'});await reader({key,filterId:'saved',q:'Honda Civic',offset:24});await reader({key,filterId:'another',q:'Honda Civic'});await reader({key,filterId:'saved'});assert.equal(calls.length,5);
 assert.equal((await reader({key,q:'a'.repeat(201)})).status,400);assert.equal(calls.length,5);
});

test('snapshot search and pagination reach the provider together and broad or wrong-query replies fail closed',async()=>{
 let captured;const q='Honda Civic',items=Array.from({length:24},(_,i)=>car(String(i))),wanted=page(q,{items,total:60,offset:24,nextOffset:48});
 const result=await readFinderFeed({key,filterId:'saved',offset:24,q:' Honda  Civic ',fetcher:async(url,options)=>{captured={url:new URL(url),options};return Response.json(wanted);}});
 assert.equal(result.status,200);assert.equal(captured.url.searchParams.get('q'),q);assert.equal(captured.url.searchParams.get('filterId'),'saved');assert.equal(captured.url.searchParams.get('offset'),'24');assert.equal(result.body.nextOffset,48);assert.equal(captured.options.headers['X-API-Key'],key);assert.ok(!captured.url.href.includes(key));
 for(const wrong of [page('Toyota'),page(''),{...page(q),searchQuery:undefined}])assert.equal((await readFinderFeed({key,filterId:'saved',q,fetcher:async()=>Response.json(wrong)})).status,503);
});

test('live upstream uses the same normalized search without changing the saved-filter revision',async()=>{
 let captured;const response=await proxyFinderStream({request:new Request('https://app.test'),key,cursor:9,filterId:'saved',filterRevision:revision,q:' Honda  Civic ',authorize:async()=>true,fetcher:async url=>{captured=new URL(url);return new Response('retry: 500\n\n',{headers:{'Content-Type':'text/event-stream'}});}});
 assert.equal(captured.searchParams.get('q'),'Honda Civic');assert.equal(captured.searchParams.get('filterRevision'),revision);assert.equal(captured.searchParams.get('cursor'),'9');await response.body.cancel();
 assert.equal((await proxyFinderStream({request:new Request('https://app.test'),key,cursor:0,q:'a'.repeat(201),authorize:async()=>true,fetcher:async()=>assert.fail('invalid search must not reach upstream')})).status,400);
});

test('switching search closes the old stream, aborts its page request and starts page one in the same saved filter',async t=>{
 const sources=[],pages=[],requests=[];let resolveOld,oldSignal,oldCalls=0;
 class Source{events=new Map();closed=false;constructor(url){this.url=url;sources.push(this);}addEventListener(type,fn){this.events.set(type,fn);}close(){this.closed=true;}emit(type,event){this.events.get(type)?.(event);}}
 const options={filterId:'saved',onPage:value=>pages.push(value),onError:()=>{},onLoading:()=>{},onReset:()=>{},EventSourceClass:Source,setTimer:()=>1,clearTimer:()=>{}};
 const old=createFinderController({...options,q:'Honda',offset:48,fetcher:async(url,{signal})=>{requests.push(new URL(url,'https://app.test'));if(++oldCalls===1)return Response.json(page('Honda',{offset:48,total:100,nextOffset:72}));oldSignal=signal;return new Promise(resolve=>resolveOld=resolve);}});t.after(()=>old.dispose());
 await old.refresh();const pending=old.refresh(),oldSource=sources[0];old.dispose();assert.equal(oldSignal.aborted,true);assert.equal(oldSource.closed,true);
 const next=createFinderController({...options,q:'Toyota',offset:0,fetcher:async url=>{requests.push(new URL(url,'https://app.test'));return Response.json(page('Toyota'));}});t.after(()=>next.dispose());await next.refresh();
 assert.equal(requests.at(-1).searchParams.get('offset'),'0');assert.equal(requests.at(-1).searchParams.get('filterId'),'saved');assert.equal(requests.at(-1).searchParams.get('q'),'Toyota');assert.equal(new URL(sources.at(-1).url,'https://app.test').searchParams.get('q'),'Toyota');
 oldSource.emit('change',{lastEventId:'2',data:JSON.stringify({listingId:'old-live',kind:'discovery',item:car('old-live')})});resolveOld(Response.json(page('Honda',{items:[car('old-response')]})));await pending;
 assert.deepEqual(pages.at(-1).items.map(item=>item.id),['Toyota']);assert.ok(!pages.some(value=>value?.items.some(item=>item.id.startsWith('old-'))));
});

test('a search without a saved filter still protects membership counts and rejects another query snapshot',()=>{
 let value,reconciles=0;const state=createFinderLiveState({q:'Honda',onChange:next=>value=next,onReconcile:()=>reconciles++});
 state.snapshot(page('Honda',{selectedFilter:null,filterRevision:null,total:10}));
 state.change(2,{listingId:'other-make',kind:'remove',item:null});assert.equal(value.total,10);assert.equal(value.countPending,true);assert.equal(reconciles,0);
 state.snapshot(page('Toyota',{selectedFilter:null,filterRevision:null,changeCursor:3}));assert.equal(value.items[0].id,'Honda');
 state.change(3,{listingId:'Honda new',kind:'update',item:car('Honda new')});assert.ok(value.items.some(item=>item.id==='Honda new'));assert.equal(value.total,10);assert.equal(reconciles,1);state.close();
});
