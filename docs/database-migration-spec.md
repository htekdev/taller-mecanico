# Database Migration Spec — Taller Mecánico

**Status:** Draft — awaiting approval before implementation  
**Author:** Copilot  
**Date:** June 2026  
**Goal:** Replace `localStorage` with a cloud database to enable multi-device sync

---

## 1. Current State

### Data Architecture
All data lives in the browser's `localStorage`. On every write the entire collection is serialized to JSON and stored under these keys:

| Key | Type | Notes |
|---|---|---|
| `clientes` | `Cliente[]` | ~simple, name + phone |
| `vehiculos` | `Vehiculo[]` | FK → `clientes.id` |
| `inventario` | `Refaccion[]` | Parts catalog, optional `vehiculoId` |
| `trabajos` | `Trabajo[]` | **Complex** — nested `partes[]`, `manoDeObraItems[]`, `pagos[]` |

### The Problem
- localStorage is **browser-only** — a phone and a laptop see completely different data
- No sync, no backup, no concurrent access
- If the browser cache is cleared, all data is lost

### What We're NOT Changing (yet)
- The React component structure and UI remain identical
- Authentication is deferred — this is an internal shop tool, not a multi-tenant SaaS
- The `localStorage` keys will be preserved during a parallel migration phase so the app stays usable during rollout

---

## 2. Requirements

| Priority | Requirement |
|---|---|
| **Must** | Changes on one device appear on other devices within ~2 seconds |
| **Must** | Zero downtime migration from existing localStorage data |
| **Must** | Works on phone, tablet, desktop simultaneously |
| **Should** | Free tier or < $10/month |
| **Should** | No new backend services to maintain |
| **Nice** | Realtime push (vs. polling) |
| **Defer** | User authentication |
| **Defer** | Multi-tenant / multiple shops |

---

## 3. Data Model Analysis

Before choosing a database, understand what the schema looks like relationally vs. as documents.

### Option A — Relational (Postgres)

```sql
-- Flat tables, FK relations
clientes       (id, nombre, telefono)
vehiculos      (id, cliente_id FK, marca, modelo, anio, placa, vehiculo_id?)
inventario     (id, nombre, codigo, categoria, unidad, precio_compra, stock, stock_minimo, vehiculo_id?)
trabajos       (id, cliente_id FK, vehiculo_id FK, fecha, descripcion, mano_de_obra, 
                refacciones, costo_refacciones, total, estado, created_at)

-- Child rows (1-to-many from trabajo)
trabajo_partes         (id, trabajo_id FK, refaccion_id FK, nombre_snap, codigo_snap,
                        cantidad, precio_compra, precio_venta, subtotal, costo_total)
trabajo_mano_de_obra   (id, trabajo_id FK, concepto, precio)
trabajo_pagos          (id, trabajo_id FK, fecha, monto, nota)
```

**Pros:** Perfect for relational queries ("all jobs for this vehicle"), proper normalization  
**Cons:** Prisma schema + 7 migrations + more complex API routes

### Option B — Document (JSON stored in Postgres or Redis)

```json
// trabajos stored as a single JSON column or Redis key
{
  "id": "...",
  "partes": [...],
  "manoDeObraItems": [...],
  "pagos": [...]
}
```

**Pros:** 1:1 match with current localStorage structure — easier migration, simpler code  
**Cons:** Harder to query across nested arrays, can't index parts efficiently

**Recommendation:** Use **relational tables** for a proper database — the migration is a one-time cost and you gain queryability forever. The nested arrays in `Trabajo` map naturally to child tables.

---

## 4. Options

---

### Option 1 — Vercel KV (Redis) · Quick MVP

**What it is:** Vercel's managed Redis service (built on Upstash). Key-value store — store each collection as a JSON blob under a key.

**Architecture:**
```
Browser → Next.js API route (/api/clientes, /api/trabajos, etc.) → Vercel KV (Redis)
```

**Data approach:**  
Store entire collections as JSON arrays, just like localStorage:
```
KV["clientes"] = JSON.stringify([...])
KV["trabajos"] = JSON.stringify([...])
```

**Pros**
- ✅ 30-minute setup — `npx vercel env pull`, install `@vercel/kv`, done
- ✅ Free tier: 256 MB, 30K requests/day, 1 database
- ✅ No schema, no migrations — paste existing data and go
- ✅ Stays entirely in Vercel ecosystem
- ✅ Zero infrastructure to manage

**Cons**
- ❌ Redis is not relational — no queries like "all jobs for client X" without loading everything
- ❌ Race condition on concurrent writes (two devices write simultaneously → last write wins)
- ❌ 256MB free tier — fine for small shop, but if they add photos eventually this breaks
- ❌ No real-time push — need to poll (every 5s or on window focus)
- ❌ Not great at partial updates (must re-serialize entire array on every change)

**API routes needed:**
```
GET  /api/clientes          → return KV.get("clientes")
POST /api/clientes          → KV.set("clientes", [...existing, newCliente])
GET  /api/trabajos          → return KV.get("trabajos")
POST /api/trabajos          → append + re-serialize
PUT  /api/trabajos/:id      → update one + re-serialize
POST /api/trabajos/:id/pagos → append pago + re-serialize
// repeat for vehiculos, inventario
```

**Migration from localStorage:**
```
One-time: POST /api/migrate with the browser's localStorage dump
```

**Cost:** Free (Upstash free tier: 10K commands/day; Vercel KV free: 256MB)  
**Time to implement:** ~2 hours  
**Best for:** Fastest possible demo of multi-device sync

---

### Option 2 — Vercel Postgres (Neon) + Prisma · Ecosystem Option

**What it is:** Vercel's managed Postgres, powered by [Neon](https://neon.tech) (serverless Postgres). Prisma is the ORM.

**Architecture:**
```
Browser → Next.js API routes → Prisma Client → Neon Postgres (serverless)
```

**Prisma schema sketch:**
```prisma
model Cliente {
  id        String    @id @default(cuid())
  nombre    String
  telefono  String
  vehiculos Vehiculo[]
  trabajos  Trabajo[]
  createdAt DateTime  @default(now())
}

model Vehiculo {
  id        String   @id @default(cuid())
  clienteId String
  cliente   Cliente  @relation(fields: [clienteId], references: [id])
  marca     String
  modelo    String
  anio      String?
  placa     String?
  trabajos  Trabajo[]
  inventario Refaccion[]
}

model Refaccion {
  id          String   @id @default(cuid())
  nombre      String
  codigo      String?
  categoria   String
  unidad      String
  precioCompra Float
  stock        Int
  stockMinimo  Int      @default(1)
  vehiculoId  String?
  vehiculo    Vehiculo? @relation(...)
  partes      TrabajoRefaccion[]
}

model Trabajo {
  id               String   @id @default(cuid())
  clienteId        String
  vehiculoId       String
  fecha            DateTime
  descripcion      String
  manoDeObra       Float
  refacciones      Float
  costoRefacciones Float
  total            Float
  estado           String   @default("pendiente")
  cliente          Cliente  @relation(...)
  vehiculo         Vehiculo @relation(...)
  partes           TrabajoRefaccion[]
  manoDeObraItems  TrabajoManoDeObra[]
  pagos            TrabajoPago[]
}

model TrabajoRefaccion {
  id           String   @id @default(cuid())
  trabajoId    String
  refaccionId  String
  nombreSnap   String
  codigoSnap   String?
  cantidad     Int
  precioCompra Float
  precioVenta  Float
  subtotal     Float
  costoTotal   Float
  trabajo      Trabajo   @relation(...)
  refaccion    Refaccion @relation(...)
}

model TrabajoManoDeObra {
  id        String  @id @default(cuid())
  trabajoId String
  concepto  String
  precio    Float
  trabajo   Trabajo @relation(...)
}

model TrabajoPago {
  id        String   @id @default(cuid())
  trabajoId String
  fecha     DateTime
  monto     Float
  nota      String?
  trabajo   Trabajo  @relation(...)
}
```

**Pros**
- ✅ Full relational database — proper queries, indexes, FK constraints
- ✅ Free tier: 512MB storage, 1 database, 10GB transfer/month (Neon free)
- ✅ Prisma DX is excellent — typed queries, auto-generated client
- ✅ Stays in Vercel ecosystem
- ✅ Production-grade — can scale without re-architecting

**Cons**
- ❌ Neon has a ~500ms cold start on serverless connections (first query after idle)
- ❌ More setup: `prisma init`, schema, `prisma migrate`, seed data
- ❌ More API routes needed (full CRUD for each entity)
- ❌ No real-time — still need polling or SSE

**Migration:**
```
1. Write one-time migration script: read localStorage JSON → parse → INSERT via Prisma
2. Run as a /api/migrate endpoint (one-time, authenticated by a secret token)
```

**API routes needed:**
```
GET  /api/clientes           → prisma.cliente.findMany()
POST /api/clientes           → prisma.cliente.create()
GET  /api/vehiculos          → prisma.vehiculo.findMany({ include: { cliente: true } })
POST /api/vehiculos          → prisma.vehiculo.create()
GET  /api/inventario         → prisma.refaccion.findMany()
POST /api/inventario         → prisma.refaccion.create()
PATCH /api/inventario/:id    → prisma.refaccion.update() (for stock changes)
GET  /api/trabajos           → prisma.trabajo.findMany({ include: { partes, pagos, manoDeObraItems } })
POST /api/trabajos           → prisma.trabajo.create() (with nested creates for partes + items)
POST /api/trabajos/:id/pagos → prisma.trab pajoPago.create()
POST /api/migrate            → one-time bulk import from localStorage JSON
```

**Cost:** Free (Neon free tier: 0.5GB storage; Vercel Postgres free tier)  
**Time to implement:** ~5-7 hours  
**Best for:** Long-term production use, queryability, staying in Vercel ecosystem

---

### Option 3 — AWS RDS PostgreSQL · Existing Infrastructure

**What it is:** A PostgreSQL instance on Amazon RDS in their existing AWS account.

**Architecture:**
```
Browser → Next.js API routes (Vercel) → AWS RDS PostgreSQL (existing account)
         (cross-cloud call: Vercel → AWS — needs proper credentials/networking)
```

**Same schema as Option 2** (Prisma works identically regardless of Postgres host)

**Pros**
- ✅ They own it entirely — no new vendor relationship
- ✅ Existing AWS account — already have billing, IAM, familiarity
- ✅ Same schema as Option 2 — if they choose this path, work transfers
- ✅ Can be in same region as app deployment for low latency
- ✅ Can use RDS free tier for 12 months (new account) or migrate to existing

**Cons**
- ❌ RDS db.t3.micro = **$13-16/month** minimum (even when idle)
- ❌ Requires VPC configuration — by default RDS is not publicly accessible
  - Options: (a) make it publicly accessible (insecure), (b) use AWS Lambda as proxy, (c) set up VPC peering with Vercel (complex)
- ❌ Connecting from Vercel (external) to RDS requires either:
  - Public endpoint + SSL + security group allowing Vercel IPs (Vercel IPs are not fixed — list changes)
  - AWS IAM DB auth + Secrets Manager in every API route
- ❌ Most operational complexity of all options
- ❌ Cold start risk: Prisma + RDS connection pool management needed (use `@prisma/adapter-pg` + connection pooler like PgBouncer or RDS Proxy ~$23/month)

**Migration:** Identical to Option 2

**Cost:** ~$13-20/month (RDS t3.micro + storage) + optional RDS Proxy $23/month  
**Time to implement:** ~8-12 hours (includes AWS setup, VPC, IAM, Prisma, API routes)  
**Best for:** Teams with AWS expertise who want to own all infrastructure

---

### Option 4 — Supabase · Fastest Full-Featured

**What it is:** Supabase = PostgreSQL + realtime subscriptions + auto-generated REST API + optional auth + file storage. Hosted, open-source.

**Architecture:**
```
Browser → Supabase JS Client (or Next.js API routes) → Supabase Postgres
                    ↕ realtime websocket
              (changes propagate instantly to all connected clients)
```

**Same relational schema as Option 2** — Supabase IS Postgres under the hood.

**Pros**
- ✅ **Realtime built-in** — changes on one device instantly push to all others (no polling)
  - ```js
    supabase.channel('trabajos').on('postgres_changes', { event: '*', schema: 'public', table: 'trabajos' }, 
      payload => { refetchData(); }
    ).subscribe()
    ```
- ✅ **Generous free tier:** 500MB database, 1GB file storage, 2GB bandwidth, 50K MAU, **unlimited API requests**
- ✅ Auto-generated REST API and JS client — no API routes needed for basic CRUD
- ✅ Postgres — same schema as Option 2, proper relational queries
- ✅ Row Level Security (RLS) built-in for future auth
- ✅ Dashboard UI for browsing data (useful during development)
- ✅ Easy migration — Supabase has a CSV/SQL import wizard

**Cons**
- ❌ New vendor dependency (Supabase, Inc.)
- ❌ Free tier projects **pause after 1 week of inactivity** → ~500ms wake time
  - Fix: upgrade to Pro ($25/month) OR add a ping cron to keep alive
- ❌ Not on existing AWS/Vercel ecosystem — separate dashboard to manage
- ❌ Realtime subscription setup adds frontend complexity (but it's the best UX)

**API approach — two valid patterns:**

**Pattern A (recommended for MVP): Direct Supabase client in frontend**
```js
// No API routes needed for basic CRUD
const { data } = await supabase.from('clientes').select('*')
await supabase.from('trabajos').insert({ ...trabajoData })
```

**Pattern B (recommended for production): API routes as proxy**
```js
// Next.js API routes call Supabase server-side (hides credentials)
GET /api/clientes → supabaseAdmin.from('clientes').select()
POST /api/trabajos → supabaseAdmin.from('trabajos').insert()
```

**Migration from localStorage:**
```
1. Export from browser console: JSON.stringify(localStorage)
2. Transform to SQL INSERT statements (small script)
3. Run in Supabase SQL Editor or use Supabase CSV import
```

**Realtime sync implementation:**
```js
// In the main app component
useEffect(() => {
  const channel = supabase.channel('app-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => {
      loadAllData(); // re-fetch everything on any change
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

**Cost:** Free tier (or $25/month Pro if inactivity pausing is a problem)  
**Time to implement:** ~3-4 hours  
**Best for:** Multi-device sync NOW, real-time updates, minimal ops overhead

---

## 5. Comparison Table

| | Option 1 — Vercel KV | Option 2 — Vercel Postgres | Option 3 — AWS RDS | Option 4 — Supabase |
|---|---|---|---|---|
| **Setup time** | ~2 hours | ~5-7 hours | ~8-12 hours | ~3-4 hours |
| **Monthly cost** | $0 | $0 | $13-20 | $0 (or $25 Pro) |
| **Realtime sync** | ❌ (polling) | ❌ (polling) | ❌ (polling) | ✅ (websockets) |
| **Database type** | Redis KV | PostgreSQL | PostgreSQL | PostgreSQL |
| **Schema/migrations** | None needed | Prisma schema | Prisma schema | SQL migrations |
| **Relational queries** | ❌ | ✅ | ✅ | ✅ |
| **Migration effort** | Minimal | Moderate | Moderate | Moderate |
| **Own infra** | ❌ | ❌ | ✅ | ❌ |
| **Ecosystem fit** | Vercel | Vercel | AWS | Standalone |
| **Production-ready** | Partial | ✅ | ✅ | ✅ |
| **Inactivity issues** | None | None | None | Pauses on free |

---

## 6. Data Migration Strategy

Regardless of which option is chosen, the migration path from `localStorage` is:

### Phase 1 — Data Export (browser)
```js
// Run in browser console on each device before migration
const backup = {
  clientes:   JSON.parse(localStorage.getItem('clientes') || '[]'),
  vehiculos:  JSON.parse(localStorage.getItem('vehiculos') || '[]'),
  inventario: JSON.parse(localStorage.getItem('inventario') || '[]'),
  trabajos:   JSON.parse(localStorage.getItem('trabajos') || '[]'),
};
console.log(JSON.stringify(backup, null, 2));
// Copy output → save to backup.json
```

### Phase 2 — Import to Cloud
- **Vercel KV:** POST to `/api/migrate` with the JSON blob → KV.set per collection
- **Postgres/Supabase:** Transform JSON → SQL INSERTs (small Node script, ~50 lines) → run in DB console

### Phase 3 — Frontend Swap (the actual work)
Replace every `localStorage.getItem/setItem` call with `fetch('/api/...')` calls.
The component state management stays identical — only the data fetching/persistence layer changes.

```js
// BEFORE (localStorage)
const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
localStorage.setItem('clientes', JSON.stringify([...clientes, nuevo]));

// AFTER (API)
const { data: clientes } = await fetch('/api/clientes').then(r => r.json());
await fetch('/api/clientes', { method: 'POST', body: JSON.stringify(nuevo) });
```

### Phase 4 — Parallel Run (safety net)
Keep localStorage writes active for 1 week post-migration. If cloud fails, data is still locally available. Remove localStorage writes after stability is confirmed.

---

## 7. API Route Structure (all options except pure Supabase client)

```
/api
  /migrate          POST  — one-time bulk import from localStorage JSON
  /clientes
    /               GET   — list all
    /               POST  — create one
    /:id            PUT   — update (future)
    /:id            DELETE — delete (future)
  /vehiculos
    /               GET
    /               POST
    /:id            PUT
  /inventario
    /               GET
    /               POST
    /:id            PATCH — update stock (receive shipment)
    /:id            PUT   — update full record
  /trabajos
    /               GET   — includes partes, pagos, manoDeObraItems
    /               POST  — create with nested partes + labor items
    /:id/pagos      POST  — register payment (append pago)
    /:id            PUT   — update (future)
```

All routes return:
```json
{ "data": [...], "error": null }
// or
{ "data": null, "error": "message" }
```

---

## 8. Auth Considerations

**For now: no auth needed.** This is a single-shop internal tool.

The "security" posture for MVP:
- API routes are open but obscure (no secret URLs needed since data isn't sensitive PII)
- For Supabase: disable RLS OR create a single service-role policy that allows all operations
- If needed later: add a simple `?key=SHOP_SECRET` query param check in API routes (not for real security, just to prevent accidental public access)

**Future:** If they want multiple employees with logins, Supabase Auth is already included and can be added without changing the database schema.

---

## 9. Recommendation

### For immediate MVP (demo sync today): **Option 4 — Supabase**

**Reasoning:**
1. **Realtime is the killer feature** — when the dad registers a pago on his phone, the mechanic's tablet updates in ~1 second without any refresh. This is the experience they actually want, not just "it syncs when you reload."
2. **3-4 hours to working sync** — faster than Vercel Postgres, far faster than AWS RDS
3. **Same Postgres schema** as Options 2 and 3 — if they decide to migrate to AWS RDS or Vercel Postgres later, the schema is identical and the migration is 30 minutes
4. **Free tier is real** — 500MB is enough for years of this shop's data. The inactivity pausing only applies to free tier; a $25/month Pro subscription eliminates it (and they can defer that decision)
5. **Dashboard visibility** — Supabase's table editor lets non-technical users browse and even manually correct data if needed

### If they want to stay 100% in Vercel: **Option 2 — Vercel Postgres**
- Same Postgres underneath, same schema
- No inactivity pausing concerns
- Slightly more setup but all stays in the Vercel dashboard

### Do NOT recommend for this use case:
- **Option 1 (Vercel KV):** Redis is wrong for this data model. Concurrent writes on a shop floor (two people saving jobs simultaneously) will cause data loss. The simple document structure will need to change as soon as they want any real query.
- **Option 3 (AWS RDS):** The VPC/networking complexity between Vercel and AWS adds 4-5 hours of DevOps work for zero user-facing benefit. The monthly cost adds up. Revisit only if they move entirely to AWS hosting.

---

## 10. Proposed Implementation Order (once option is chosen)

1. **Set up database** (30 min) — create project, run schema SQL
2. **Write migration script** (1 hour) — Node script: localStorage JSON → SQL INSERTs
3. **Create API routes** (1-2 hours) — CRUD endpoints, deploy to Vercel
4. **Update frontend** (1-2 hours) — replace localStorage calls with fetch, add loading states
5. **Add realtime** (30 min, Supabase only) — subscribe to changes in main `useEffect`
6. **Migration day** — export localStorage from active device → run migration script → verify → remove localStorage fallback after 1 week

**Total:** 3-5 hours (Supabase) · 5-7 hours (Vercel Postgres) · 8-12 hours (AWS RDS)

---

*Spec ready for review. Once option is approved, implementation can begin immediately.*
