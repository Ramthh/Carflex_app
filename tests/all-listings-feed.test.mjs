import test from 'node:test';
import assert from 'node:assert/strict';
import {allListingsFeed,facebookItemIdentity} from '../lib/all-listings-feed.mjs';

const legacy=(id,extra={})=>({id,source:'facebook',ad_link:`https://www.facebook.com/marketplace/item/${id}/`,created_at:'2026-09-19T10:00:00Z',...extra});
const finder=(id,extra={})=>({id:String(id),source:'facebook',url:`https://www.facebook.com/marketplace/item/${id}/`,discoveredAt:'2026-09-19T11:00:00Z',...extra});

test('Facebook item variants deduplicate to the Finder card when both origins are selected',()=>{
 const old=legacy(1,{ad_link:'https://m.facebook.com/marketplace/item/1849531029515659?ref=browse_tab'});
 const live=finder('fb:one',{url:'https://www.facebook.com/marketplace/item/1849531029515659/?mibextid=wwXIfr#share'});
 const rows=allListingsFeed({legacy:[old],finder:[live]});
 assert.equal(rows.length,1);assert.equal(rows[0].origin,'finder');assert.equal(rows[0].item,live);
 assert.equal(facebookItemIdentity(old.ad_link),facebookItemIdentity(live.url));
});

test('source selection happens before dedupe and Finder remains separate from Facebook',()=>{
 const old=legacy(42),live=finder(42),kijiji=legacy(9,{source:'kijiji',ad_link:'https://www.kijiji.ca/v-cars-trucks/9'});
 const input={legacy:[old,kijiji],finder:[live]};
 assert.deepEqual(allListingsFeed({...input,selectedSources:['facebook']}).map(row=>row.item),[old]);
 assert.deepEqual(allListingsFeed({...input,selectedSources:['finder']}).map(row=>row.item),[live]);
 assert.deepEqual(allListingsFeed({...input,selectedSources:['kijiji']}).map(row=>row.item),[kijiji]);
 assert.deepEqual(allListingsFeed({...input,selectedSources:['facebook','finder']}).map(row=>row.item),[live]);
 assert.equal(allListingsFeed({...input,selectedSources:[]}).length,2);
});

test('missing URLs preserve unrelated cars and IDs are scoped to source and origin',()=>{
 const rows=allListingsFeed({legacy:[legacy(1,{ad_link:undefined}),legacy(2,{ad_link:''}),legacy(1,{source:'kijiji',ad_link:null})],finder:[finder(1,{url:undefined}),finder(2,{url:''})]});
 assert.equal(rows.length,5);assert.equal(new Set(rows.map(row=>row.key)).size,5);
 const anonymous=allListingsFeed({legacy:[{source:'facebook'},{source:'facebook'}],finder:[{},{}]});
 assert.equal(anonymous.length,4);assert.equal(new Set(anonymous.map(row=>row.key)).size,4);
});

test('same raw IDs with different listing links still receive distinct React keys',()=>{
 const rows=allListingsFeed({legacy:[legacy(1),legacy(1,{ad_link:'https://www.facebook.com/marketplace/item/2/'}),legacy(1,{source:'kijiji',ad_link:'https://www.kijiji.ca/v/1'})],finder:[finder(1,{url:'https://www.facebook.com/marketplace/item/3/'})]});
 assert.equal(rows.length,4);assert.equal(new Set(rows.map(row=>row.key)).size,4);
});

test('mixed results sort by discovery or created time with invalid dates last and stable ties',()=>{
 const rows=allListingsFeed({legacy:[legacy(1,{created_at:'2026-09-19T12:00:00Z'}),legacy(2,{created_at:'not-a-date'}),legacy(3)],finder:[finder(4,{postedAt:'2026-09-19T13:00:00Z'}),finder(5,{discoveredAt:undefined})]});
 assert.deepEqual(rows.slice(0,3).map(row=>String(row.item.id)),['1','4','3']);
 assert.deepEqual(new Set(rows.slice(3).map(row=>String(row.item.id))),new Set(['2','5']));
 const again=allListingsFeed({legacy:[legacy(2,{created_at:'not-a-date'}),legacy(1,{created_at:'2026-09-19T12:00:00Z'}),legacy(3)],finder:[finder(5,{discoveredAt:undefined}),finder(4)]});
 assert.deepEqual(rows.map(row=>row.key),again.map(row=>row.key));
});

test('Finder-only results retain provider order for saved price or mileage sorts',()=>{
 const cars=[finder(1,{price:5000,discoveredAt:'2026-09-19T01:00:00Z'}),finder(2,{price:9000,discoveredAt:'2026-09-19T12:00:00Z'})];
 assert.deepEqual(allListingsFeed({finder:cars,selectedSources:['finder']}).map(row=>row.item),cars);
 assert.deepEqual(allListingsFeed({finder:cars,selectedSources:[]}).map(row=>row.item),[cars[1],cars[0]]);
});

test('non-Facebook or malformed URLs never impersonate a canonical Facebook identity',()=>{
 for(const url of ['https://facebook.com.evil.test/marketplace/item/42/','https://evil.test/marketplace/item/42/','javascript:alert(42)','https://user@facebook.com/marketplace/item/42/','https://www.facebook.com/marketplace/item/not-an-id/','not a URL'])assert.equal(facebookItemIdentity(url),null);
 const rows=allListingsFeed({legacy:[legacy(42,{ad_link:'https://facebook.com.evil.test/marketplace/item/42/'})],finder:[finder(42)]});assert.equal(rows.length,2);
});
