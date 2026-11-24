# Google Play — ficha y respuestas de InGlobal Agenda

Cuenta de Play Console **personal**: antes de producción hace falta una prueba cerrada con **12 testers durante 14
días seguidos**. La primera subida del AAB es manual (después se puede usar `eas submit` con una cuenta de servicio).

## Ficha principal

| Campo | Valor |
|---|---|
| Nombre (máx. 30) | `InGlobal Agenda` |
| Descripción breve (máx. 80) | `Agenda de servicios de grúas: horarios, grúas, operarios y clientes.` |
| Categoría | Empresa |
| Email de contacto | el de la cuenta de desarrollador |
| Sitio web | https://www.gruasinglobal.com |
| Política de privacidad | https://www.gruasinglobal.com/politica-de-privacidad |
| Paquete | `com.gruasinglobal.agenda` |

Descripción completa: la misma de `app-store.md` (sección "Descripción").

Gráficos en `capturas/android/`: ícono 512×512, gráfico destacado 1024×500 y 6 capturas de 1080×2160 (Play no
acepta capturas más altas que 2:1, por eso no sirven las de iPhone).

## Contenido de la app

- **Acceso a la app:** todo requiere inicio de sesión → cargar la cuenta de demo (la misma `+applereview` que usa
  Apple) con las instrucciones: "No public sign-up; use the demo account".
- **Anuncios:** no.
- **Clasificación (IARC):** categoría "Utilidad, productividad, comunicación u otra"; responder no a todo → apta para todos.
- **Público objetivo:** 18 años o más (herramienta de trabajo). No atrae a niños.
- **App de noticias / salud / financiera / gobierno:** no.
- **Seguridad de los datos:**
  - ¿Recopila o comparte datos? Recopila: sí. Comparte con terceros: no.
  - Cifrado en tránsito: sí (HTTPS). Se puede pedir el borrado: sí (por mail, ver política de privacidad).
  - Datos: Información personal → Nombre, Correo electrónico, Teléfono, ID de usuario; Fotos y videos → Fotos;
    Actividad en la app → Otro contenido generado por el usuario (agenda). Todos: funcionalidad de la app,
    obligatorios, no se usan para publicidad.
  - Ubicación, contactos, archivos, salud, finanzas, mensajes: no.

## Prueba cerrada

1. Pruebas → Prueba cerrada → crear pista (o usar "Alpha").
2. Testers: lista de mails (cuentas de Google) — mínimo 12.
3. Subir el AAB del build de producción de EAS, notas de la versión y enviar a revisión.
4. Pasar el link de suscripción a los testers: cada uno acepta e instala. Los 14 días corren desde que hay 12
   suscriptos.
5. Al día 14: Panel → "Solicitar acceso a producción" (preguntas sobre la prueba) y luego publicar en producción.

## Estado (2026-11-23)

- La app ya existe en Play Console (cuenta CodeTlon Córdoba), con la ficha, los gráficos y "Contenido de la app"
  completos desde agosto. El 2026-11-23 se actualizaron la política de privacidad y las URLs de borrado
  (`www.gruasinglobal.com/politica-de-privacidad`), y en "Seguridad de los datos" se agregaron Nombre, Fotos y
  Otro contenido generado por usuarios.
- Prueba cerrada "Alpha": país Argentina y verificadores = lista **LISTA** (12 cuentas). Falta crear la versión:
  subir a mano el AAB de producción (versionCode 3, build EAS `276d5635`, ~90 MB), notas de la versión y
  enviar a revisión. Los 14 días corren cuando los 12 aceptan la invitación.
- Acceso para el revisor: cuenta `playreview@gruasinglobal.com` (cargada en agosto). Confirmar que exista en
  producción y que la contraseña cargada en Play siga valiendo.
