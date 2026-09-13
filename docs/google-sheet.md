# Google Sheets: plantilla de datos

La web lee los datos de una hoja de cálculo publicada como CSV. Este documento
explica cómo crear la hoja y cómo la importación consume los datos.

## Estructura esperada (una fila por jugador y partido)

El importador requiere exactamente estas 16 columnas, en este orden:

| Columna | Descripción |
|---|---|
| `week` | Jornada (número) |
| `date` | Fecha del partido (formato `YYYY-MM-DD`) |
| `home_team` | Nombre del equipo local |
| `away_team` | Nombre del equipo visitante |
| `home_score` | Marcador del equipo local |
| `away_score` | Marcador del visitante |
| `status` | `finished` (terminado) |
| `team` | Equipo del jugador de esa fila |
| `player` | Nombre del jugador |
| `number` | Dorsal |
| `points` | Puntos |
| `2pm` | Canastas de 2 convertidas |
| `3pm` | Triples convertidos |
| `ftm` | Tiros libres convertidos |
| `fta` | Tiros libres intentados |
| `fouls` | Faltas |

Cada jugador que juega un partido tiene SU PROPIA fila: la fila se repite con
el marcador del partido y solo cambia `team`, `player`, `number` y las
estadísticas. Todos los datos van en UNA sola pestaña.

## Plantilla para pegar en la hoja

Copia las dos primeras líneas en la celda A1 de la pestaña:

```csv
week,date,home_team,away_team,home_score,away_score,status,team,player,number,points,2pm,3pm,ftm,fta,fouls
1,2026-09-19,Cebras,Vikingos,81,78,finished,Cebras,Dani Moreno,4,5,1,1,0,1,5
```

Ahí tienes el ejemplo de un jugador. Puedes arrastrar la fila hacia abajo para
copiar el formato a los demás jugadores del partido y de los siguientes.

## Pasos para publicar la hoja como CSV

1. Crea la hoja en Google Sheets (o abre una existente) y pega la plantilla en
   la celda A1.
2. Ve a **Archivo → Compartir → Publicar en la web**.
3. Pulsa **Publicado contenido y configuraciones**, elige la pestaña con los
   datos y en formato selecciona **CSV**.
4. Copia la URL que aparece (termina en `.../export?format=csv&id=...`).
5. Sustituye la URL actual en `wrangler.jsonc` en la variable `IMPORT_CSV_URL`
   y vuelve a desplegar: `npm run deploy`.

Headers opcionales: si publicas más de una hoja, asegúrate de que las demás
pestañas no salgan en la exportación (publica solo la pestaña de datos).

## Detalles técnicos

- La importación se ejecuta automáticamente cada sábado a las 20:00 de Madrid
  (cron `0 18 * * 6`; en invierno UTC pasa a `0 19 * * 6` — DST).
- También puedes lanzar la importación manualmente con un POST a `/api/import`
  con la cabecera `x-import-secret`.
- La importación es idempotente: repetir el mismo CSV no crea duplicados
  (upsert por `match_id` + `player_id`).
- Reglas de validación: el `team` de cada fila debe ser `home_team` o
  `away_team`; los marcadores deben ser numéricos; el CSV debe tener las 16
  columnas exactas.

## Datos de muestra

Mientras tanto, la web usa `public/data/sample.csv` (datos de prueba). Al
sustituir `IMPORT_CSV_URL`, la fuente real pasa a ser tu hoja.