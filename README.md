# VAX AQUA

CRM de campo para VAX AQUA (אביזרי הולכת מים): clientes por región, visitas, llamadas, pedidos y mapa de cobertura.

Producción: https://web-production-ab497.up.railway.app

El código que corre en Railway vive en este repositorio. El servicio `web` despliega desde `main`.

## Stack

- Next.js 16 + React 19
- Prisma + PostgreSQL
- Railway (`web` + `Postgres`)

Las APIs identifican filas por `uuid`. El `id` numérico es interno de base de datos.

## Local

```bash
cp .env.example .env
npm install
npm run db:up
npx prisma migrate deploy
npm run db:seed
npm test
npm run dev
```

Postgres local queda en `localhost:5433` (ver `docker-compose.yml`).
