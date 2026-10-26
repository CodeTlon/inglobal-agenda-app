# Deployment — InGlobal Agenda (mobile)

Estado real verificado el 2026-08-05. Esto documenta lo que hay, no un plan aspiracional.

## Backend

La app no tiene backend propio — pega contra `inglobal-site` (Next.js, repo separado: `CodeTlon/inglobal-site`), endpoints `/api/agenda/*` y `/api/tv-pair/*`.

- **Producción:** `EXPO_PUBLIC_API_BASE_URL=https://inglobal.51.91.253.54.sslip.io` (Coolify; lo fija `eas.json`, perfil `production`; `preview` apunta a `https://inglobal-test.51.91.253.54.sslip.io`). Al pasar a `gruasinglobal.com` hay que cambiar esa URL y sacar un build nuevo: se compila dentro del binario.
- **Despliegue del sitio:** Coolify (rama `main` = producción con deploy automático; `test` = homologación). Vercel quedó fuera de uso a propósito tras la migración (ya no es referencia). Cada push a `main` de `inglobal-site` redespliega producción; confirmarlo con `GET /api/health` (cambia `started_at`).
- Ojo con las env vars del sitio (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `S3_*`): el despliegue sube el código pero no avisa si quedaron apuntando a otra base. Si empieza a dar 401 sin razón aparente, revisar `BETTER_AUTH_URL`/`BETTER_AUTH_SECRET` del sitio.

## EAS — identidad del proyecto

```
owner:         codetlon
slug:          inglobal-app
projectId:     d3b93c02-aadf-4f1a-acf5-a4920d5ef4fb
bundleId/pkg:  com.gruasinglobal.agenda   (mismo para iOS y Android)
```

`eas whoami` ya queda autenticados en esta máquina — no hace falta login de nuevo salvo en una máquina nueva.

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

## Bugs conocidos (histórico, por si vuelven a aparecer)

- `expo-secure-store` no tiene implementación en Node — crasheaba el dev server entero al bootear porque `web.output: "static"` hace que Expo Router prerenderice un bundle SSR en Node, y el storage adapter de Supabase lo llamaba sin guardarse. Fix: `Platform.OS !== 'web'` antes de tocar `SecureStore`, con fallback a `localStorage`/no-op. (`src/lib/supabase.ts`)
- (Histórico, ya no aplica) El pairing de TV usaba `verifyOtp` de Supabase; desde `inglobal-site` v2.0.0 el pairing va por la API propia, sin magic link.

## PENDIENTE — build iOS a TestFlight (2026-10-22)

El código está listo (tsc 0, lint limpio, apunta a producción) pero **no hay build en TestFlight todavía**. Los builds 9, 10 y 11 de EAS (`--profile production`) fallan en Xcode:

> provisioning profile doesn't include the Push Notifications capability / `aps-environment` entitlement

- **Causa:** el perfil de aprovisionamiento de Apple (creado antes de usar `expo-notifications`) no tiene Push Notifications. Sacar el plugin de `app.json` NO sirve: el SDK lo agrega solo por tener el paquete instalado (probado en el build 11, revertido en `bc9619e`).
- **Falta:** regenerar el perfil con Push (y la APNs key si no existe). Requiere auth de Apple:
  - `npx eas credentials -p ios` (en la terminal del usuario). Si falla con "iTunes service key is empty": borrar `%USERPROFILE%\.app-store`, apagar VPN/Tailscale y reintentar; o
  - usar una App Store Connect API key (rol Admin: `.p8` + Key ID + Issuer ID) para hacerlo sin login interactivo.
- **Después:** `npx eas build --platform ios --profile production --non-interactive --auto-submit --no-wait` (siguiente build #12; ASC App ID `6810508533` ya configurado en `eas.json`) y verificar que aparezca en TestFlight.
- **Otros pendientes menores:** variable EAS `EXPO_PUBLIC_API_BASE_URL` sigue con la URL vieja de Vercel en los 3 entornos (el perfil `production` de `eas.json` la pisa); `npm uninstall -g expo-cli`; probar push y control remoto de TV en dispositivos reales; entorno test de Coolify (`inglobal-test…`) devolvía 503.

## Probar el diseño de los avisos sin build de Apple (2026-10-23)
En Perfil aparece la tarjeta "Probar aviso (solo desarrollo)" solo si `__DEV__` es true (`npx expo start`, builds `development`); en los builds `preview` y `production` no existe. Dispara un aviso local con los textos reales del backend (`probarAviso` en `src/lib/push.ts`). No valida el envío por Expo Push/APNs: eso solo se prueba con un build nativo y el cron real. No anda en Expo Go de Android ni en web.

Avisos (2026-10-26): el ícono chico de Android (`assets/images/notification-icon.png`, silueta blanca 96x96 del emblema) y el color `#1C357F` se configuran en el plugin `expo-notifications` de `app.json`; son configuración nativa, así que se ven recién en un build nuevo. En iOS el aviso muestra el ícono de la app. El formato del texto lo arma el backend (`lib/notificaciones.ts` en inglobal-site); `probarAviso` usa textos de ejemplo con el mismo formato.
