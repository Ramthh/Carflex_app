import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import db from '@/lib/db.postgres';
import { isPublicWorkspacePath, managedWorkspacePathAllowed, validateRadarToken, websiteLeadsServiceAccess } from '@/lib/workspace-auth.mjs';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/$/, '') || '/';
  if (isPublicWorkspacePath(pathname)) return NextResponse.next();
  if (websiteLeadsServiceAccess(pathname, request.method, request.headers.get('authorization'), process.env.RADAR_WEBSITE_LEADS_SERVICE_TOKEN)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
  try {
    const token = await getToken({ req: request });
    if (await validateRadarToken(token, { db })) {
      if (token?.identityKind === 'workspace' && !managedWorkspacePathAllowed(pathname, request.method)) {
        return NextResponse.json({ error: 'This account does not have access to this page.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const origin = request.headers.get('origin');
        if (!origin || new URL(origin).origin !== request.nextUrl.origin) {
          return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
        }
      }
      const response = NextResponse.next();
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  } catch { /* Fail closed without logging credentials, upstream bodies or cookies. */ }
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Your session ended. Please sign in again.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
