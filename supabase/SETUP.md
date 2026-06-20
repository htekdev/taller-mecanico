# Supabase setup

## 1) Run the schema
1. Open your Supabase project dashboard.
2. Go to **SQL Editor** → **New query**.
3. Paste the full contents of `supabase/schema.sql`.
4. Run it.
5. In **Database → Replication**, enable realtime for:
   - `clientes`
   - `vehiculos`
   - `refacciones`
   - `trabajos`
   - `proveedores`
   - `ordenes_compra`
   - `facturas`

## 2) Configure env vars in Vercel
Add these project environment variables in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MIGRATE_SECRET`

`NEXT_PUBLIC_*` values are safe for the browser. `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.

## 3) Pull env vars locally
From the repo root/worktree:

```powershell
vercel env pull .env.local
```

## 4) Export current localStorage data from the browser
Open the app in the browser, then run this in DevTools console:

```javascript
JSON.stringify({
  clientes: JSON.parse(localStorage.getItem('clientes') || '[]'),
  vehiculos: JSON.parse(localStorage.getItem('vehiculos') || '[]'),
  inventario: JSON.parse(localStorage.getItem('inventario') || '[]'),
  trabajos: JSON.parse(localStorage.getItem('trabajos') || '[]'),
  proveedores: JSON.parse(localStorage.getItem('proveedores') || '[]'),
  ordenes: JSON.parse(localStorage.getItem('ordenes') || '[]'),
  facturas: JSON.parse(localStorage.getItem('facturas') || '[]'),
})
```

Copy the resulting JSON.

## 5) Run the one-time migration
Send the exported JSON to `/api/migrate` with the `x-migrate-secret` header.

### PowerShell example
```powershell
$body = Get-Content .\migration-data.json -Raw
Invoke-RestMethod \
  -Method POST \
  -Uri "https://YOUR-VERCEL-URL/api/migrate" \
  -Headers @{ "x-migrate-secret" = "YOUR_MIGRATE_SECRET" } \
  -ContentType "application/json" \
  -Body $body
```

### curl example
```bash
curl -X POST "https://YOUR-VERCEL-URL/api/migrate" \
  -H "Content-Type: application/json" \
  -H "x-migrate-secret: YOUR_MIGRATE_SECRET" \
  --data-binary @migration-data.json
```

## Notes
- During transition, writes continue to both Supabase and localStorage.
- If Supabase env vars are missing, the app automatically falls back to localStorage.
- `/api/migrate` uses the service role key and should only be used for the one-time import.
