# Despliegue

## Sitio web (Worker)

**Live:** https://ligalocal.sfcnlab.com
**Workers URL:** https://lle-pwa.saulfdezcd.workers.dev

> **Nota:** `ligalocal.sfcnlab.com` puede estar bloqueado por tu ISP (orden judicial de
> Telefónica durante partidos de La Liga). Para verificar usa
> https://lle-pwa.saulfdezcd.workers.dev.

### Despliegue manual

```bash
pnpm run deploy
```

El repo usa pnpm (ver `packageManager` en `package.json`). CI también usa pnpm.

### Despliegue automático (CI)

Un push a `main` despliega la web de forma automática via GitHub Actions.

Requiere los secrets en GitHub:

| Secret | Descripción |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de API de Cloudflare (permisos: Workers, D1, DNS) |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta Cloudflare |

### Dominio personalizado

Asignado desde el Dashboard:

1. Cloudflare Dashboard → Workers & Pages → **lle-pwa**.
2. Settings → Triggers → Custom Domains → **Add custom domain** → `ligalocal.sfcnlab.com`.
3. Se crea el registro DNS automáticamente en la zona `sfcnlab.com`.

Nota: `wrangler domains` fue eliminado en Wrangler 4.131; la vía canónica es el Dashboard.

## Base de datos D1

Las migraciones se aplican manualmente:

```bash
# local
npx wrangler d1 migrations apply lle_pwa

# remoto
npx wrangler d1 migrations apply lle_pwa --remote
```

En CI se ejecutan automáticamente en cada push a `main`.

### Calendario de temporada

El calendario real 2026/27 (56 partidos, 14 jornadas) se carga con la migración
`migrations/0015_seed_calendar.sql`, que sustituye los datos mock y deja la
clasificación a cero. Se aplica a remoto automáticamente vía CI en el push; también
existe `scripts/seed-calendar.sql` como espejo para uso local/dev.

### Secrets del Worker (admin)

El login de `/admin` lee los usuarios del secret `ADMIN_USERS` (JSON con hashes
PBKDF2-SHA256). Se genera con `scripts/gen-users.mjs` a partir de
`ADMIN_CREDENTIALS` y se sube al Worker (no al repo):

```bash
ADMIN_CREDENTIALS='{"usuario":{"password":"...","role":"admin"}}' node scripts/gen-users.mjs
npx wrangler secret put ADMIN_USERS --name lle-pwa   # pegar el JSON
```

En local se define en `.dev.vars` (gitignored). Sin el secret, el login siempre falla.

### Actualizar datos

El alta de equipos y jugadores (master data) se hace manualmente en D1. Para los
resultados, el flujo Excel→SQL (roadmap #14/#15) genera el SQL y se aplica desde la
consola de D1 de Cloudflare. Alternativa por CLI:

```bash
npx wrangler d1 execute lle-pwa --remote --file=seed.sql
```

## R2 (escudos / imágenes)

Los logos de equipo se guardan en el bucket `lle-pwa-assets` (binding `MEDIA` en
`wrangler.jsonc`) y se sirven same-origin vía `src/pages/logos/[file].ts` con cabeceras
de cache y CSP. Cada equipo apunta a su `logo_url` en D1 (`D1 Studio` o SQL).

Subir/actualizar un escudo (remoto y local para desarrollo):

```bash
npx wrangler r2 object put lle-pwa-assets/logos/emerge.svg \
  --file="/ruta/escudo.svg" --content-type=image/svg+xml --remote
npx wrangler r2 object put lle-pwa-assets/logos/emerge.svg \
  --file="/ruta/escudo.svg" --content-type=image/svg+xml --local
```

Y actualizar el `logo_url` del equipo:

```sql
UPDATE teams SET logo_url = '/logos/<archivo>.svg' WHERE id = <team_id>;
```

Los nombres de objeto deben coincidir con `^[a-z0-9-]+\.(svg|png|jpe?g|webp)$` (el route
las valida y deriva el `Content-Type` de la extensión; sin acentos ni mayúsculas). El
`--content-type` debe ser acorde: `image/svg+xml`, `image/png`, `image/jpeg` o `image/webp`.

Mapeo de escudos (`teams.logo_url`), por id de equipo:

| id | Equipo | Objeto R2 |
|---|---|---|
| 1 | Emerge Basket Club | `logos/emerge.svg` |
| 3 | Chino Hills | `logos/chino.png` |
| 4 | Grayos | `logos/grayos.svg` |
| 7 | Ruskiñol | `logos/ruskinol.svg` |
| 8 | Totonto Raptors | `logos/totonto.png` |

Referencias: `migrations/0006_seed_team_logos.sql` (Emerge, Grayos) y
`migrations/0009_seed_team_logos.sql` (Chino Hills, Ruskiñol, Totonto).