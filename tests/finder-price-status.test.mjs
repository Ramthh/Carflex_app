import test from 'node:test';
import assert from 'node:assert/strict';
import {finderPriceStatus} from '../lib/finder-price-status.mjs';
const status=(ask,value)=>finderPriceStatus(ask,{status:'available',amount:value});
test('deal categories require both dollar and percentage limits, including their boundaries',()=>{
 for(const [ask,value,label]of [[20000,21000,'Steal'],[20000,20000,'Steal'],[20000,18000,'Good'],[20000,17999,'Potential'],[20000,16000,'Potential'],[20000,15999,'Entertain'],[50000,47000,'Good'],[50000,46999,'Potential'],[50000,45000,'Potential'],[50000,44999,'Entertain'],[10000,7500,'Entertain'],[14000,14830,'Steal'],[25000,20136,'Potential'],[11500,4368,'Entertain']])assert.equal(status(ask,value),label,`${ask}/${value}`);
});
test('missing or invalid prices and unavailable estimates stay Unknown independently',()=>{
 for(const ask of [null,undefined,0,-1,NaN,Infinity,'10000'])assert.equal(status(ask,15000),'Unknown');
 for(const value of [null,undefined,0,-1,NaN,Infinity])assert.equal(status(10000,value),'Unknown');
 for(const state of ['unavailable','pending','retry',undefined])assert.equal(finderPriceStatus(10000,{status:state,amount:15000}),'Unknown');
 assert.equal(finderPriceStatus(10000,undefined),'Unknown');
 const car={price:20000,priceEstimate:{status:'available',amount:21000},oldPriceEstimate:{status:'available',amount:17000}};
 assert.equal(finderPriceStatus(car.price,car.priceEstimate),'Steal');assert.equal(finderPriceStatus(car.price,car.oldPriceEstimate),'Potential');
});
