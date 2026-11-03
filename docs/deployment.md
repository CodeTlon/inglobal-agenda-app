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

- `expo-secure-store` no tiene implementación en Node — crasheaba el dev server entero al bootear porque `web.output: "static"` hace que Expo Router prerenderice un bundle SSR en Node, y el storage adapter de Supabase lo llamaba sin guardarse. Fix: `Platform.OS !== 'web'` antes de tocar `SecureStore`, con fallback a `localStorage`/no-op. (hoy en `src/lib/auth.ts`, `readItem`/`writeItem`; Supabase ya no se usa)
- (Histórico, ya no aplica) El pairing de TV usaba `verifyOtp` de Supabase; desde `inglobal-site` v2.0.0 el pairing va por la API propia, sin magic link.

## iOS en TestFlight (actualizado 2026-11-03)

Funciona: los builds de producción llegan a TestFlight solos.

- **Comando:** `npx eas build --platform ios --profile production --non-interactive --auto-submit --no-wait`. El envío usa la App Store Connect API key guardada en EAS (ASC App ID `6810508533`), sin login interactivo de Apple.
- **Builds:** #13, #14 y #16 (2026-10-23/27) y #17 (2026-11-03, fix de sesión en iOS) terminaron y se subieron. Los #9 a #12 fallaban porque el perfil de aprovisionamiento no tenía Push Notifications. Ya se regeneró con Push, así que ese error no debería volver.
- **Estado del envío a Apple:** la CLI de EAS no tiene un comando para verlo. Se ve en el link "Submission details" que imprime el build, o en el dashboard de EAS.
- **Cambios solo de JS:** no hace falta build. `npx eas-cli update --channel production --environment production --platform all --message "..."` les llega a los builds instalados con la misma `runtimeVersion` (política `appVersion`: `1.0.0` hasta el build 17 con SDK 57, `1.1.0` desde el paso a SDK 58; un update solo les llega a los builds de su misma versión). El teléfono lo baja al abrir la app y lo aplica en la apertura siguiente. En modo no interactivo `--environment` es obligatorio.
- **Variable de EAS `EXPO_PUBLIC_API_BASE_URL` en `production`:** verificada el 2026-11-03, apunta a `https://inglobal.51.91.253.54.sslip.io`. `development` y `preview` no se revisaron.
- **Otros pendientes menores:** `npm uninstall -g expo-cli`; probar push y control remoto de TV en dispositivos reales; el entorno test de Coolify (`inglobal-test…`) devolvía 503.

Avisos (2026-10-26): el ícono chico de Android (`assets/images/notification-icon.png`, silueta blanca 96x96 del emblema) y el color `#1C357F` se configuran en el plugin `expo-notifications` de `app.json`; son configuración nativa, así que se ven recién en un build nuevo. En iOS el aviso muestra el ícono de la app. El formato del texto lo arma el backend (`lib/notificaciones.ts` en inglobal-site);

## Pantalla de carga y cambio de sección (actualizado 2026-11-03)
- **Inicio** (`PantallaCarga`, `src/components/PantallaCarga.tsx`): sin video. Fondo navy (el mismo del splash nativo) con dos aros muy tenues que respiran, el logo oficial "GRÚAS INGLOBAL S.R.L." grande, una línea de acento y "AGENDA" debajo (Manrope, espaciado ancho), más una barra de progreso. Mínimo 1,8 s en pantalla. Ya no espera a la red: con un usuario guardado la sesión se usa al instante y se valida por detrás (`loadSessionRapida` en `src/lib/auth.ts`), y las fotos de los catálogos se bajan al caché sin frenar la carga (`src/lib/precarga.ts`). Sale con un fundido de 450 ms.
- **Entre secciones:** fundido de 300 ms propio de las pestañas (`animation: 'fade'` en `src/app/(tabs)/_layout.tsx`), sin bloquear toques. Reemplaza al velo navy con el logo (`VeloCarga`), que tapaba al menos 1,5 s cada cambio.
- Se eliminó el video del hero y el módulo nativo `expo-video`: ya no hace falta un build nuevo para ver estas pantallas.

## Auditoría 2026-11-03
Informe en `inglobal-site/.ai/context/AUDITORIA_2026-11-03.md` (app: caché de la agenda, arranque, peso, vista Día, formulario, código de verificación de la TV).

## Auditoría 2026-10-26
Informe completo en `inglobal-site/.ai/context/AUDITORIA_2026-10-26.md`; capturas de la app en 5 tamaños (320, 360, 390, 430 y 768 px, web exportada) en `screenshots/auditoria/`. Pendientes de la app: barra de pestañas sin margen inferior en teléfonos sin barra de gestos, teclado en Android edge-to-edge, día y contador pisados a 320 px, botón "+" tapando contenido, nombres de catálogo cortados y tope de escalado de fuente.

Actualización 2026-10-26 (correcciones de la auditoría): barra de pestañas con margen inferior mínimo de 8 (`abajoBarra`), tope de escalado de fuente (`maxFontSizeMultiplier` 1,4 en `Text`, 1,15 en las pestañas), `KeyboardAvoidingView` con `behavior="padding"` en las dos plataformas (Android es edge-to-edge), celda del mes con menos padding y contador de 10 px, fila de catálogo con el nombre en hasta 2 líneas y el estado debajo, botón flotante más chico y con 104 px de aire al final de las listas. Verificado en la web exportada a 320, 360, 390, 430 y 768 px (sin desborde, `screenshots/auditoria/`). **Sin verificar:** el teclado en Android real (cambio de `behavior`) y las safe areas reales.

Tablets (2026-10-26): el layout raíz (`src/app/_layout.tsx`) centra la app en una columna de hasta 720 px sobre fondo neutro; en teléfonos ocupa todo el ancho. Verificado en la web exportada a 768 px y en los otros cuatro tamaños (sin desborde).

Correcciones de uso real (2026-10-26):
- **Scroll vertical en la vista Semana:** el `Gesture.Pan()` que cambia de semana se quedaba con cualquier toque y le robaba el scroll al `ScrollView`. Ahora solo se activa con un arrastre horizontal de 20 px (`activeOffsetX`) y falla si el dedo se mueve 15 px en vertical (`failOffsetY`). En la versión web (solo vista previa) el gesto está desactivado. Verificado con eventos táctiles reales en la web exportada (0 → 179 → 0 px); el comportamiento nativo depende de los umbrales de react-native-gesture-handler y **sin verificar en un teléfono**.
- **Teclado abierto y toques perdidos:** los `ScrollView` de formularios y listas de catálogo llevan `keyboardShouldPersistTaps="handled"`; antes el primer toque en "Guardar" o en un selector solo cerraba el teclado.
- **Sesión:** `credentials: 'omit'` en todas las llamadas (auth, API y subida de fotos). El servidor devuelve una cookie al iniciar sesión y, si el teléfono la reenviaba sin `Origin`, el sign-out daba 403 y la sesión quedaba viva en el servidor.
- **Pantalla de carga:** rehecha el mismo día sin video (ver "Pantalla de carga y velo entre secciones" más arriba).
