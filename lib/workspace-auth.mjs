import { timingSafeEqual } from 'node:crypto';

const authority = 'https://finder.carflexplus.ca/api/workspace-auth';
const usernamePattern = /^[a-zA-Z0-9._-]{3,64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const tokenPattern = /^[a-f0-9]{64}$/;

export function validWorkspaceUsername(value) {
  return typeof value === 'string' && usernamePattern.test(value);
}

function validReply(value, now) {
  return value?.workspace === 'radar' && Number.isSafeInteger(value.expiresAt) && value.expiresAt > now &&
    uuidPattern.test(value.user?.id ?? '') && validWorkspaceUsername(value.user?.username) &&
    typeof value.user?.name === 'string' && value.user.name.length <= 256;
}

// The fixed authority, audience, redirect policy and no-store setting are part
// of the trust boundary. Caller-supplied origins and forwarded cookies are never used.
async function callAuthority(action, body, { fetcher = fetch, now = Date.now, timeoutMs = 8000 } = {}) {
  const abort = new AbortController(); let timer, reader;
  try {
    return await Promise.race([
      new Promise((_, reject) => { timer = setTimeout(() => { abort.abort(); reject(new Error('Workspace request timed out')); }, timeoutMs); }),
      (async () => {
        const response = await fetcher(`${authority}/${action}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...body, workspace: 'radar' }), cache: 'no-store',
          redirect: 'error', signal: abort.signal,
        });
        if (!response.ok || response.redirected) throw new Error('Workspace access unavailable');
        if (action === 'logout') { void response.body?.cancel().catch(() => {}); return; }
        if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) {
          throw new Error('Invalid workspace response');
        }
        if (Number(response.headers.get('content-length')) > 16384) throw new Error('Workspace response too large');
        reader = response.body.getReader();
        const chunks = []; let size = 0;
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 16384) throw new Error('Workspace response too large');
          chunks.push(part.value);
        }
        const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        if (!validReply(value, now())) throw new Error('Invalid workspace session');
        return value;
      })(),
    ]);
  } finally { clearTimeout(timer); abort.abort(); void reader?.cancel().catch(() => {}); }
}

export async function loginWorkspace(username, password, options) {
  if (!validWorkspaceUsername(username) || typeof password !== 'string' || password.length < 12 || password.length > 300 || Buffer.byteLength(password, 'utf8') > 1200) {
    throw new Error('Invalid credentials');
  }
  const value = await callAuthority('login', { username: username.toLowerCase(), password }, options);
  if (!tokenPattern.test(value.token ?? '')) throw new Error('Invalid workspace session');
  return value;
}

export async function inspectWorkspace(token, subject, options) {
  if (!tokenPattern.test(token ?? '') || !uuidPattern.test(subject ?? '')) throw new Error('Invalid workspace session');
  const value = await callAuthority('session', { token }, options);
  if (value.user.id !== subject) throw new Error('Workspace identity changed');
  return value;
}

export async function logoutWorkspace(token, options) {
  if (!tokenPattern.test(token ?? '')) return;
  await callAuthority('logout', { token }, options);
}

export function websiteLeadsServiceAccess(pathname, method, authorization, configuredToken) {
  if (method !== 'GET' || pathname !== '/api/offers') return false;
  if (!tokenPattern.test(configuredToken ?? '') || typeof authorization !== 'string') return false;
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return tokenPattern.test(supplied) && timingSafeEqual(Buffer.from(supplied), Buffer.from(configuredToken));
}

const publicFiles = new Set(['/favicon.ico', '/Logo.png', '/Logo2.png', '/Logo.svg', '/Car-placeholder.png',
  '/carflex-finder-new.png', '/file.svg', '/globe.svg', '/window.svg', '/notify.mp3', '/other-notify.mp3']);
export function isPublicWorkspacePath(pathname) {
  return ['/login', '/forgot-password', '/reset-password'].includes(pathname) || publicFiles.has(pathname) ||
    pathname.startsWith('/_next/') || pathname.startsWith('/api/auth/');
}

// OTHER is the existing ordinary inventory role. New central accounts cannot
// gain employee, owner or CRM powers by typing an unlisted URL directly.
export function managedWorkspacePathAllowed(pathname, method) {
  if (!pathname.startsWith('/api/')) return pathname === '/' || pathname === '/vin-decoder' ||
    pathname === '/listings' || pathname.startsWith('/listings/');
  return method === 'GET' && ['/api/allCars', '/api/autotraderCars', '/api/facebookCars', '/api/kijijiCars',
    '/api/marketplaceCars', '/api/finder', '/api/finder/filters', '/api/finder/stream'].includes(pathname);
}

/** @param {any} token @param {{db:any, inspect?:Function, now?:()=>number}} options */
export async function validateRadarToken(token, { db, inspect = inspectWorkspace, now = Date.now }) {
  if (!token || !Number.isSafeInteger(token.id) || token.id === 0 || !Number.isSafeInteger(token.tokenVersion)) return false;
  if (typeof token.exp === 'number' && token.exp * 1000 <= now()) return false;
  const result = await db.query('SELECT token_version FROM "User" WHERE id = $1', [token.id]);
  if (!result.rows[0] || (result.rows[0].token_version ?? 0) !== token.tokenVersion) return false;
  const mapping = await db.query('SELECT subject FROM "WorkspaceIdentity" WHERE user_id = $1', [token.id]);
  if (token.identityKind !== 'workspace') return mapping.rows.length === 0;
  if (mapping.rows[0]?.subject !== token.workspaceSubject || !Number.isSafeInteger(token.workspaceExpiresAt) || token.workspaceExpiresAt <= now()) return false;
  const current = await inspect(token.workspaceToken, token.workspaceSubject);
  return current.workspace === 'radar' && current.user.id === token.workspaceSubject && current.expiresAt > now();
}
