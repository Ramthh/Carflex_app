export function finderTimeAgo(value,now=Date.now()){
 if(typeof value!=='string'||!value.trim())return 'Not available';
 const at=Date.parse(value);
 if(!Number.isFinite(at)||!Number.isFinite(now))return 'Not available';
 // Do not show a misleading negative age for an invalid future source time.
 if(at>now+60000)return 'Time needs confirmation';
 const elapsed=Math.max(0,Math.floor((now-at)/1000));
 const days=Math.floor(elapsed/86400),hours=Math.floor(elapsed/3600)%24,minutes=Math.floor(elapsed/60)%60,seconds=elapsed%60;
 if(days)return `${days}d ${hours}h ${minutes}m ago`;
 if(hours)return `${hours}h ${minutes}m ${seconds}s ago`;
 return `${minutes}m ${seconds}s ago`;
}
