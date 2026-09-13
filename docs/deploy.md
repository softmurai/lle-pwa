# Despliegue

## Sitio web (Worker)

**Live:** https://lle-pwa.saulfdezcd.workers.dev

### Despliegue manual

```bash
npm run deploy
```

### Despliegue automático (CI)

Un push a `main` despliega web + cron de forma automática via GitHub Actions.

Requiere los secrets en GitHub:

| Secret | Descripción |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de API de Cloudflare (permisos: Workers, D1, DNS) |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta Cloudflare |

Los secrets de la worker (`IMPORT_SECRET`) **no** se sobreescriben con
`wrangler deploy` — se mantienen en la cuenta.

### Dominio personalizado

Las custom domains ahora se asignan desde el Dashboard:

1. Cloudflare Dashboard → Workers & Pages → **lle-pwa**.
2. Settings → Triggers → Custom Domains → **Add custom domain**.
3. Introduce `ligalocal.sfcnlab.com`.
4. Confirma — se crea el registro DNS automáticamente.

El dominio queda activo en pocos segundos (DNS propagado en la zona `sfcnlab.com`).

## Cron de importación (Cron Worker)

Separado del Worker principal. Se despliega con:

```bash
npm run deploy:cron
```

Requiere `IMPORT_SECRET` (el mismo que la app) via `wrangler secret put`.

## Base de datos D1

Las migraciones se aplican manualmente:

```bash
# local
npx wrangler d1 migrations apply lle_pwa

# remoto
npx wrangler d1 migrations apply lle_pwa --remote
```

En CI se ejecutan automáticamente en cada push a `main`.