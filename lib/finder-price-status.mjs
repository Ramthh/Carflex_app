// These are the asking-price thresholds used by Swoopa Marketplace.
// Finder's two independent estimates each get their own classification.
export function finderPriceStatus(price,estimate){
 if(!Number.isFinite(price)||price<=0||estimate?.status!=='available'||!Number.isFinite(estimate.amount)||estimate.amount<=0)return 'Unknown';
 const gap=price-estimate.amount;
 if(gap<=0)return 'Steal';
 if(gap<=3000&&gap<=price*0.1)return 'Good';
 if(gap<=5000&&gap<=price*0.2)return 'Potential';
 return 'Entertain';
}
