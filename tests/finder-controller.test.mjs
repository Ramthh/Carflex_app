import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinderController} from '../lib/finder-controller.mjs';
const revision='a'.repeat(64),car=(id,extra={})=>({id,source:'facebook',price:1000,postedAt:'2026-09-20T12:00:00Z',...extra});
const page=(filterId='one',extra={})=>({items:[car('original')],total:1,offset:0,changeCursor:1,filterRevision:revision,selectedFilter:{id:filterId,sort:'posted'},sort:'posted',...extra});
function harness(extra={}){
 let time=0,sequence=0;const timers=new Map(),sources=[],pages=[],errors=[],requests=[];let resets=0;
 class Source{
  readyState=0;events=new Map();closed=false;
  constructor(url){this.url=url;sources.push(this);}
  addEventListener(type,callback){this.events.set(type,callback);}
  close(){this.closed=true;this.readyState=2;}
  emit(type,value={}){if(type==='open')this.readyState=1;this.events.get(type)?.(value);}
 }
 const options={filterId:'one',onPage:value=>pages.push(value),onError:value=>errors.push(value),onLoading:()=>{},onReset:()=>resets++,EventSourceClass:Source,now:()=>time,setTimer:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:time+ms});return id;},clearTimer:id=>timers.delete(id),fetcher:async(url,opts)=>{requests.push({url,opts});return Response.json(page());},...extra};
 return {options,sources,pages,errors,requests,get resets(){return resets;},async advance(ms){time+=ms;for(let count=0;count<10;count++){const due=[...timers].filter(([,value])=>value.at<=time);if(!due.length)break;for(const[id,value]of due){timers.delete(id);value.fn();}await new Promise(setImmediate);}}};
}
test('switching filters aborts the old request, closes its stream, and discards late callbacks',async()=>{
 let resolveOld,oldSignal,calls=0;const h=harness({fetcher:async(url,opts)=>{calls++;if(calls===1)return Response.json(page());oldSignal=opts.signal;return new Promise(resolve=>resolveOld=resolve);}});
 const old=createFinderController(h.options);await old.refresh();const source=h.sources[0],pending=old.refresh();old.dispose();assert.equal(oldSignal.aborted,true);assert.equal(source.closed,true);
 const next=createFinderController({...h.options,filterId:'two',fetcher:async()=>Response.json(page('two',{items:[car('new-filter')]}))});await next.refresh();
 source.emit('change',{lastEventId:'2',data:JSON.stringify({listingId:'wrong',kind:'discovery',item:car('wrong')})});resolveOld(Response.json(page('one',{items:[car('late-response')]})));await pending;
 assert.equal(h.pages.at(-1).items[0].id,'new-filter');assert.ok(!h.pages.some(value=>value?.items.some(item=>['wrong','late-response'].includes(item.id))));next.dispose();
});
test('same-ID filter revision changes discard the old journal and reconnect with the new revision',async()=>{
 let response=page();const h=harness({fetcher:async()=>Response.json(response)}),controller=createFinderController(h.options);await controller.refresh();const old=h.sources[0];
 old.emit('change',{lastEventId:'2',data:JSON.stringify({listingId:'old-match',kind:'discovery',item:car('old-match')})});
 response=page('one',{filterRevision:'b'.repeat(64),items:[car('new-match')]});await controller.refresh();assert.equal(old.closed,true);assert.deepEqual(h.pages.at(-1).items.map(item=>item.id),['new-match']);assert.equal(new URL(h.sources[1].url,'https://app.test').searchParams.get('filterRevision'),'b'.repeat(64));controller.dispose();
});
test('closed EventSource recovers after snapshot and reset waits beyond the shared cache window',async()=>{
 const h=harness(),controller=createFinderController(h.options);await controller.refresh();const first=h.sources[0];first.readyState=2;first.emit('error');await h.advance(3000);assert.equal(h.sources.length,2);assert.equal(first.closed,true);
 h.sources[1].emit('reset');assert.equal(h.pages.at(-1),null);assert.equal(h.resets,0);await h.advance(999);assert.equal(h.resets,0);await h.advance(1);assert.equal(h.resets,1);controller.dispose();
 const other=harness(),cancelled=createFinderController(other.options);await cancelled.refresh();other.sources[0].emit('reset');cancelled.dispose();await other.advance(1000);assert.equal(other.resets,0,'a newer selection cancels the pending old reset');
});
test('unrelated filtered events do not cause full reads; visible refills coalesce at three seconds',async()=>{
 const items=Array.from({length:24},(_,i)=>car(String(i))),h=harness({fetcher:async(url,opts)=>{h.requests.push({url,opts});return Response.json(page('one',{items,total:100}));}}),controller=createFinderController(h.options);await controller.refresh();const stream=h.sources[0];stream.emit('open');
 for(let id=2;id<200;id++)stream.emit('change',{lastEventId:String(id),data:JSON.stringify({listingId:'outside-'+id,kind:'update',item:null})});await h.advance(3000);assert.equal(h.requests.length,1);
 for(let id=200;id<250;id++)stream.emit('change',{lastEventId:String(id),data:JSON.stringify({listingId:'new-'+id,kind:'update',item:car('new-'+id,{postedAt:'2026-09-21T12:00:00Z'})})});await h.advance(1);assert.equal(h.requests.length,2);
 for(let id=250;id<300;id++)stream.emit('change',{lastEventId:String(id),data:JSON.stringify({listingId:'new-'+id,kind:'update',item:car('new-'+id,{postedAt:'2026-09-22T12:00:00Z'})})});await h.advance(2998);assert.equal(h.requests.length,2);await h.advance(2);assert.equal(h.requests.length,3);controller.dispose();
});
test('deleted selection remains an explicit error and never requests all inventory',async()=>{
 const h=harness({fetcher:async(url)=>{h.requests.push(url);return Response.json({error:'Saved filter was deleted. Choose another filter.'},{status:404});}}),controller=createFinderController(h.options);await controller.refresh();assert.equal(controller.isHalted(),true);assert.match(h.errors.at(-1),/deleted/);assert.equal(h.pages.at(-1),null);assert.ok(h.requests.every(url=>new URL(url,'https://app.test').searchParams.get('filterId')==='one'));await h.advance(60000);assert.equal(h.requests.length,1);controller.dispose();
});
test('hidden tabs pause automatic full-page reads and reconcile promptly on return',async()=>{
 let visible=true;const h=harness({isVisible:()=>visible}),controller=createFinderController(h.options);await controller.refresh();h.sources[0].emit('open');visible=false;
 await h.advance(30000);await h.advance(30000);assert.equal(h.requests.length,1);
 h.sources[0].emit('change',{lastEventId:'2',data:JSON.stringify({listingId:'original',kind:'remove',item:null})});await h.advance(3000);assert.equal(h.requests.length,1);
 visible=true;await controller.refresh();assert.equal(h.requests.length,2);controller.dispose();
});
