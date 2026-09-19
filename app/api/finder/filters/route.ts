import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth-options';
import db from '@/lib/db.postgres';
import {readFinderFilters} from '@/lib/finder-filters.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const reply=(body:unknown,status:number)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 try{
  const session=await getServerSession(authOptions);
  if(!session?.user?.id)return reply({error:'Please sign in to use Carflex Finder.'},401);
  const current=await db.query('SELECT token_version FROM "User" WHERE id=$1',[session.user.id]);
  if(!current.rows[0]||(current.rows[0].token_version??0)!==session.user.tokenVersion)return reply({error:'Your session ended. Please sign in again.'},401);
  if(new URL(request.url).search)return reply({error:'Saved filters do not accept request parameters.'},400);
  const result=await readFinderFilters({key:process.env.CARFLEX_FINDER_API_KEY});
  return reply(result.body,result.status);
 }catch{return reply({error:'Saved filters could not load. Please try again.'},503);}
}
