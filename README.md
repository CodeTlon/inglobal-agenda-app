# InGlobal Agenda (mobile)

App Expo (React Native, Expo Router, NativeWind) para Grúas InGlobal — gestiona la Agenda
(eventos, grúas, empresas, operarios) y el CMS del sitio (clientes, servicios) desde el celular.
Es un cliente HTTP puro de la API en `app/api/**` del repo `inglobal-site` (Route Handlers que
reexportan la misma lógica de negocio que usa el dashboard web — ver `lib/agenda-business.ts`
allá), autenticado con la sesión de Supabase Auth del propio dispositivo (Bearer JWT).

No hay pantalla de registro: las cuentas se crean a mano desde `/dashboard/usuarios` en el
sitio web, igual que hoy.

## Setup

```bash
npm install
cp .env.example .env.local   # completar con los mismos valores que inglobal-site (dev o prod)
npx expo start
```

Variables (`EXPO_PUBLIC_*`, van al bundle — mismo nivel de confianza que `NEXT_PUBLIC_*` en el sitio):

- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — mismos valores que `inglobal-site` (dev o prod según con qué Supabase quieras probar).
- `EXPO_PUBLIC_API_BASE_URL` — origin del sitio Next.js desplegado (ej. rama `dev` en Vercel Preview, o `https://gruasinglobal.com` en prod).

## Estructura

```
src/
  app/
    (auth)/login.tsx              Login (Supabase Auth, sin registro)
    (tabs)/
      agenda/                      Calendario (día seleccionado + tira semanal) + alta/edición de eventos
      catalogos/                   Grúas / Empresas / Operarios (alta, edición, activo/inactivo, borrado)
      clientes/                    CRUD de clientes destacados del sitio (con logo)
      servicios/                   CRUD de servicios del sitio (con imagen)
      perfil/                      Sesión + "Vincular TV" (pairing QR)
  lib/
    supabase.ts                    Cliente Supabase con sesión persistida en expo-secure-store
    api.ts                         Wrapper fetch + Bearer JWT hacia app/api/** de inglobal-site
    agenda-view.ts                 Copiado 1:1 de inglobal-site/lib/agenda-view.ts (mismo criterio de semana/estado visual que web y TV)
    agenda-api.ts / clientes-api.ts / servicios-api.ts   Wrappers tipados por entidad
    upload.ts                      Sube imágenes directo al bucket `media` de Supabase (bypass del API para el binario)
```

## Pairing QR (vincular una TV)

`Perfil → Vincular TV` abre la cámara y escanea el QR que muestra `/agenda-tv/pair` en el
sitio web. Aprobar el código desde el celular loguea esa TV automáticamente (sin escribir
usuario/contraseña) — ver `app/api/tv-pair/**` en `inglobal-site` para el flujo completo.

## Pendiente / no incluido en esta primera versión

- Trabajos (mini-blog por cliente, contenido rico TipTap) — sigue editándose solo desde el dashboard web.
- Cambio de contraseña in-app (si el usuario tiene `must_change_password`, la app le pide que lo haga desde el panel web).
- Build de producción (EAS) — `eas.json` ya tiene perfiles dev/preview/production (ver `docs/deployment.md`); falta crear las cuentas de Apple Developer / Google Play y correr `eas build --profile production` + `eas submit`.
