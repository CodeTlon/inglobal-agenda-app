# Deployment — InGlobal Agenda (mobile)

Estado real verificado el 2026-08-05. Esto documenta lo que hay, no un plan aspiracional.

## Backend

La app no tiene backend propio — pega contra `inglobal-site` (Next.js, repo separado: `CodeTlon/inglobal-site`), endpoints `/api/agenda/*` y `/api/tv-pair/*`.

- **Producción:** `EXPO_PUBLIC_API_BASE_URL=https://inglobal-site-theta.vercel.app` (ver `.env.local`, no está trackeado en git).
- El repo **sí** está conectado a Vercel (`productionBranch: main`) — cada push a `main` dispara un deploy a producción solo. Verificado el 05/08/2026 contra la API de Vercel (`GET /v9/projects/inglobal-site` → `link.type: github`, y varios deploys recientes con `source: git`). La nota anterior de "deploy manual, sin integración" estaba desactualizada. Detalle en `inglobal-site/docs/deployment-guide.md`.
- Ojo con las env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`): el auto-deploy sube el código, pero **no** te avisa si las env vars de Vercel quedaron apuntando a un proyecto de Supabase viejo — eso pasó el 05/08/2026 y rompió el login de la app mobile en silencio (401 en todos los endpoints autenticados) hasta que se corrigieron a mano. Si algo empieza a dar 401 en prod sin razón aparente, comparar `vercel env pull` contra el `.env.local` del repo mobile.

## EAS — identidad del proyecto

```
owner:         codetlon
slug:          inglobal-app
projectId:     d3b93c02-aadf-4f1a-acf5-a4920d5ef4fb
bundleId/pkg:  com.gruasinglobal.agenda   (mismo para iOS y Android)
```

`eas whoami` / `vercel whoami` ya quedan autenticados en esta máquina — no hace falta login de nuevo salvo en una máquina nueva.

## Camino 1 — Testing remoto sin build nativo (EAS Update)

Esto es lo que hay activo hoy. Publica el JS a los servers de Expo, se abre desde **Expo Go** (gratis, App Store/Play Store) sin depender de que corra nada localmente.

- Canal: **`preview`** (creado y linkeado a la branch `preview` con `eas channel:create`).
- Link fijo para el equipo (no cambia entre publicaciones):
  ```
  exp://u.expo.dev/d3b93c02-aadf-4f1a-acf5-a4920d5ef4fb?channel-name=preview
  ```
- Para republicar después de cambios:
  ```bash
  eas update --branch preview --message "descripción del cambio"
  ```
- **Límite 1:** solo sirve mientras no se agregue un módulo nativo fuera del set que trae Expo Go de fábrica. El día que haga falta uno, esto deja de alcanzar y hay que pasar al Camino 2.
- **Límite 2 (desde el 12/05/2026, cambio de Expo):** Expo Go ya **no** deja abrir un proyecto de EAS Update a cualquiera — quien abre el link tiene que estar logueado en la app de Expo Go con una cuenta que sea dueña o **miembro de la org `codetlon`** en expo.dev. Sin eso tira un error genérico ("Something went wrong / Sorry about that...") que no dice nada sobre permisos — fácil de confundir con un bug de red o de la app. O sea: ya **no es un link público para cualquiera**, hay que invitar a cada persona a `expo.dev/accounts/codetlon/settings/members` antes de que pueda probar.
- El dashboard de EAS (`expo.dev/accounts/codetlon/projects/inglobal-app/...`) también pide esa misma membresía.

## Camino 2 — Build nativo real, sin tienda (para cuando Camino 1 no alcance)

- **Android:** `eas build --platform android --profile preview` (ajustar `eas.json` para `"buildType": "apk"` si se quiere un `.apk` instalable directo por archivo, en vez de `.aab`) → se comparte el link de descarga, se instala tocando el archivo. Sin costo, sin Play Console.
- **iOS:** no hay forma de evitar la cuenta de Apple Developer ($99/año) — es una restricción de la plataforma, no algo que EAS pueda sortear. Con la cuenta: build `ad-hoc` (requiere registrar los UDID de cada iPhone) o subir a **TestFlight** (sin límite de dispositivos, instala por invitación, sin review público).
  - Ojo: el perfil `preview` de `eas.json` (`distribution: "internal"`, sin override de `ios`) genera un IPA **ad-hoc** — no llega a TestFlight aunque el nombre coincida con el canal de Camino 1. Para TestFlight hay que usar el perfil `production` (`distribution` sin setear = `"store"` por default) y `eas build --platform ios --profile production` + `eas submit --platform ios`.

## Camino 3 — Tiendas públicas (App Store / Play Store)

### Ya hecho (código)
- ✅ `ios.bundleIdentifier` / `android.package` seteados (`com.gruasinglobal.agenda`).
- ✅ `eas.json` con perfiles `development` / `preview` (internal) / `production`.
- ✅ Permiso `RECORD_AUDIO` sacado (Android y iOS) — no se usa audio en la app, `expo-camera` lo pedía por defecto (`recordAudioAndroid`, aparte de `microphonePermission` que es solo iOS).
- ✅ `npx expo-doctor` → 18/18 checks OK.

### Falta (cuentas y contenido — no es código)
1. Apple Developer Program, $99/año.
2. Google Play Console, $25 pago único.
3. Privacy policy pública (obligatoria en ambas tiendas — la app pide cámara y tiene login). No existe todavía.
4. Ficha de tienda: descripción, screenshots, categoría, clasificación de edad — contenido a decidir, no soy quien debe inventarlo.
5. `eas build --profile production` + `eas submit` en cada plataforma. Apple: 1-3 días de review. Google: generalmente más rápido.

### Antes de ir a producción pública
Dado que es una herramienta interna (operarios de la empresa, no público general), vale la pena confirmar que **listado público** es realmente lo que se quiere — la alternativa (TestFlight interno + Play Internal Testing indefinido, sin pasar nunca a "producción" pública) evita el review completo de Apple y no expone la app a búsquedas de cualquiera. Es una decisión de negocio, no técnica.

## Bugs reales encontrados y arreglados hoy (por si vuelven a aparecer)

- `expo-secure-store` no tiene implementación en Node — crasheaba el dev server entero al bootear porque `web.output: "static"` hace que Expo Router prerenderice un bundle SSR en Node, y el storage adapter de Supabase lo llamaba sin guardarse. Fix: `Platform.OS !== 'web'` antes de tocar `SecureStore`, con fallback a `localStorage`/no-op. (`src/lib/supabase.ts`)
- `verifyOtp` de Supabase no acepta `token_hash` + `email` juntos en la misma llamada — tirar los dos rompe el pairing de TV en silencio (redirect a `?error=1` sin loggear nada). (`inglobal-site/app/api/tv-pair/exchange/route.ts`)
