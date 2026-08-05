# Deployment — InGlobal Agenda (mobile)

Estado real verificado el 2026-08-05. Esto documenta lo que hay, no un plan aspiracional.

## Backend

La app no tiene backend propio — pega contra `inglobal-site` (Next.js, repo separado: `CodeTlon/inglobal-site`), endpoints `/api/agenda/*` y `/api/tv-pair/*`.

- **Producción:** `EXPO_PUBLIC_API_BASE_URL=https://inglobal-site-theta.vercel.app` (ver `.env.local`, no está trackeado en git).
- Ese deploy es **manual** (`vercel --prod` desde el repo de `inglobal-site`, no hay integración Git↔Vercel conectada) — si cambiaste algo del backend, no asumas que ya está en producción. Detalle en `inglobal-site/docs/deployment-guide.md`.

## EAS — identidad del proyecto

```
owner:         codetlon
slug:          inglobal-app
projectId:     3e7abcfa-9976-4f57-9960-e9983c066337
bundleId/pkg:  com.gruasinglobal.agenda   (mismo para iOS y Android)
```

`eas whoami` / `vercel whoami` ya quedan autenticados en esta máquina — no hace falta login de nuevo salvo en una máquina nueva.

## Camino 1 — Testing remoto sin build nativo (EAS Update)

Esto es lo que hay activo hoy. Publica el JS a los servers de Expo; cualquiera con **Expo Go** (gratis, App Store/Play Store) lo abre desde cualquier lado, sin depender de que corra nada localmente.

- Canal: **`preview`** (creado y linkeado a la branch `preview` con `eas channel:create`).
- Link fijo para el equipo (no cambia entre publicaciones):
  ```
  exp://u.expo.dev/3e7abcfa-9976-4f57-9960-e9983c066337?channel-name=preview
  ```
- Para republicar después de cambios:
  ```bash
  eas update --branch preview --message "descripción del cambio"
  ```
- **Límite:** solo sirve mientras no se agregue un módulo nativo fuera del set que trae Expo Go de fábrica. El día que haga falta uno, esto deja de alcanzar y hay que pasar al Camino 2.
- El dashboard de EAS (`expo.dev/accounts/codetlon/projects/inglobal-app/...`) pide login — no es compartible con gente sin cuenta en el org `codetlon`. El link `exp://u.expo.dev/...` de arriba sí es público, es el que hay que compartir.

## Camino 2 — Build nativo real, sin tienda (para cuando Camino 1 no alcance)

- **Android:** `eas build --platform android --profile preview` (ajustar `eas.json` para `"buildType": "apk"` si se quiere un `.apk` instalable directo por archivo, en vez de `.aab`) → se comparte el link de descarga, se instala tocando el archivo. Sin costo, sin Play Console.
- **iOS:** no hay forma de evitar la cuenta de Apple Developer ($99/año) — es una restricción de la plataforma, no algo que EAS pueda sortear. Con la cuenta: build `ad-hoc` (requiere registrar los UDID de cada iPhone) o subir a **TestFlight** (sin límite de dispositivos, instala por invitación, sin review público).

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
