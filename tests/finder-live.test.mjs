import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinderLiveState} from '../lib/finder-live.mjs';
const car=(id,extra={})=>({id,source:'facebook',postedAt:`2026-09-19T10:00:${String(id).padStart(2,'0')}Z`,price:12000,...extra});
const page=(items,cursor=0,extra={})=>({items,total:items.length,nextOffset:null,changeCursor:cursor,...extra});
const change=(item,kind='update')=>({listingId:item.id,kind,item});
test('each car and its later estimate appear independently; reconnect replay is deduplicated',()=>{
 const frames=[];const state=createFinderLiveState({onChange:value=>frames.push(value)});state.snapshot(page([]));
 state.change(1,change(car('01'),'discovery'));assert.equal(frames.at(-1).items.length,1);
 state.change(2,change(car('02'),'discovery'));assert.equal(frames.at(-1).items.length,2);
 state.change(3,change(car('01',{priceEstimate:{amount:14000}})));assert.equal(frames.at(-1).items.find(x=>x.id==='01').priceEstimate.amount,14000);
 assert.equal(state.change(3,change(car('01'))),false);assert.equal(frames.at(-1).total,2);
});
test('a stale snapshot cannot erase a newer car, mileage or estimate',()=>{
 let value;const state=createFinderLiveState({onChange:next=>value=next});state.snapshot(page([car('01')],1));
 state.change(2,change(car('02'),'discovery'));state.change(3,change(car('01',{mileage:80000,priceEstimate:{amount:13000}})));
 state.snapshot(page([car('01')],1));assert.equal(value.total,2);assert.equal(value.items.find(x=>x.id==='01').mileage,80000);assert.equal(value.items.find(x=>x.id==='01').priceEstimate.amount,13000);
 state.snapshot(page([car('01',{mileage:80000}),car('02')],3));assert.equal(value.total,2);
});
test('updates do not inject off-page cars or reset pagination; deletion removes a visible card',()=>{
 let value;const state=createFinderLiveState({offset:24,onChange:next=>value=next});state.snapshot(page([car('01')],1,{total:50}));
 state.change(2,change(car('02')));assert.deepEqual(value.items.map(x=>x.id),['01']);
 state.change(3,change(car('03'),'discovery'));assert.equal(value.total,51);assert.deepEqual(value.items.map(x=>x.id),['01']);
 state.change(4,{listingId:'01',kind:'remove',item:null});assert.equal(value.items.length,0);assert.equal(value.total,50);
});
test('a car that no longer matches disappears; private payloads and replay gaps fail safely',()=>{
 let value,reconciles=0;const state=createFinderLiveState({maxEvents:1,onChange:next=>value=next,onReconcile:()=>reconciles++});state.snapshot(page([car('01')],1));
 assert.equal(state.change(2,change(car('02',{privateImport:true}),'discovery')),false);
 state.change(2,{listingId:'01',kind:'update',item:null});assert.equal(value.items.length,0);
 state.change(3,change(car('03'),'discovery'));state.snapshot(page([car('01')],1));assert.equal(reconciles,1);assert.equal(value.items[0].id,'03');
 state.close();assert.equal(state.change(4,change(car('04'),'discovery')),false);
});
