const origin='https://finder.carflexplus.ca';
const encoder=new TextEncoder();
export function finderCursor(value){if(!/^\d{1,16}$/.test(String(value??''))||!Number.isSafeInteger(Number(value)))throw Error('Invalid Finder cursor.');return Number(value);}

// The browser sees only its authenticated same-origin connection. Integration
// credentials remain in this server's upstream header. Revocation is checked
// even while the source is quiet or the client is not reading.
export async function proxyFinderStream({request,key,cursor,authorize,fetcher=fetch,authorizeMs=5000,lifetimeMs=45000}){
 if(!/^cf_finder_[a-f0-9]{64}$/.test(key||''))return Response.json({error:'Finder is not connected.'},{status:503});
 if(!await authorize())return Response.json({error:'Your session ended. Please sign in again.'},{status:401});
 const abort=new AbortController();let reader,controller,closed=false,authTimer,expiry;
 const finish=()=>{if(closed)return;closed=true;clearTimeout(authTimer);clearTimeout(expiry);request.signal.removeEventListener('abort',finish);abort.abort();void reader?.cancel().catch(()=>{});try{controller?.close();}catch{}};
 request.signal.addEventListener('abort',finish,{once:true});
 if(request.signal.aborted){finish();return new Response(null,{status:499});}
 expiry=setTimeout(finish,15000);
 let upstream;
 try{
  upstream=await fetcher(`${origin}/api/integrations/railway/listings/stream?inventory=all&cursor=${finderCursor(cursor)}`,{headers:{'X-API-Key':key,Accept:'text/event-stream'},cache:'no-store',redirect:'error',signal:abort.signal});
  if(!upstream.ok||!upstream.headers.get('content-type')?.startsWith('text/event-stream')||!upstream.body)throw Error('Finder stream unavailable');
  reader=upstream.body.getReader();clearTimeout(expiry);
 }catch{finish();return Response.json({error:'Finder live updates are temporarily unavailable.'},{status:503});}
 async function check(){
  try{if(!await authorize()){if(!closed)controller.enqueue(encoder.encode('event: access-revoked\ndata: {}\n\n'));finish();return;}}
  catch{finish();return;}
  if(!closed)authTimer=setTimeout(check,authorizeMs);
 }
 const body=new ReadableStream({
  start(value){controller=value;authTimer=setTimeout(check,authorizeMs);expiry=setTimeout(finish,lifetimeMs);},
  async pull(){try{const part=await reader.read();if(closed)return;if(part.done)finish();else controller.enqueue(part.value);}catch{finish();}},
  cancel(){finish();}
 });
 return new Response(body,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'}});
}
