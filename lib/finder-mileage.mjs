export function finderMileageLabel(car){
 const evidence=car.valuationEvidence?.mileage;
 if(evidence?.status==='conflict')return 'Mileage needs confirmation';
 const km=evidence?.status==='observed'?evidence.valueKm:evidence?.status==='missing'?null:car.mileage;
 if(Number.isFinite(km)&&km>=0&&km<5000000)return `${km.toLocaleString('en-CA')} km`;
 return car.detailCoverage?.mileage==='not-found'?'Mileage not found on the ad':car.detailCoverage?.mileage==='unavailable'?'Mileage unavailable':'Mileage not yet collected';
}
