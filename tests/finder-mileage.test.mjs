import test from 'node:test';
import assert from 'node:assert/strict';
import {finderMileageLabel} from '../lib/finder-mileage.mjs';

test('Finder shows observed title/description mileage before the raw field is backfilled',()=>{
 assert.equal(finderMileageLabel({valuationEvidence:{mileage:{status:'observed',valueKm:191500}}}),'191,500 km');
 assert.equal(finderMileageLabel({mileage:100000,valuationEvidence:{mileage:{status:'observed',valueKm:160934}}}),'160,934 km');
 assert.equal(finderMileageLabel({valuationEvidence:{mileage:{status:'observed',valueKm:0}}}),'0 km');
});
test('conflicts and missing odometers do not become guessed mileage',()=>{
 assert.equal(finderMileageLabel({mileage:100000,valuationEvidence:{mileage:{status:'conflict',valueKm:null}}}),'Mileage needs confirmation');
 assert.equal(finderMileageLabel({mileage:100000,valuationEvidence:{mileage:{status:'missing',valueKm:null}}}),'Mileage not yet collected');
 assert.equal(finderMileageLabel({priceEstimate:{mileage:100000},detailCoverage:{mileage:'not-found'}}),'Mileage not found on the ad');
 assert.equal(finderMileageLabel({detailCoverage:{mileage:'unavailable'}}),'Mileage unavailable');
 assert.equal(finderMileageLabel({mileage:42000}),'42,000 km');
});
