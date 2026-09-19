import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth-options';
import db from '@/lib/db.postgres';
import {finderCursor,proxyFinderStream} from '@/lib/finder-stream.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 try{
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return Response.json({error:'Please sign in to use Carflex Finder.'},{status:401});
  const params=new URL(request.url).searchParams;
  if([...params.keys()].some(name=>name!=='cursor')||params.getAll('cursor').length!==1)return Response.json({error:'Invalid Finder stream.'},{status:400});
  let cursor;try{cursor=Math.max(finderCursor(params.get('cursor')),request.headers.has('Last-Event-ID')?finderCursor(request.headers.get('Last-Event-ID')):0);}catch{return Response.json({error:'Invalid Finder cursor.'},{status:400});}
  const authorize=async()=>{
   if(Date.parse(session.expires)<=Date.now())return false;
   const current=await db.query('SELECT token_version FROM "User" WHERE id=$1',[session.user.id]);
   return !!current.rows[0]&&(current.rows[0].token_version??0)===session.user.tokenVersion;
  };
  return await proxyFinderStream({request,key:process.env.CARFLEX_FINDER_API_KEY,cursor,authorize});
 }catch{return Response.json({error:'Finder live updates are temporarily unavailable.'},{status:503});}
}
