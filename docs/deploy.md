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

Los nombres de objeto deben coincidir con `^[a-z0-9-]+\.svg$` (el route las valida).
`migrations/0006_seed_team_logos.sql` es la referencia del mapeo inicial (Emerge id 1,
Grayos id 4).