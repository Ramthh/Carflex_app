import test from 'node:test';
import assert from 'node:assert/strict';
import {finderTimeAgo} from '../lib/finder-time.mjs';
test('posting and discovery ages stay distinct and tick across time boundaries',()=>{
 const now=Date.parse('2026-09-14T00:10:00Z'),posted='2026-09-14T00:02:27Z',discovered='2026-09-14T00:09:27Z';
 assert.equal(finderTimeAgo(posted,now),'7m 33s ago');assert.equal(finderTimeAgo(discovered,now),'0m 33s ago');
 assert.equal(finderTimeAgo(discovered,now+27000),'1m 0s ago');
 assert.equal(finderTimeAgo(posted,now+3600000),'1h 7m 33s ago');
 assert.equal(finderTimeAgo(posted,now+86400000),'1d 0h 7m ago');
});
test('missing, malformed and future timestamps never become invented posting ages',()=>{
 const now=Date.parse('2026-09-14T00:10:00Z');
 for(const value of [undefined,null,'','invalid'])assert.equal(finderTimeAgo(value,now),'Not available');
 assert.equal(finderTimeAgo('2026-09-15T00:10:00Z',now),'Time needs confirmation');
 assert.equal(finderTimeAgo('2026-09-14T00:10:01Z',now),'0m 0s ago');
});
