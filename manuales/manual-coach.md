# Manual de Usuario — Coach
**ARGYM · Portal Web y App Móvil**

> Este manual cubre todas las funciones disponibles para el rol **Coach** en la plataforma ARGYM, tanto en el portal web como en la aplicación móvil.

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard del coach](#2-dashboard-del-coach)
3. [Agenda y citas](#3-agenda-y-citas)
4. [Mis clientes](#4-mis-clientes)
5. [Videoteca](#5-videoteca)
6. [Rutinas](#6-rutinas)
7. [Planes de nutrición](#7-planes-de-nutrición)
8. [Mi perfil](#8-mi-perfil)
9. [App Móvil — Coach](#9-app-móvil--coach)

---

## 1. Acceso al sistema

### Portal Web

1. Navega a la URL de tu gimnasio (ej. `https://tugimnasio.argym.app`).
2. Ingresa tu **correo electrónico** y **contraseña**.
3. Haz clic en **Iniciar sesión**.
4. El sistema detecta tu rol de coach y te redirige al portal de coaches (`/coach`).

> Si acabas de ser registrado como coach, deberás esperar a que el administrador apruebe tu cuenta antes de poder ingresar.

### Recuperar contraseña

1. En la pantalla de inicio de sesión, haz clic en **¿Olvidaste tu contraseña?**
2. Ingresa tu correo electrónico registrado.
3. Revisa tu bandeja de entrada y haz clic en el enlace de restablecimiento (válido por 60 minutos).
4. Establece tu nueva contraseña.

---

## 2. Dashboard del coach

Al iniciar sesión, el dashboard muestra un resumen de tu actividad:

### Tarjetas de estadísticas

| Tarjeta | Descripción |
|---------|-------------|
| **Citas pendientes** | Citas en estado "Pendiente de confirmación" |
| **Próximas citas** | Citas programadas en los próximos 7 días |
| **Rutinas creadas** | Total de rutinas que has creado en el sistema |
| **Clientes asignados** | Número de clientes bajo tu responsabilidad |

### Agenda del día

La sección **Hoy** lista todas tus citas programadas para la fecha actual con:
- Hora de inicio y fin
- Nombre del cliente (con avatar)
- Estado de la cita (Confirmada, Pendiente, etc.)

### Próxima semana

Muestra las citas de los próximos 7 días más allá del día actual para planificar tu semana.

### Clientes recientes

Tarjetas con los 5 clientes más recientemente asignados, con nombre y nivel. Haz clic en cualquier tarjeta para ir al perfil del cliente.

---

## 3. Agenda y citas

Ruta: **Coach → Citas**

### Ver tu agenda

La agenda muestra todas tus citas en formato de lista o calendario. Puedes navegar entre fechas con las flechas.

### Filtrar citas

- Por estado: Pendiente / Confirmada / Completada / Cancelada
- Por fecha: usa el selector de fechas para un rango específico

### Confirmar una cita

Cuando el administrador crea una cita asignándote como coach:

1. Recibirás una notificación push y un email.
2. En la agenda, localiza la cita en estado **Pendiente**.
3. Haz clic sobre la cita para ver los detalles.
4. Haz clic en **Confirmar cita**.
5. El cliente recibirá automáticamente un email y una notificación push de confirmación.

### Cancelar una cita

1. Abre la cita.
2. Haz clic en **Cancelar cita**.
3. Ingresa el motivo de la cancelación.
4. Haz clic en **Confirmar cancelación**.
5. El cliente será notificado automáticamente.

### Marcar cita como completada

Después de realizar la sesión:
1. Abre la cita desde la agenda.
2. Haz clic en **Marcar como completada**.
3. El sistema registra la asistencia y actualiza las métricas del cliente.

---

## 4. Mis clientes

Ruta: **Coach → Clientes**

### Ver listado de clientes asignados

Muestra todos los clientes que el administrador te ha asignado. Puedes buscar por nombre.

Para cada cliente en la lista verás:
- Nombre y foto de perfil
- Nivel (Principiante / Intermedio / Avanzado)
- Fecha de registro
- Plan activo (si tiene uno)

### Ver perfil de un cliente

Haz clic en el nombre del cliente para acceder a su perfil, donde verás:
- Datos personales (nombre, teléfono)
- Historial de citas contigo
- Videos asignados
- Rutinas asignadas
- Plan de nutrición (si tiene uno)

### Comunicarse con un cliente

Usa el botón **Contactar** en el perfil del cliente para enviarle un mensaje directo a través del módulo de mensajería interna de la app.

---

## 5. Videoteca

Ruta: **Coach → Videos**

### Ver videos disponibles

Muestra todos los videos publicados por el administrador en tu gimnasio. Puedes filtrar por nivel (Principiante / Intermedio / Avanzado).

Para cada video verás:
- Miniatura o color de fondo
- Título y descripción
- Nivel y duración

### Reproducir un video

Haz clic en la miniatura del video. Se abrirá el reproductor con controles completos:
- ▶ Play / ⏸ Pausa
- ⏪ Retroceder 10 s / ⏩ Adelantar 10 s
- Control de volumen
- ⛶ Pantalla completa
- Barra de progreso con scrubbing

Atajos de teclado del reproductor:

| Tecla | Acción |
|-------|--------|
| `Espacio` o `K` | Play / Pausa |
| `←` | Retroceder 10 s |
| `→` | Adelantar 10 s |
| `M` | Silenciar / Activar sonido |
| `F` | Pantalla completa |
| `Esc` | Cerrar reproductor |

### Asignar un video a un cliente

1. En la tarjeta del video, haz clic en **Asignar a cliente**.
2. Se despliega un formulario con:
   - **Seleccionar cliente:** elige de la lista de tus clientes asignados.
   - **Nota para el cliente:** texto opcional (ej. "Realiza este ejercicio 3 veces por semana").
3. Haz clic en **Asignar video**.
4. El cliente verá el video en su sección **Mis videos** de la app.

---

## 6. Rutinas

Ruta: **Coach → Rutinas**

### Ver rutinas disponibles

Muestra las rutinas creadas en tu gimnasio a las que tienes acceso como coach.

### Asignar una rutina a un cliente

1. En la lista de rutinas, haz clic en **Asignar** en la fila de la rutina.
2. Selecciona el cliente de la lista.
3. Haz clic en **Confirmar asignación**.
4. El cliente verá la rutina en su sección **Mis rutinas** de la app.

### Ver detalle de una rutina

Haz clic en **Ver** para abrir el detalle. Verás:
- Lista de ejercicios con grupo muscular, series, repeticiones y descanso.
- Video demo de cada ejercicio (si fue asignado por el administrador).
- Notas de cada ejercicio.

---

## 7. Planes de nutrición

Ruta: **Coach → Nutrición**

### Ver planes de nutrición

Muestra los planes de nutrición creados en tu gimnasio. Puedes ver el detalle de cada plan con el desglose de comidas por día.

### Asignar un plan de nutrición a un cliente

1. Abre el plan de nutrición.
2. Haz clic en **Asignar a cliente**.
3. Selecciona el cliente de la lista.
4. Haz clic en **Confirmar**.
5. El cliente verá el plan en su sección **Nutrición** de la app.

---

## 8. Mi perfil

Ruta: **Coach → Perfil**

### Editar información personal

1. Haz clic en **Perfil** en el menú lateral.
2. Puedes editar:
   - Nombre completo
   - Teléfono de contacto
   - Foto de perfil (haz clic en el avatar y sube una imagen JPG o PNG)
3. Haz clic en **Guardar cambios**.

### Cambiar contraseña

1. En la sección **Seguridad**, haz clic en **Cambiar contraseña**.
2. Ingresa tu contraseña actual.
3. Ingresa y confirma tu nueva contraseña (mínimo 8 caracteres).
4. Haz clic en **Actualizar contraseña**.

### Preferencias de notificación

Desde **Perfil → Notificaciones**, puedes activar o desactivar:
- Notificaciones de nuevas citas
- Recordatorios de citas (1 hora antes)
- Mensajes de clientes

---

## 9. App Móvil — Coach

### Descarga e instalación

- **Android:** descarga desde el enlace de tu gimnasio o Google Play.
- **iOS:** descarga desde TestFlight o App Store.

### Inicio de sesión

1. Abre la app ARGYM.
2. Ingresa tu correo y contraseña de coach.
3. La app detecta tu rol y muestra la vista de coach.

### Pantalla principal (Home)

Al abrir la app verás:
- **Agenda del día:** tus citas de hoy con hora y cliente.
- **Próximas citas:** lista de las siguientes citas de la semana.
- **Accesos rápidos:** botones para Clientes, Videos y Rutinas.

### Gestión de citas desde la app

1. En la pantalla principal, toca la cita que quieres gestionar.
2. En el detalle de la cita puedes:
   - **Confirmar** la cita (si está en estado Pendiente).
   - **Marcar como completada** al finalizar la sesión.
   - **Cancelar** si no podrás realizarla.
3. El cliente recibe una notificación inmediata.

### Ver y asignar videos desde la app

1. Toca **Videos** en el menú inferior.
2. Navega por la biblioteca de videos.
3. Toca un video para reproducirlo en pantalla completa.
4. Toca el ícono de asignar (👤+) para asignarlo a un cliente.

### Check-in de clientes

Si el cliente llega al gimnasio y quiere registrar asistencia pero no tiene teléfono a mano, el coach puede:
1. Ir a **Clientes** en la app.
2. Seleccionar al cliente.
3. Tocar **Registrar asistencia**.

### Recibir notificaciones push

La app envía notificaciones en tiempo real para:
- Nueva cita asignada
- Cita cancelada por el cliente o admin
- Recordatorio de cita (configurable)
- Mensaje de un cliente

### Funciones disponibles en la app móvil (Coach)

| Función | Disponible |
|---------|-----------|
| Ver y gestionar agenda | ✅ |
| Confirmar / cancelar citas | ✅ |
| Ver listado de clientes | ✅ |
| Reproducir videos | ✅ |
| Asignar videos a clientes | ✅ |
| Ver y asignar rutinas | ✅ |
| Ver planes de nutrición | ✅ |
| Editar perfil | ✅ |
| Crear/editar rutinas | ⚠️ Limitado |
| Subir videos | ❌ Solo web |

---

*Versión del manual: 1.0 — Última actualización: julio 2026*
*Para soporte técnico, contacta a tu administrador de gimnasio o al equipo de ARGYM.*
