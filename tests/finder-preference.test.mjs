import test from 'node:test';
import assert from 'node:assert/strict';
import {finderPreferenceKey,readFinderPreference,writeFinderPreference,decodeFinderPreference,initialFinderSelection} from '../lib/finder-preference.mjs';
const catalog={defaultId:'default',items:[{id:'default',available:true,sort:'posted'},{id:'chosen',available:true,sort:'price'},{id:'disabled',available:false,sort:'posted'}]};
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('selected filter transfers between views for the same user, without leaking between users',()=>{
 const store=storage(),one=finderPreferenceKey(1),two=finderPreferenceKey(2);
 assert.equal(writeFinderPreference(store,one,'chosen'),true);
 assert.equal(readFinderPreference(store,one),'chosen');assert.equal(readFinderPreference(store,two),undefined);
 assert.equal(initialFinderSelection(catalog,new URLSearchParams(),readFinderPreference(store,one)).id,'chosen');
 assert.equal(writeFinderPreference(store,one,'chosen'),false);
 assert.equal(finderPreferenceKey(undefined),null);assert.equal(writeFinderPreference(store,null,'chosen'),false);
});
test('explicit URL wins over remembered selection; remembered selection wins over provider default',()=>{
 assert.equal(initialFinderSelection(catalog,new URLSearchParams('finderFilter=default'),'chosen').id,'default');
 assert.equal(initialFinderSelection(catalog,new URLSearchParams(),'chosen').id,'chosen');
 assert.equal(initialFinderSelection(catalog,new URLSearchParams(),undefined).id,'default');
 assert.equal(initialFinderSelection(catalog,new URLSearchParams('finderFilter=all'),'chosen').id,'');
 const store=storage();writeFinderPreference(store,'key','');assert.equal(readFinderPreference(store,'key'),'');
 assert.equal(initialFinderSelection(catalog,new URLSearchParams(),'').id,'');
});
test('deleted and unavailable saved filters fail closed; corrupt preferences are ignored',()=>{
 assert.match(initialFinderSelection(catalog,new URLSearchParams(),'deleted').error,/deleted/);
 assert.match(initialFinderSelection(catalog,new URLSearchParams(),'disabled').error,/unavailable/);
 for(const raw of [null,'broken','{}','{"version":2,"filterId":"chosen"}','{"version":1,"filterId":"bad/id"}'])assert.equal(decodeFinderPreference(raw),undefined);
 for(const query of ['finderFilter=chosen&finderFilter=default','finderFilter=bad%2Fid'])assert.throws(()=>initialFinderSelection(catalog,new URLSearchParams(query),'chosen'));
});
test('storage restrictions do not prevent Finder from using its provider default',()=>{
 const blocked={getItem(){throw Error('Denied');},setItem(){throw Error('Denied');}};
 assert.equal(readFinderPreference(blocked,'key'),undefined);assert.equal(writeFinderPreference(blocked,'key','chosen'),false);
 assert.equal(initialFinderSelection(catalog,new URLSearchParams(),readFinderPreference(blocked,'key')).id,'default');
});
