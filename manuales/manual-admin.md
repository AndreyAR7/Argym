# Manual de Usuario — Administrador
**ARGYM · Portal Web y App Móvil**

> Este manual cubre todas las funciones disponibles para el rol **Administrador** en la plataforma ARGYM, tanto en el portal web como en la aplicación móvil.

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard principal](#2-dashboard-principal)
3. [Gestión de clientes](#3-gestión-de-clientes)
4. [Gestión de coaches](#4-gestión-de-coaches)
5. [Aprobaciones de usuarios](#5-aprobaciones-de-usuarios)
6. [Agenda y citas](#6-agenda-y-citas)
7. [Planes y suscripciones](#7-planes-y-suscripciones)
8. [Rutinas](#8-rutinas)
9. [Videoteca](#9-videoteca)
10. [Planes de nutrición](#10-planes-de-nutrición)
11. [Gamificación](#11-gamificación)
12. [Promociones](#12-promociones)
13. [Sucursales](#13-sucursales)
14. [Notificaciones push](#14-notificaciones-push)
15. [Correspondencia por email](#15-correspondencia-por-email)
16. [Analíticas y reportes](#16-analíticas-y-reportes)
17. [Configuración del negocio](#17-configuración-del-negocio)
18. [App Móvil — Administrador](#18-app-móvil--administrador)

---

## 1. Acceso al sistema

### Portal Web

1. Abre el navegador y navega a la URL de tu gimnasio (ej. `https://tugimnasio.argym.app`).
2. En la pantalla de inicio de sesión, ingresa tu **correo electrónico** y **contraseña**.
3. Haz clic en **Iniciar sesión**.
4. El sistema detecta tu rol de administrador y te redirige automáticamente al panel de administración (`/admin/dashboard`).

> **Sesión recordada:** La sesión se mantiene activa durante 8 horas. Después de ese tiempo, el sistema te pedirá que ingreses de nuevo.

### Recuperar contraseña

1. En la pantalla de inicio de sesión, haz clic en **¿Olvidaste tu contraseña?**
2. Ingresa tu correo electrónico registrado.
3. Recibirás un enlace de restablecimiento en tu correo. El enlace expira en 60 minutos.
4. Haz clic en el enlace, ingresa tu nueva contraseña y confírmala.
5. Serás redirigido a la pantalla de inicio de sesión.

---

## 2. Dashboard principal

Al ingresar verás el panel de control con métricas en tiempo real de tu gimnasio.

### Tarjetas de resumen

| Tarjeta | Descripción |
|---------|-------------|
| **Clientes activos** | Total de clientes con suscripción vigente |
| **Ingresos del mes** | Suma de pagos recibidos en el mes actual |
| **Citas hoy** | Número de citas programadas para el día |
| **Coaches activos** | Coaches con estado aprobado |

### Gráficos

- **Ingresos mensuales:** Barras comparativas de los últimos 6 meses.
- **Nuevos registros:** Línea de tendencia de registros de clientes.
- **Ocupación de citas:** Porcentaje de citas completadas vs. canceladas.

### Accesos rápidos

En la barra lateral izquierda encontrarás el menú de navegación con acceso a cada módulo. En móvil, el menú se despliega desde el ícono de hamburguesa (☰) en la esquina superior izquierda.

---

## 3. Gestión de clientes

Ruta: **Admin → Clientes**

### Ver listado de clientes

1. En el menú lateral, selecciona **Clientes**.
2. Verás la tabla con todos los clientes registrados en tu gimnasio.
3. Puedes filtrar por:
   - **Buscar:** nombre del cliente.
   - **Nivel:** Principiante / Intermedio / Avanzado / Sin nivel.
   - **Estado:** Aprobado / Pendiente / Rechazado / Todos.
   - **Sucursal:** filtra por sede.
4. La tabla muestra: nombre, nivel, plan activo y estado.
5. Usa los botones de paginación (20 por página) para navegar.

### Crear nuevo cliente

1. Haz clic en el botón **+ Nuevo cliente** (esquina superior derecha).
2. Completa el formulario:
   - Nombre completo *
   - Correo electrónico *
   - Teléfono
   - Nivel de fitness
   - Sucursal
3. Haz clic en **Crear cliente**.
4. El sistema enviará automáticamente un email de bienvenida con las instrucciones de acceso.

### Ver y editar perfil de un cliente

1. En la tabla, haz clic en el nombre del cliente o en el botón **Ver** de la fila.
2. En la página de perfil podrás:
   - Editar nombre, teléfono y nivel.
   - Ver el historial de suscripciones.
   - Ver las citas del cliente.
   - Ver los videos y rutinas asignados.
   - Desactivar la cuenta (botón **Desactivar**).

### Aprobar o rechazar un cliente

Ver sección [5. Aprobaciones de usuarios](#5-aprobaciones-de-usuarios).

### Asignar plan a un cliente

1. En el perfil del cliente, busca la sección **Suscripción**.
2. Haz clic en **Asignar plan**.
3. Selecciona el plan de la lista.
4. Confirma el precio final (puede incluir descuento de promoción).
5. Haz clic en **Confirmar asignación**.

### Desactivar/activar cuenta

- En la fila del cliente en la tabla, el botón de acciones (⋮) permite **Desactivar** o **Activar** la cuenta.
- Un cliente desactivado no puede iniciar sesión.

---

## 4. Gestión de coaches

Ruta: **Admin → Coaches**

### Ver listado de coaches

1. Selecciona **Coaches** en el menú lateral.
2. Filtra por nombre, estado o sucursal.

### Crear nuevo coach

1. Haz clic en **+ Nuevo coach**.
2. Completa nombre, correo y teléfono.
3. Haz clic en **Crear coach**.

### Elevar usuario existente a coach

Si un usuario ya está registrado como cliente y quieres hacerlo coach:

1. Haz clic en el botón **Elevar a coach** (esquina superior derecha del listado de coaches).
2. Busca al usuario por nombre o correo.
3. Selecciónalo y haz clic en **Confirmar**.
4. El usuario adquirirá el rol de coach y tendrá acceso al portal de coaches.

### Asignar clientes a un coach

1. En la fila del coach, haz clic en **Gestionar clientes** (ícono de personas).
2. Se abre una ventana con los clientes de la sucursal del coach.
3. Marca los clientes que deseas asignar.
   - Un candado gris (🔒) indica que el cliente ya está asignado a otro coach.
4. Haz clic en **Guardar asignación**.

> **Requisito:** El coach debe tener una sucursal asignada antes de gestionar clientes.

### Desactivar coach

En el botón de acciones (⋮) de la fila, selecciona **Desactivar**.

---

## 5. Aprobaciones de usuarios

Ruta: **Admin → Aprobaciones**

Cuando un usuario se registra, su estado inicial es **Pendiente**. Debes aprobar o rechazar su cuenta.

### Aprobar un usuario

1. En **Aprobaciones**, verás la lista de usuarios pendientes con foto, nombre y fecha de registro.
2. Haz clic en **Aprobar**.
3. El sistema enviará automáticamente un email de confirmación al usuario y una notificación push.
4. El usuario podrá iniciar sesión de inmediato.

### Rechazar un usuario

1. Haz clic en **Rechazar** en la fila del usuario.
2. Ingresa el motivo del rechazo (campo de texto).
3. Haz clic en **Confirmar rechazo**.
4. El usuario recibirá un email informándole que su solicitud no fue aprobada.

### Aprobación masiva

Selecciona varios usuarios con las casillas de verificación y haz clic en **Aprobar seleccionados**.

---

## 6. Agenda y citas

Ruta: **Admin → Citas**

### Ver agenda

La agenda muestra las citas en vista de calendario (mes, semana, día). Puedes cambiar la vista con los botones en la esquina superior derecha del calendario.

### Crear una cita

1. Haz clic en un espacio vacío del calendario, o en el botón **+ Nueva cita**.
2. Completa:
   - Título / descripción
   - Fecha y hora de inicio y fin
   - Cliente (búsqueda por nombre)
   - Coach (búsqueda por nombre)
   - Tipo de cita (individual, grupal)
3. Haz clic en **Crear cita**.
4. El cliente y el coach recibirán una notificación automática.

### Editar o cancelar una cita

1. Haz clic sobre la cita en el calendario.
2. En el panel lateral que aparece, puedes:
   - **Editar:** modifica fecha, hora, coach o cliente.
   - **Confirmar:** cambia el estado a "Confirmada".
   - **Cancelar:** cancela la cita. Se enviará notificación al cliente.

### Estados de las citas

| Estado | Descripción |
|--------|-------------|
| Pendiente | Cita creada, esperando confirmación |
| Confirmada | Cita confirmada por el coach o admin |
| Completada | Cita marcada como realizada |
| Cancelada | Cita cancelada |

---

## 7. Planes y suscripciones

Ruta: **Admin → Planes**

### Ver planes

Muestra todos los planes creados para tu gimnasio con precio, ciclo de facturación y estado (activo/inactivo).

### Crear un plan

1. Haz clic en **+ Nuevo plan**.
2. Completa:
   - Nombre del plan
   - Descripción
   - Precio
   - Ciclo de facturación (mensual, trimestral, semestral, anual)
   - Límite de clientes (opcional)
   - Beneficios incluidos (lista de ítems)
3. Haz clic en **Crear plan**.

> Los planes se sincronizan automáticamente con Stripe para procesamiento de pagos.

### Editar un plan

1. Haz clic en el botón **Editar** del plan.
2. Modifica los campos necesarios.
3. Los cambios aplican a nuevas suscripciones; las existentes mantienen las condiciones originales.

### Desactivar un plan

Un plan desactivado no aparece disponible para nuevas suscripciones, pero los clientes actuales mantienen acceso.

---

## 8. Rutinas

Ruta: **Admin → Rutinas**

### Ver listado de rutinas

Muestra todas las rutinas creadas para tu gimnasio. Filtra por nombre o nivel (Principiante / Intermedio / Avanzado).

### Crear una rutina

1. Haz clic en **+ Nueva rutina**.
2. Completa:
   - Nombre *
   - Descripción
   - Nivel
   - ¿Es plantilla? (Las plantillas sirven como base para crear nuevas rutinas)
   - Planes con acceso (opcional: restringe a suscriptores de ciertos planes)
   - Niveles con acceso (opcional)
3. Haz clic en **Crear rutina**.

### Agregar ejercicios a una rutina

1. Haz clic en **Ver** en la fila de la rutina.
2. En la sección de ejercicios, haz clic en **+ Agregar ejercicio**.
3. Completa:
   - Nombre del ejercicio *
   - Grupo muscular
   - Series y repeticiones
   - Descanso (segundos)
   - Notas opcionales
   - Video demo (selecciona de la videoteca)
4. Haz clic en **Guardar ejercicio**.
5. Arrastra los ejercicios para reordenarlos.

### Duplicar una rutina

En la fila de la rutina, haz clic en el ícono de **Duplicar** (📋). Se creará una copia con el sufijo "(Copia)" en el nombre, inactiva por defecto. Edítala antes de activarla.

### Activar/desactivar una rutina

Usa el toggle de la columna **Activa** en la tabla de rutinas.

---

## 9. Videoteca

Ruta: **Admin → Videos**

### Ver videos

Muestra todos los videos subidos con nivel, duración y estado (Publicado / Borrador / Archivado).

### Subir un video

1. Haz clic en **+ Subir video**.
2. Completa:
   - Título *
   - Descripción
   - Nivel
   - Archivo de video (formatos: MP4, MOV, AVI — máximo 500 MB)
   - Miniatura (imagen opcional, formatos: JPG, PNG)
   - Color de miniatura (si no se sube imagen)
3. Haz clic en **Subir video**. Espera a que la barra de progreso complete.
4. El video queda en estado **Borrador** hasta que lo publiques.

### Publicar o archivar un video

En la tarjeta del video:
- **Publicar:** hace el video visible para clientes y coaches.
- **Archivar:** oculta el video sin eliminarlo.

### Reproducir un video

Haz clic en la miniatura del video. Se abrirá el reproductor con controles de play/pausa, avance, volumen y pantalla completa.

### Asignar video a un cliente (desde admin)

1. En la tarjeta del video, haz clic en **Asignar a cliente**.
2. Busca al cliente por nombre.
3. Agrega una nota opcional.
4. Haz clic en **Asignar**.

---

## 10. Planes de nutrición

Ruta: **Admin → Nutrición**

### Crear un plan de nutrición

1. Haz clic en **+ Nuevo plan**.
2. Asigna un nombre y descripción.
3. Agrega comidas por día (desayuno, almuerzo, cena, meriendas).
4. Para cada comida, detalla alimentos, cantidades y calorías.
5. Haz clic en **Guardar plan**.

### Asignar plan de nutrición a un cliente

1. Abre el plan de nutrición.
2. Haz clic en **Asignar a cliente**.
3. Selecciona el cliente de la lista.
4. Haz clic en **Confirmar**.

---

## 11. Gamificación

Ruta: **Admin → Gamificación**

### Configurar insignias (badges)

1. Accede a **Gamificación → Insignias**.
2. Las insignias predeterminadas incluyen: Primera semana, Mes completo, Rey del check-in, etc.
3. Puedes editar el nombre, descripción e imagen de cada insignia.

### Ver ranking de clientes

El leaderboard muestra los clientes ordenados por puntos XP acumulados. Puedes filtrar por período: semanal, mensual, anual.

### Gestionar retos

1. Accede a **Gamificación → Retos**.
2. Verás todos los retos activos e históricos.
3. Puedes crear retos grupales con meta de XP o asistencias.
4. Los retos 1v1 son iniciados por los clientes directamente.

---

## 12. Promociones

Ruta: **Admin → Promociones**

### Crear una promoción

1. Haz clic en **+ Nueva promoción**.
2. Completa:
   - Nombre de la promoción *
   - Código de descuento (o genera uno automático)
   - Tipo: porcentaje (%) o monto fijo
   - Valor del descuento
   - Fecha de inicio y vencimiento
   - Límite de usos (opcional)
   - Planes a los que aplica
3. Haz clic en **Crear promoción**.

### Desactivar una promoción

En la fila de la promoción, usa el toggle de la columna **Activa**.

---

## 13. Sucursales

Ruta: **Admin → Sucursales**

### Crear una sucursal

1. Haz clic en **+ Nueva sucursal**.
2. Ingresa nombre, dirección y teléfono.
3. Haz clic en **Crear**.

### Código QR de check-in

Cada sucursal tiene un código QR único para que los clientes registren su asistencia.

1. En la fila de la sucursal, haz clic en **Ver QR**.
2. Descarga o imprime el código QR para colocarlo en la entrada del gimnasio.
3. Los clientes escanean el QR con la app móvil para registrar su asistencia.

---

## 14. Notificaciones push

Ruta: **Admin → Notificaciones**

### Enviar una notificación

1. En la sección **Redactar notificación**, escribe:
   - **Título** (máximo 65 caracteres)
   - **Mensaje** (máximo 240 caracteres)
2. En la sección **Destinatarios**, elige:
   - **Todos:** clientes y coaches
   - **Clientes:** solo usuarios con rol cliente
   - **Coaches:** solo usuarios con rol coach
3. Revisa la vista previa simulada de la notificación en un teléfono.
4. Haz clic en **Enviar notificación**.

> La notificación llega en segundos a todos los dispositivos móviles registrados de los destinatarios.

### Ver historial de envíos

Debajo del formulario de envío, la sección **Historial de envíos** muestra las últimas 30 notificaciones enviadas manualmente, con:
- Título y mensaje
- Destinatarios (Todos / Clientes / Coaches)
- Quién la envió
- Fecha y hora

---

## 15. Correspondencia por email

Ruta: **Admin → Correspondencia**

Este módulo gestiona todos los correos automáticos que envía el sistema.

### Pestaña: Reglas

Las reglas determinan qué emails se envían en respuesta a cada evento del sistema.

**Eventos disponibles:**
- `appointment.created` — Cita creada
- `appointment.confirmed` — Cita confirmada
- `appointment.cancelled` — Cita cancelada
- `appointment.reminder` — Recordatorio de cita
- `plan.purchased` — Plan adquirido
- `plan.expiring` — Plan por vencer (7 días)
- `plan.expired` — Plan vencido
- `client.approved` — Cuenta aprobada
- `client.welcome` — Bienvenida al cliente

Para cada regla puedes:
- Activar/desactivar la regla (toggle)
- Configurar el destinatario (cliente, coach, ambos)
- Seleccionar la plantilla de email

### Pestaña: Plantillas

Muestra las 10 plantillas predeterminadas del sistema. Puedes:
- **Editar** el asunto y cuerpo de la plantilla (soporta HTML básico)
- **Previsualizar** cómo se verá el email
- **Restaurar** la plantilla a su versión original

Para cargar las plantillas predeterminadas por primera vez: haz clic en **Cargar plantillas por defecto**.

### Pestaña: SMTP

Configura el servidor de correo saliente:

1. Activa **Usar SMTP personalizado**.
2. Ingresa:
   - Host del servidor (ej. `smtp.gmail.com`)
   - Puerto (465 para SSL, 587 para STARTTLS)
   - Tipo de cifrado (TLS / STARTTLS)
   - Usuario (tu correo)
   - Contraseña (para Gmail: usa una **Contraseña de aplicación**, no tu contraseña principal)
3. Haz clic en **Guardar configuración SMTP**.
4. Prueba la configuración con el botón **Enviar correo de prueba**.

### Pestaña: Registros (Logs)

Muestra el historial de todos los correos enviados:
- Estado: Enviado / Fallido / Reintentando
- Destinatario, asunto, fecha
- Intentos realizados

Para reenviar correos fallidos: haz clic en **Reintentar** en la fila correspondiente, o **Reintentar todos los fallidos** para procesarlos en lote.

---

## 16. Analíticas y reportes

Ruta: **Admin → Analíticas**

### Seleccionar período

Usa el selector de período en la parte superior:
- Últimos 7 días
- Últimos 30 días
- Últimos 90 días
- 6 meses
- Año actual
- Año anterior
- Rango personalizado (elige fechas de inicio y fin)

### KPIs ejecutivos

La sección principal muestra métricas clave:

| Métrica | Descripción |
|---------|-------------|
| **Ingresos del período** | Total facturado en el rango seleccionado |
| **MRR** | Ingresos mensuales recurrentes |
| **ARR** | Ingresos anuales proyectados |
| **ARPU** | Ingreso promedio por usuario |
| **Tasa de cancelación** | Porcentaje de suscripciones canceladas |
| **Ocupación de citas** | Citas completadas vs. programadas |

Cada métrica incluye un indicador de tendencia comparado con el período anterior (↑ verde / ↓ rojo).

### Gráficos

- **Ingresos por mes:** barras mensuales
- **Actividad semanal:** registros, citas, nuevos clientes
- **Distribución por plan:** cuántos clientes tiene cada plan
- **Rendimiento por sucursal:** comparativa entre sedes

### Tablas detalladas

Cuatro pestañas con datos exportables:
- **Clientes:** lista de clientes con plan, fecha de registro y estado
- **Transacciones:** cada pago con monto, método y estado
- **Suscripciones:** resumen de suscripciones activas e inactivas
- **Citas:** historial de citas con coach, cliente y estado

### Exportar datos

Haz clic en **Exportar a Excel** para descargar todos los datos del período seleccionado en formato `.xlsx`.

---

## 17. Configuración del negocio

Ruta: **Admin → Ajustes**

### Editar información del gimnasio

1. Modifica el **Nombre del gimnasio**.
2. Selecciona la **Zona horaria** (importante para que las citas se muestren en la hora correcta).
3. Elige la **Moneda** para facturación.
4. Selecciona el **Locale** para formato de fechas y números.
5. Haz clic en **Guardar cambios**.

---

## 18. App Móvil — Administrador

La app móvil está disponible para iOS y Android. Los administradores pueden acceder a funciones clave desde el dispositivo.

### Descarga e instalación

- **Android:** descarga el APK desde el enlace proporcionado por tu proveedor, o desde Google Play (cuando esté disponible).
- **iOS:** descarga desde TestFlight o App Store (cuando esté disponible).

### Inicio de sesión

1. Abre la app.
2. Ingresa tu correo y contraseña de administrador.
3. La app te redirige a la vista de administración.

### Funciones disponibles en la app móvil (Admin)

| Función | Disponible |
|---------|-----------|
| Ver dashboard con métricas | ✅ |
| Aprobar / rechazar usuarios | ✅ |
| Ver listado de clientes | ✅ |
| Ver listado de coaches | ✅ |
| Ver y gestionar citas | ✅ |
| Enviar notificaciones push | ✅ |
| Ver analíticas básicas | ✅ |
| Gestión completa de rutinas y videos | ⚠️ Limitado (recomendado desde web) |
| Configuración SMTP | ❌ Solo web |

### Notificaciones en la app

Como administrador, recibirás notificaciones push en los siguientes eventos:
- Nuevo usuario pendiente de aprobación
- Cita cancelada
- Pago procesado exitosamente
- Suscripción por vencer

### Cerrar sesión

Ve a **Perfil → Cerrar sesión** en la barra inferior de la app.

---

*Versión del manual: 1.0 — Última actualización: julio 2026*
*Para soporte técnico, contacta al equipo de ARGYM.*
