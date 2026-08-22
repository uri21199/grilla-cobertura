# grilla-cobertura

App interna para coordinar la disponibilidad de militantes para cubrir **"la mesita"** (presencia física en un stand de la Facultad de Ingeniería, UBA). Proyecto separado de `pasadas-fiuba`, aunque comparte stack y convenciones.

## Flujo

1. Un admin carga, una vez por cuatrimestre, la lista de militantes con su mail y su grilla personal de cursada.
2. El admin define el eje de la semana cuando cambia.
3. Cada noche, un job busca militantes que cursan al día siguiente y todavía no tienen notificación para esa fecha, y les manda un mail con dos links: "Sí, puedo" / "No puedo".
4. Esos links llevan a `/confirmar/:token`, una página **pública sin login**, identificada solo por un token único por notificación.
5. Si elige "Sí", carga un horario específico (desde/hasta) y confirma. Puede volver a entrar y cambiar su respuesta mientras quiera.
6. La pantalla de Resumen (interna) muestra la cobertura de cada día.

## Seguridad: por qué la página pública no usa la anon key

Las políticas de RLS de Supabase están abiertas (mismo criterio que el resto de la app: sin Auth individual, protegido por una clave compartida a nivel frontend). Eso significa que la anon key puede leer la tabla completa de `militantes` (nombres y mails de todos).

Por eso `/confirmar/:token` **no** le pega directo a Supabase: le pega a `netlify/functions/confirmar.ts`, que corre server-side con la **service role key** (nunca expuesta al cliente), busca la fila por token, y devuelve/actualiza solo esos datos.

## Stack

- React 19 + Vite + TypeScript + Tailwind CSS v4
- Supabase (Postgres) — sin Auth individual, RLS abierto para el rol anónimo (uso interno)
- Netlify Functions (la función de confirmación) + Netlify Scheduled Functions (job nocturno)
- SendGrid para el envío de mails
- Deploy en Netlify

## Setup local

```bash
npm install
cp .env.example .env.local   # completar credenciales de Supabase, claves de acceso, SendGrid
npm run dev                  # solo frontend
npx netlify-cli dev          # frontend + functions juntos, como en producción
```

## Variables de entorno

| Variable | Alcance | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | cliente | Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | cliente | anon public key |
| `VITE_APP_PASSWORD` | cliente | Clave compartida para la parte interna |
| `VITE_ADMIN_PASSWORD` | cliente | Clave separada para `/admin` |
| `SUPABASE_URL` | servidor | Igual que `VITE_SUPABASE_URL`, sin prefijo `VITE_` |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | Service role key — solo la usan las Netlify Functions |
| `SENDGRID_API_KEY` | servidor | Para el job nocturno de envío de mails |
| `SENDGRID_FROM_EMAIL` | servidor | Remitente de los mails |

Las variables `VITE_*` se inyectan en el **build**; las de servidor las usan las Netlify Functions en runtime (configurarlas en Netlify: *Site configuration → Environment variables*).

## Base de datos

Schema en `supabase/migrations/001_init.sql`, corrido a mano en el SQL Editor de Supabase (mismo proyecto que `pasadas-fiuba`). Tablas: `militantes`, `cursada_militante`, `ejes_semanales`, `notificaciones_mesita`. Vista `vista_cobertura_dia` para la pantalla de Resumen.

## Estado

- [x] Scaffolding (React + Vite + Tailwind + Supabase + gates de clave compartida)
- [x] Función serverless de confirmación por token + página pública `/confirmar/:token`
- [x] Pantalla de Resumen (`vista_cobertura_dia`, filtro Día/Semana)
- [x] Admin (militantes, cursada, trabajo, eje semanal)
- [x] Job nocturno + envío de mails (SendGrid) — `netlify/functions/notificar-nocturno.ts`, corre 21:00 ART

Deploy en producción: **https://grilla-cobertura.netlify.app**
