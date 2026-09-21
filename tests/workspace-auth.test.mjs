import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import * as auth from '../lib/workspace-auth.mjs';
import { resolveWorkspaceUser } from '../lib/workspace-users.mjs';

const require = createRequire(import.meta.url);
const subject = '86d820bd-e1a7-4b70-8fab-fb0d54a5a65f';
const bearer = 'a'.repeat(64);
const time = 1700000000000;
const identity = { id: subject, username: 'dealer.test', name: 'Dealer Test' };
const reply = () => ({ token: bearer, expiresAt: time + 60000, user: identity, workspace: 'radar' });
const managed = () => ({ id: -1, tokenVersion: 0, identityKind: 'workspace', workspaceSubject: subject,
  workspaceToken: bearer, workspaceExpiresAt: time + 60000, exp: (time + 60000) / 1000 });

function loadTs(path, mocks) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const context = { exports, require: (id) => id in mocks ? mocks[id] : require(id), process, console,
    URL, Request, Response, Headers, Date, Buffer, TextEncoder, TextDecoder, setTimeout, clearTimeout };
  vm.runInNewContext(source, context, { filename: path });
  return exports;
}

test('username login and session introspection use only the fixed authority, audience and no-store requests', async () => {
  const requests = [];
  const options = { now: () => time, fetcher: async (url, init) => {
    requests.push({ url, init }); return Response.json(reply());
  } };
  await auth.loginWorkspace(identity.username, 'test-password', options);
  await auth.inspectWorkspace(bearer, subject, options);
  await auth.logoutWorkspace(bearer, options);
  assert.deepEqual(requests.map(r => r.url), ['login', 'session', 'logout'].map(action => `https://finder.carflexplus.ca/api/workspace-auth/${action}`));
  for (const { init } of requests) {
    assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error');
    assert.equal(JSON.parse(init.body).workspace, 'radar');
    assert.equal(init.headers.Cookie, undefined); assert.equal(init.headers.Authorization, undefined);
  }
  assert.equal(JSON.parse(requests[1].init.body).password, undefined);
});

test('central protocol rejects wrong audience, subject, expiry, token shape, inactive sessions and redirects', async () => {
  for (const body of [ { ...reply(), workspace: 'finder' }, { ...reply(), expiresAt: time },
    { ...reply(), user: { ...identity, id: 'not-a-uuid' } }, { ...reply(), token: 'invalid' } ]) {
    await assert.rejects(auth.loginWorkspace(identity.username, 'test-password', { now: () => time, fetcher: async () => Response.json(body) }));
  }
  await assert.rejects(auth.inspectWorkspace(bearer, subject, { now: () => time, fetcher: async () => Response.json({ ...reply(), user: { ...identity, id: '11111111-1111-1111-1111-111111111111' } }) }));
  for (const status of [301, 401, 403, 500]) await assert.rejects(auth.inspectWorkspace(bearer, subject, {
    now: () => time, fetcher: async () => new Response(null, { status }),
  }));
  for (const username of ['ab', 'dealer@example.com', 'a'.repeat(65), 'dealer space']) {
    await assert.rejects(auth.loginWorkspace(username, 'test-password', { fetcher: () => { throw Error('Must not call'); } }), /Invalid credentials/);
  }
});

function tokenDb({ missing = false, version = 0, mapped = subject } = {}) {
  return { query: async (sql) => ({ rows: sql.includes('WorkspaceIdentity') ? (mapped ? [{ subject: mapped }] : []) :
    (missing ? [] : [{ token_version: version }]) }) };
}

test('every managed authorization rechecks the current grant, including immediately after revocation', async () => {
  let active = true, calls = 0;
  const options = { db: tokenDb(), now: () => time, inspect: async () => {
    calls++; if (!active) throw Error('Revoked'); return reply();
  } };
  assert.equal(await auth.validateRadarToken(managed(), options), true);
  assert.equal(await auth.validateRadarToken(managed(), options), true);
  active = false;
  await assert.rejects(auth.validateRadarToken(managed(), options), /Revoked/);
  assert.equal(calls, 3);
});

test('mapping, token version, deleted user and central expiry are mandatory; legacy accounts remain separate', async () => {
  for (const [token, db] of [ [managed(), tokenDb({ missing: true })], [managed(), tokenDb({ version: 1 })],
    [managed(), tokenDb({ mapped: null })], [{ ...managed(), workspaceExpiresAt: time }, tokenDb()],
    [{ ...managed(), workspaceExpiresAt: undefined }, tokenDb()], [{ ...managed(), identityKind: 'legacy' }, tokenDb()] ]) {
    assert.equal(await auth.validateRadarToken(token, { db, now: () => time, inspect: () => { throw Error('Must not call'); } }), false);
  }
  assert.equal(await auth.validateRadarToken({ id: 7, tokenVersion: 0 }, { db: tokenDb({ mapped: null }), now: () => time }), true);
  await assert.rejects(auth.validateRadarToken(managed(), { db: tokenDb(), now: () => time, inspect: async () => { throw Error('Offline'); } }));
});

test('server credential only grants the exact offers list GET, never individual records or mutations', () => {
  assert.equal(auth.websiteLeadsServiceAccess('/api/offers', 'GET', `Bearer ${bearer}`, bearer), true);
  for (const path of ['/api/offers/42', `/api/offers/${subject}`, '/api/offers/0', '/api/offers/42/more', '/api/offers/42.png', '/api/offers/../employeesDetails', '/api/allCars']) {
    assert.equal(auth.websiteLeadsServiceAccess(path, 'GET', `Bearer ${bearer}`, bearer), false);
  }
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) assert.equal(auth.websiteLeadsServiceAccess('/api/offers/42', method, `Bearer ${bearer}`, bearer), false);
  for (const header of [null, bearer, `Bearer ${'b'.repeat(64)}`, `Bearer ${bearer} `]) assert.equal(auth.websiteLeadsServiceAccess('/api/offers', 'GET', header, bearer), false);
  assert.equal(auth.websiteLeadsServiceAccess('/api/offers', 'GET', 'Bearer undefined', undefined), false);
});

test('private APIs default to authentication and managed accounts cannot enter privileged routes', () => {
  for (const path of ['/api/auth/session', '/api/auth/callback/credentials', '/login', '/forgot-password', '/reset-password', '/Logo.png', '/_next/static/app.js']) assert.equal(auth.isPublicWorkspacePath(path), true);
  for (const path of ['/api/offers', '/api/cars/take', '/api/employeesDetails', '/api/private.png', '/dashboard', '/owner']) assert.equal(auth.isPublicWorkspacePath(path), false);
  for (const path of ['/listings', '/listings/finder', '/vin-decoder', '/api/finder', '/api/finder/stream', '/api/allCars']) assert.equal(auth.managedWorkspacePathAllowed(path, 'GET'), true);
  for (const path of ['/owner', '/leaders/sheet', '/caller/sheet', '/dashboard', '/api/offers', '/api/trackTime', '/api/cars/take']) assert.equal(auth.managedWorkspacePathAllowed(path, 'GET'), false);
  assert.equal(auth.managedWorkspacePathAllowed('/api/finder', 'PUT'), false);
});

function authOptions(mocks = {}) {
  return loadTs('../lib/auth-options.ts', {
    'next-auth/providers/credentials': (options) => options,
    bcrypt: { compare: async () => true }, '@/lib/db.postgres': tokenDb({ mapped: null }),
    '@/lib/workspace-auth.mjs': { ...auth, validateRadarToken: async () => true },
    '@/lib/workspace-users.mjs': { resolveWorkspaceUser: async () => ({ id: -4, role: 'OTHER', tokenVersion: 0, name: identity.name }) },
    ...mocks,
  }).authOptions;
}

test('actual NextAuth credentials preserve legacy email and never fall back after central rejection', async () => {
  let centralCalls = 0, dbCalls = 0;
  const options = authOptions({
    '@/lib/workspace-auth.mjs': { ...auth, loginWorkspace: async () => { centralCalls++; throw Error('Denied'); } },
    '@/lib/db.postgres': { query: async () => { dbCalls++; return { rows: [{ id: 12, role: 'TEAM', password: 'hash', token_version: 3 }] }; } },
  });
  assert.equal(await options.providers[0].authorize({ email: 'workspace.user', password: 'test-password' }), null);
  assert.equal(centralCalls, 1); assert.equal(dbCalls, 0);
  assert.equal((await options.providers[0].authorize({ email: 'legacy@example.com', password: 'test-password' })).id, 12);
  assert.equal(centralCalls, 1); assert.equal(dbCalls, 1);
});

test('unknown legacy user returns normal login failure and SQL excludes mapped users', async () => {
  let sql;
  const options = authOptions({ '@/lib/db.postgres': { query: async (value) => { sql = value; return { rows: [] }; } } });
  assert.equal(await options.providers[0].authorize({ email: 'missing@example.com', password: 'test-password' }), null);
  assert.match(sql, /NOT EXISTS[\s\S]*WorkspaceIdentity/);
});

test('central login produces an ordinary local user and central bearer stays out of client session', async () => {
  const options = authOptions({ '@/lib/workspace-auth.mjs': { ...auth, loginWorkspace: async () => reply(), validateRadarToken: async () => true } });
  const user = await options.providers[0].authorize({ email: identity.username, password: 'test-password' });
  assert.equal(user.id, -4); assert.equal(user.role, 'OTHER');
  const token = await options.callbacks.jwt({ token: {}, user });
  assert.equal(token.workspaceToken, bearer);
  const session = await options.callbacks.session({ token, session: { user: {}, expires: new Date(time + 3600000).toISOString() } });
  assert.equal(session.user.id, -4); assert.equal(session.expires, new Date(reply().expiresAt).toISOString());
  assert.ok(!JSON.stringify(session).includes(bearer)); assert.ok(!JSON.stringify(session).includes(subject));
});

test('revoked sessions return no client session and signing out revokes the central token', async () => {
  let loggedOut;
  const options = authOptions({ '@/lib/workspace-auth.mjs': { ...auth, validateRadarToken: async () => false, logoutWorkspace: async (token) => { loggedOut = token; } } });
  assert.equal(await options.callbacks.session({ token: managed(), session: { user: {} } }), null);
  await options.events.signOut({ token: managed() }); assert.equal(loggedOut, bearer);
});

test('mapping reuses one stable local ID after display-name changes without touching legacy users', async () => {
  const calls = [];
  const client = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: sql.includes('JOIN "User"') ? [{ id: -9, token_version: 2 }] : [] }; }, release: () => calls.push({ sql: 'RELEASE' }) };
  const user = await resolveWorkspaceUser({ connect: async () => client }, { ...identity, name: 'Renamed' });
  assert.equal(user.id, -9); assert.equal(user.name, 'Renamed'); assert.equal(user.role, 'OTHER');
  assert.ok(!calls.some(call => /INSERT|UPDATE|DELETE/.test(call.sql)));
  assert.equal(calls.at(-2).sql, 'COMMIT'); assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('mapping allocation skips a colliding numeric ID and persists subject mapping atomically', async () => {
  const calls = []; let allocations = 0;
  const client = { query: async (sql, params) => { calls.push({ sql, params });
    if (sql.includes('INSERT INTO "User"')) return { rows: ++allocations === 1 ? [] : [{ id: -2, token_version: 0 }] };
    return { rows: [] };
  }, release: () => {} };
  const user = await resolveWorkspaceUser({ connect: async () => client }, identity);
  assert.equal(user.id, -2); assert.equal(allocations, 2);
  const insertion = calls.find(call => call.sql.includes('INSERT INTO "User"'));
  assert.match(insertion.sql, /'!', 'OTHER'/); assert.match(insertion.sql, /ON CONFLICT \(id\) DO NOTHING/);
  assert.equal(insertion.params[0], `${subject}@workspace.invalid`);
  assert.deepEqual(calls.find(call => call.sql.includes('INSERT INTO "WorkspaceIdentity"')).params, [subject, -2]);
  assert.equal(calls.at(-1).sql, 'COMMIT');
});

test('mapping failure rolls back the shadow user and always releases the connection', async () => {
  const calls = [];
  const client = { query: async (sql) => { calls.push(sql); if (sql.includes('INSERT INTO "User"')) return { rows: [{ id: -1 }] };
    if (sql.includes('INSERT INTO "WorkspaceIdentity"')) throw Error('Mapping failed'); return { rows: [] }; }, release: () => calls.push('RELEASE') };
  await assert.rejects(resolveWorkspaceUser({ connect: async () => client }, identity), /Mapping failed/);
  assert.deepEqual(calls.slice(-2), ['ROLLBACK', 'RELEASE']);
});

test('actual proxy fails closed for unauthenticated business routes and honors only the narrow service credential', async () => {
  const { NextRequest } = require('next/server');
  const old = process.env.RADAR_WEBSITE_LEADS_SERVICE_TOKEN;
  process.env.RADAR_WEBSITE_LEADS_SERVICE_TOKEN = bearer;
  try {
    const { proxy } = loadTs('../proxy.ts', { '@/lib/db.postgres': tokenDb(), 'next-auth/jwt': { getToken: async () => null }, '@/lib/workspace-auth.mjs': auth });
    assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/offers'))).status, 401);
    assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/offers?token=' + bearer))).status, 401);
    assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/offers', { headers: { Authorization: `Bearer ${bearer}` } }))).status, 200);
    assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/offers/42', { headers: { Authorization: `Bearer ${bearer}` } }))).status, 401);
    assert.equal((await proxy(new NextRequest(`https://radar.carflexplus.ca/api/offers/${subject}`, { headers: { Authorization: `Bearer ${bearer}` } }))).status, 401);
    assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/offers/42', { method: 'PUT', headers: { Authorization: `Bearer ${bearer}` } }))).status, 401);
    const page = await proxy(new NextRequest('https://radar.carflexplus.ca/dashboard'));
    assert.equal(page.status, 307); assert.equal(page.headers.get('location'), 'https://radar.carflexplus.ca/login');
  } finally { if (old === undefined) delete process.env.RADAR_WEBSITE_LEADS_SERVICE_TOKEN; else process.env.RADAR_WEBSITE_LEADS_SERVICE_TOKEN = old; }
});

test('actual proxy checks managed grants on each request and denies privileged direct URLs', async () => {
  const { NextRequest } = require('next/server'); let allowed = true, checks = 0;
  const { proxy } = loadTs('../proxy.ts', { '@/lib/db.postgres': tokenDb(), 'next-auth/jwt': { getToken: async () => managed() },
    '@/lib/workspace-auth.mjs': { ...auth, validateRadarToken: async () => { checks++; return allowed; } } });
  assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/finder'))).status, 200);
  assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/owner'))).status, 403);
  allowed = false;
  assert.equal((await proxy(new NextRequest('https://radar.carflexplus.ca/api/finder'))).status, 401);
  assert.equal(checks, 3);
});

test('existing quiet-stream revocation loop checks the central session through the shared guard', () => {
  const route = readFileSync(new URL('../app/api/finder/stream/route.ts', import.meta.url), 'utf8');
  assert.match(route, /getToken\(\{req:new NextRequest\(request\)\}\)/);
  assert.match(route, /validateRadarToken\(token,\{db\}\)/);
  assert.match(route, /proxyFinderStream\(\{[^}]*authorize\}/);
});

test('central passwords preserve long Unicode values and the 12–300 character contract', async () => {
  const passwords = ['界'.repeat(100), '界'.repeat(300), 'A'.repeat(300), '🔑'.repeat(150)];
  for (const password of passwords) {
    let sent;
    await auth.loginWorkspace('Dealer.TEST', password, { now: () => time, fetcher: async (_, init) => { sent = JSON.parse(init.body); return Response.json(reply()); } });
    assert.equal(sent.password, password); assert.equal(sent.username, 'dealer.test');
  }
  for (const password of ['x'.repeat(11), 'x'.repeat(301)]) await assert.rejects(auth.loginWorkspace(identity.username, password), /Invalid credentials/);
  const { signinSchema } = loadTs('../lib/validations/signinSchema.ts', {});
  assert.equal(signinSchema.safeParse({ email: 'legacy@example.com', password: '12345678' }).success, true);
  for (const password of passwords) assert.equal(signinSchema.safeParse({ email: identity.username, password }).success, true);
  assert.equal(signinSchema.safeParse({ email: identity.username, password: '12345678' }).success, false);
});

test('central JSON reader rejects oversized and non-JSON replies and times out stalled bodies', async () => {
  await assert.rejects(auth.inspectWorkspace(bearer, subject, { now: () => time, fetcher: async () => new Response(JSON.stringify(reply()), { headers: { 'Content-Type': 'text/html' } }) }), /Invalid workspace response/);
  await assert.rejects(auth.inspectWorkspace(bearer, subject, { now: () => time, fetcher: async () => Response.json({ ...reply(), padding: 'x'.repeat(17000) }) }), /too large/);
  await assert.rejects(auth.inspectWorkspace(bearer, subject, { now: () => time, timeoutMs: 10, fetcher: async () => new Response(new ReadableStream({}), { headers: { 'Content-Type': 'application/json' } }) }), /timed out/);
});

test('NextAuth encrypted cookies preserve legacy fields and keep managed bearer unreadable', async () => {
  const { encode, getToken } = require('next-auth/jwt');
  const { NextRequest } = require('next/server');
  const secret = 'fixture-only-cookie-secret-no-live-account';
  for (const fields of [{ id: 25, tokenVersion: 0, role: 'TEAM' }, { ...managed(), exp: undefined }]) {
    const encoded = await encode({ token: fields, secret, maxAge: 300 });
    assert.ok(!encoded.includes(bearer));
    const request = new NextRequest('https://radar.carflexplus.ca/api/finder', { headers: { cookie: `__Secure-next-auth.session-token=${encoded}` } });
    const decoded = await getToken({ req: request, secret, secureCookie: true });
    assert.equal(decoded.id, fields.id); assert.equal(decoded.tokenVersion, fields.tokenVersion);
    assert.equal(await getToken({ req: request, secret: 'wrong-key', secureCookie: true }), null);
  }
});

test('authenticated initial listing loads use fixed local routes; negative IDs retain isolated preferences', async () => {
  let allowed = true, calls = 0;
  const routes = {};
  for (const name of ['all', 'facebook', 'autotrader', 'kijiji', 'marketplace']) routes[`@/app/api/${name}Cars/route`] = { GET: async () => { calls++; return Response.json({ items: [{ title: name }] }); } };
  const { default: fetchData } = loadTs('../helpers/fetchData.ts', {
    'next-auth': { getServerSession: async () => allowed ? { user: { id: -4 } } : null },
    '@/lib/auth-options': {}, 'next/navigation': { redirect: () => { throw Error('Redirected to login'); } }, ...routes,
  });
  for (const name of ['all', 'facebook', 'autotrader', 'kijiji', 'marketplace']) assert.equal((await fetchData({ name })).items[0].title, name);
  await assert.rejects(fetchData({ name: '../offers' }), /Invalid listing source/);
  allowed = false;
  await assert.rejects(fetchData({ name: 'all' }), /Redirected to login/); assert.equal(calls, 5);
  const { finderPreferenceKey } = await import('../lib/finder-preference.mjs');
  assert.equal(finderPreferenceKey(-4), 'carflex-finder-filter:-4');
  assert.notEqual(finderPreferenceKey(-4), finderPreferenceKey(4));
});
