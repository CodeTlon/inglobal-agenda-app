# App Store — ficha y respuestas de InGlobal Agenda

Todo lo que pide App Store Connect para enviar la app a revisión. Los textos respetan los límites de
caracteres de Apple. Distribución elegida: **oculta (Unlisted)**, porque es una app de uso interno.

## Información de la app

| Campo | Valor |
|---|---|
| Nombre (máx. 30) | `InGlobal Agenda` |
| Subtítulo (máx. 30) | `Agenda de grúas y operarios` |
| Categoría principal | Negocios |
| Categoría secundaria | Productividad |
| Idioma principal | Español (México) — Apple no ofrece "Español (Argentina)"; también sirve "Español (España)" |
| URL de política de privacidad | https://www.gruasinglobal.com/politica-de-privacidad |
| URL de soporte | https://www.gruasinglobal.com/contacto |
| URL de marketing (opcional) | https://www.gruasinglobal.com |
| Copyright | `2026 Grúas Inglobal S.R.L.` |
| Bundle ID | `com.gruasinglobal.agenda` (ASC App ID `6810508533`) |

### Texto promocional (máx. 170)

```
La agenda de servicios de Grúas Inglobal en tu celular: qué grúa sale, a dónde, con qué operario y a qué hora, actualizado al momento.
```

### Descripción (máx. 4000)

```
InGlobal Agenda es la herramienta interna de Grúas Inglobal S.R.L. para coordinar los servicios de grúas del día a día. Es de uso exclusivo para el personal de la empresa: las cuentas las crea la administración.

AGENDA DE SERVICIOS
• Vista de mes, semana y día para ver la carga de trabajo de un vistazo.
• Cada servicio muestra horario, cliente, ubicación, grúas y operarios asignados.
• Estados claros: reserva, programado, en curso, finalizado y cancelado.
• Crear, editar y reprogramar servicios desde el celular.

FLOTA Y EQUIPO
• Catálogo de grúas con foto, patente y capacidad, y si están disponibles u ocupadas en este momento.
• Operarios con sus roles (gruista, hidrogruista, ayudante, carretonero) y contacto.
• Empresas clientes frecuentes y particulares.

AVISOS
• Notificaciones push con los cambios de la agenda, que se pueden apagar desde Perfil.

PANTALLA DE TV
• Vinculá una TV del taller escaneando su código QR para mostrar la agenda en pantalla grande.
```

### Palabras clave (máx. 100, separadas por coma, sin espacios)

```
grúas,agenda,servicios,operarios,flota,hidrogrúa,despacho,turnos,izaje,montaje,córdoba,logística
```

### Capturas

`docs/tienda/capturas/ios-6.3/` (1206×2622, tamaño **obligatorio** desde 2026: iPhone 6,1"/6,3") e
`docs/tienda/capturas/ios-6.9/` (1320×2868, opcional, "pantalla grande"). Apple escala solas las capturas a
los demás tamaños de iPhone. No hacen falta capturas de iPad: la app no declara soporte para tablet.
Se generaron con datos ficticios del entorno local (no muestran clientes reales).

## Clasificación por edad

Responder **"Ninguno" / "No"** en todo el cuestionario (sin violencia, sin contenido sexual, sin apuestas,
sin navegador web sin restricciones, sin contenido generado por usuarios visible al público, sin chat).
Resultado esperado: **4+**.

## Privacidad de la app (etiqueta de privacidad)

- **¿Recopila datos?** Sí.
- **¿Rastreo (tracking)?** No. Sin publicidad ni SDK de análisis.

| Tipo de dato | Uso | ¿Vinculado a la persona? | ¿Rastreo? |
|---|---|---|---|
| Información de contacto → Nombre | Funcionalidad de la app | Sí | No |
| Información de contacto → Correo electrónico | Funcionalidad de la app | Sí | No |
| Información de contacto → Número de teléfono (de operarios y clientes que carga el personal) | Funcionalidad de la app | Sí | No |
| Contenido del usuario → Fotos o videos (fotos del catálogo) | Funcionalidad de la app | Sí | No |
| Contenido del usuario → Otro contenido del usuario (datos de agenda) | Funcionalidad de la app | Sí | No |

No se recopilan ubicación, contactos del teléfono, salud, finanzas, historial de navegación ni diagnósticos.
La cámara solo lee el QR de la TV y no guarda imágenes (no se declara).

## Cifrado

`ITSAppUsesNonExemptEncryption = false` ya está en `app.json`: no hay preguntas de exportación al subir.

## Información para la revisión de la app

- **Cuenta de demostración:** ya existe en producción la cuenta `...+applereview@gmail.com` (de la revisión
  anterior; ver `inglobal-site/.ai/context/PENDIENTES.md`). Cargar ese mail y su contraseña en "Sign-in
  required" (la contraseña no se guarda en el repo; si nadie la tiene, cambiarla desde
  https://www.gruasinglobal.com/dashboard/usuarios). Desactivarla cuando Apple apruebe. Ojo: la app no tiene
  roles, así que esa cuenta ve la agenda real.
- **Notas para el revisor** (pegar en inglés):

```
InGlobal Agenda is an internal tool for the staff of Grúas Inglobal S.R.L., a crane services company in Córdoba, Argentina. There is no public sign-up: accounts are created by the company administrator from the web dashboard. Please use the demo account provided.

Main flows: Agenda tab (month > tap a day for the week list > tap the day for the hourly view), tap any service to see its details, Catálogos tab (cranes, client companies and operators), Perfil tab (push notification toggle and sign out).

Camera permission is only used in Perfil > "Vincular TV" to scan a QR code shown at https://www.gruasinglobal.com/agenda-tv, which links a TV screen to the agenda. No photos are taken or stored from that scan. Photo library access is used to choose a picture for a crane, operator or company.

We are requesting Unlisted App Distribution for this app, since it is meant only for company employees.
```

## Publicación oculta (Unlisted)

1. En "Precios y disponibilidad", dejar la app disponible solo en Argentina (o donde haga falta).
2. En la versión, elegir **"Publicar esta versión manualmente"**, así no sale pública antes de que Apple la
   pase a oculta.
3. Enviar a revisión.
4. Pedir la distribución oculta en https://developer.apple.com/contact/request/unlisted-app/ (App ID
   `6810508533`). Apple responde por mail.
5. Con las dos aprobaciones, publicar. El link directo de la App Store se comparte con el personal.

## Estado (2026-11-20)

Enviada a revisión la versión **1.1.0 (build 20)** con publicación manual, solo en Argentina, gratis. Idioma
principal Español (México); también tiene ficha en Inglés (EE. UU.). Cuenta de demo: la `+applereview` (la
contraseña se cambió ese día y está cargada en App Store Connect, no en el repo). Pedido de distribución oculta:
formulario completado; falta tildar la conformidad y enviarlo.
