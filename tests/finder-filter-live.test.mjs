import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinderLiveState,finderOrder} from '../lib/finder-live.mjs';
const car=(id,extra={})=>({id,source:'facebook',price:1000,mileage:10000,postedAt:'2026-09-20T12:00:00Z',discoveredAt:'2026-09-20T12:01:00Z',...extra});
const page=(items,extra={})=>({items,total:100,changeCursor:1,selectedFilter:{id:'filter',sort:'price'},sort:'price',...extra});
test('every saved sort matches SQLite NULL order and binary ID ties',()=>{
 const rows=[car('a',{price:2,mileage:30,postedAt:null}),car('Z',{price:null,mileage:20}),car('b',{price:1,mileage:null}),car('A',{price:2,mileage:10,discoveredAt:null})];
 assert.deepEqual([...rows].sort(finderOrder('price')).map(x=>x.id),['Z','b','a','A']);assert.deepEqual([...rows].sort(finderOrder('price-high')).map(x=>x.id),['a','A','b','Z']);assert.deepEqual([...rows].sort(finderOrder('mileage')).map(x=>x.id),['b','A','Z','a']);assert.deepEqual([...rows].sort(finderOrder('newest')).map(x=>x.id),['b','a','Z','A']);assert.deepEqual([...rows].sort(finderOrder('posted')).map(x=>x.id),['b','Z','A','a']);
});
test('a newly matching update enters first page immediately without inventing a count increment',()=>{
 let value,reconcile=0;const state=createFinderLiveState({filterId:'filter',limit:2,onChange:next=>value=next,onReconcile:()=>reconcile++});state.snapshot(page([car('a',{price:100}),car('b',{price:200})]));
 state.change(2,{listingId:'c',kind:'update',item:car('c',{price:50})});assert.deepEqual(value.items.map(x=>x.id),['c','a']);assert.equal(value.total,100);assert.equal(value.countPending,true);assert.equal(reconcile,1);
 state.change(2,{listingId:'c',kind:'update',item:car('c',{price:50})});assert.equal(reconcile,1);
 state.snapshot(page([car('c',{price:50}),car('a',{price:100})],{changeCursor:2,total:101}));assert.equal(value.total,101);assert.equal(value.countPending,false);
});
test('unmatched deletes and thousands of off-page updates cannot corrupt counts or force heavy snapshot reads',()=>{
 let value,reconcile=0,renders=0;const state=createFinderLiveState({filterId:'filter',limit:2,onChange:next=>{value=next;renders++;},onReconcile:()=>reconcile++});state.snapshot(page([car('a',{price:100}),car('b',{price:200})]));
 for(let id=2;id<500;id++)state.change(id,{listingId:'outside-'+id,kind:id%2?'remove':'update',item:null});
 assert.equal(value.total,100);assert.equal(reconcile,0);assert.equal(renders,2);assert.equal(value.countPending,true);
 state.change(500,{listingId:'far',kind:'update',item:car('far',{price:999999})});assert.equal(reconcile,0);assert.deepEqual(value.items.map(x=>x.id),['a','b']);
 state.change(501,{listingId:'a',kind:'update',item:null});assert.equal(value.total,99);assert.deepEqual(value.items.map(x=>x.id),['b']);assert.equal(reconcile,1,'visible hole requests a bounded refill');
});
test('selection scope, closed state, later-page membership and stale snapshots remain isolated',()=>{
 let value;const state=createFinderLiveState({filterId:'filter',offset:24,onChange:next=>value=next});state.snapshot(page([car('a')]));state.snapshot(page([car('wrong')],{selectedFilter:{id:'other',sort:'price'}}));assert.equal(value.items[0].id,'a');
 state.change(2,{listingId:'new',kind:'update',item:car('new',{price:1})});assert.equal(value.items[0].id,'a');assert.equal(value.total,100);state.close();assert.equal(state.change(3,{listingId:'new',kind:'discovery',item:car('new')}),false);
});
