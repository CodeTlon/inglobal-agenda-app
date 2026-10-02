# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# InGlobal Agenda (app móvil)

App Expo (Expo ~57, React Native 0.86, React 19, NativeWind 4, Expo Router) para Grúas InGlobal S.R.L.
Gestiona la **agenda de servicios**: eventos, grúas, empresas y operarios. Es un cliente HTTP de la API
del repo hermano `inglobal-site` (`app/api/agenda/**`, `app/api/tv-pair/**`); no tiene backend propio.
Detalle de setup, estructura y pairing de TV en `README.md`; build y deploy en `docs/deployment.md`.

## Comandos
- `npx expo start` — desarrollo (Expo Go tiene límites, ver `docs/deployment.md`).
- `npm run lint` — `expo lint`. No hay tests automatizados.
- `npx tsc --noEmit` — chequeo de tipos.
- `eas update` / `eas build` — ver `docs/deployment.md`.

## Arquitectura en una mirada
- Auth: Supabase Auth en el dispositivo; cada request a la API lleva `Authorization: Bearer <JWT>` (`src/lib/api.ts`).
  Cuenta única: no hay roles de usuario. Las cuentas se crean desde `/dashboard/usuarios` del sitio.
- Datos: toda lectura/escritura pasa por `src/lib/agenda-api.ts`. Los tipos viven en `src/lib/types.ts`.
  El backend (`inglobal-site`) es la fuente de verdad del esquema y de las reglas de negocio.
- Imágenes: se suben directo al bucket `media` de Supabase (`src/lib/media-upload.ts`).
- Vistas de agenda: mes, semana y día en `src/components/agenda/*` y `src/app/(tabs)/agenda/index.tsx`;
  helpers compartidos en `src/lib/agenda-view.ts`.

## Modelo de dominio (lo que no se deduce rápido del código)
- **Empresas** tienen `tipo`: `frecuente` o `particular`. En Catálogos se muestran en dos sub-pestañas.
  `contacto` y `telefono` son opcionales.
- **Operarios** tienen `roles` (lista FIJA: Gruista, Hidrogruista, Ayudante, Carretonero) y teléfono opcional.
  Eliminar un operario es **baja lógica** (`eliminado_at`): pasa a la vista "Ex operarios" y se conserva en el
  historial de eventos. Para editar la lista de roles hay que cambiar `ROLES_OPERARIO` en ambos repos.
- "roles" tiene dos significados: el rol de usuario `trabajador` (ya eliminado) y los roles de operario (vigentes).
- Estados de evento: `reserva`, `programado`, `en_curso`, `finalizado`, `cancelado`. Una reserva vencida se
  muestra como cancelada (`getEstadoVisual`).

## Entornos
Tres entornos, definidos en `inglobal-site/.ai/context/ENVIRONMENTS.md` (fuente de verdad):
desarrollo (Supabase local, rama `dev`), homologación (rama `test`, perfil EAS `preview`, pendiente de definir) y
producción (rama `main`, perfil `production`). Flujo: `dev` → `test` → `main`. **Se trabaja en `dev`**; no commitear directo a `main` (producción).
Plantillas de variables: `.env.staging.example` y `.env.production.example`.

### Entorno local
1. En `../inglobal-site`: `npm run db:local:up` y `npm run dev:local`.
2. En esta app: `npm run start:local` (celular físico en el mismo Wi-Fi) o `npm run start:local -- --emulator` (Android).
   Inyecta las URLs locales sin tocar tu `.env.local` y se niega a correr si el Supabase no es local.
3. Cuentas de prueba y datos del seed: `inglobal-site/.ai/context/ENVIRONMENTS.md` (todo lo ficticio lleva el prefijo `ZZ-PRUEBA`).

## Gotchas
- **Fin de jornada por defecto (`hora_fin` vacío):** esta app usa 18:00 para el estado visual y 23:59 para
  ubicar el evento por día; `inglobal-site` usa 23:59. Divergencia vigente y deliberada; no la unifiques sin decidirlo.
- Cambios de esquema (migraciones) se hacen en `inglobal-site/supabase/migrations`; acá solo se adaptan tipos y UI.
- El `.env.local` apunta al mismo proyecto Supabase que el sitio (puede ser producción): no crear ni borrar datos
  de prueba sin limpiarlos.

## Más contexto
Decisiones, estado actual, issues conocidos y preguntas abiertas de ambos repos: `../inglobal-site/.ai/context/`
(`DECISIONS.md`, `CURRENT_STATE.md`, `KNOWN_ISSUES.md`, `OPEN_QUESTIONS.md`). Este repo no duplica esa información.
