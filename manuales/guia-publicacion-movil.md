# Guía de Publicación — App Móvil ARGYM
**Expo Application Services (EAS) · Google Play · App Store**

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20.x | `node -v` |
| pnpm | 10.x | `pnpm -v` |
| EAS CLI | 18.x | `eas --version` |
| Expo CLI | cualquiera | `npx expo --version` |

Cuentas necesarias:
- **Expo** (expo.dev) — proyecto ARGYM configurado
- **Google Play Console** — cuenta de desarrollador activada ($25 USD único)
- **Apple Developer Program** — $99 USD/año

---

## 1. Configurar secretos en EAS

Los valores sensibles van en EAS Secrets, **nunca** en el código fuente.

```bash
cd apps/mobile

# Supabase
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://wzvhxkleswlzzobxtmfv.supabase.co"

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "tu-anon-key-aqui"
```

> Los secretos definidos aquí sobreescriben el `env` hardcodeado en `eas.json`.

---

## 2. Primera build de desarrollo

```bash
# Instalar EAS CLI (si no está)
npm install -g eas-cli

# Login con tu cuenta Expo
eas login

# Configurar el proyecto (una sola vez)
eas init

# Build de desarrollo para Android (genera APK)
eas build --profile development --platform android

# Build de desarrollo para iOS (requiere Mac o EAS cloud)
eas build --profile development --platform ios
```

Descarga el APK / IPA del enlace que Expo imprime al finalizar e instálalo en tu dispositivo de prueba.

---

## 3. Build de Preview (QA interno)

```bash
# Android APK para distribución interna
eas build --profile preview --platform android

# iOS IPA para TestFlight interno
eas build --profile preview --platform ios
```

Comparte el enlace de instalación con el equipo de QA desde el dashboard de Expo.

---

## 4. Build de Producción

### 4.1 Credenciales de firma

**Android:**
1. EAS genera y gestiona el keystore automáticamente (`credentialsSource: "remote"` por defecto).
2. Descarga una copia de seguridad del keystore desde `eas credentials`.

**iOS:**
1. EAS gestiona certificates y provisioning profiles vía Apple Developer API.
2. Asegúrate de que el `appleTeamId` en `eas.json` → `submit.production.ios` esté correcto.

### 4.2 Ejecutar la build

```bash
# Ambas plataformas en paralelo
eas build --profile production --platform all
```

### 4.3 Incremento automático de versión

`"autoIncrement": true` en el perfil `production` sube automáticamente el `versionCode` (Android) y el `buildNumber` (iOS). Actualiza el `version` en `app.json` manualmente antes de cada release.

---

## 5. Publicar en Google Play

### 5.1 Configurar service account

1. En Google Play Console → Configuración API → Credenciales.
2. Crea un service account y descarga el JSON.
3. Renómbralo `google-play-key.json` y cópialo a `apps/mobile/`.
4. **No lo subas a git** (ya está en `.gitignore`).

### 5.2 Submit

```bash
eas submit --platform android --profile production --latest
```

El flag `--latest` toma el último build de Expo exitoso. La primera vez, sube al internal testing track (`"track": "internal"` en `eas.json`). Cambia a `alpha`, `beta`, o `production` cuando estés listo.

### 5.3 En Play Console

1. Ve a **Producción → Crear versión**.
2. Selecciona el AAB subido por EAS.
3. Escribe las notas de versión en español e inglés.
4. Envía para revisión (1-3 días hábiles).

---

## 6. Publicar en App Store

### 6.1 Preparar app en App Store Connect

1. En [App Store Connect](https://appstoreconnect.apple.com), crea la app (Bundle ID debe coincidir con `app.json → ios.bundleIdentifier`).
2. Completa los metadatos:
   - Nombre: **ARGYM**
   - Subtítulo: Gestión de tu gimnasio
   - Descripción: (ver plantilla abajo)
   - Capturas de pantalla: mínimo 3 por tamaño de pantalla (6.7" y 5.5")
   - Icono: 1024×1024 px sin canal alfa
3. Categoría: **Salud y forma física**
4. Clasificación de edad: 4+

### 6.2 Submit

```bash
eas submit --platform ios --profile production --latest
```

EAS sube el IPA a App Store Connect vía TestFlight. Luego en App Store Connect:

1. Selecciona la build en **Distribución → TestFlight** para pruebas internas.
2. Cuando estés listo, ve a **App Store** y crea una nueva versión.
3. Envía para revisión de Apple (1-7 días hábiles).

---

## 7. Updates OTA (Over the Air)

Para correcciones menores de JS que no tocan código nativo, usa EAS Update en lugar de un submit completo:

```bash
eas update --branch production --message "Fix: corrección de bug en pantalla de pagos"
```

Los usuarios reciben el update en el siguiente arranque de la app (sin pasar por Play/App Store).

> **Importante:** los updates OTA solo funcionan en builds de producción con `expo-updates` configurado. Cambios en código nativo (plugins, permisos) siempre requieren una nueva build.

---

## 8. Descripción para las tiendas

```
ARGYM es la aplicación oficial para los miembros de tu gimnasio.

✅ Reserva y gestiona tus citas con tu coach personal
✅ Sigue tu progreso y rutinas de entrenamiento
✅ Accede a la videoteca de ejercicios
✅ Visualiza y paga tu membresía
✅ Participa en retos y gamificación
✅ Recibe notificaciones en tiempo real

Requiere que tu gimnasio use la plataforma ARGYM.
```

---

## 9. Checklist pre-lanzamiento

- [ ] `version` en `app.json` actualizado (ej. `1.0.0`)
- [ ] Secretos de EAS verificados (`eas secret:list`)
- [ ] Build de preview aprobada por QA
- [ ] Capturas de pantalla actualizadas en ambas tiendas
- [ ] Notas de versión escritas en español e inglés
- [ ] `google-play-key.json` presente (Android)
- [ ] `appleTeamId` y `ascAppId` correctos en `eas.json` (iOS)
- [ ] EXPO_PUBLIC_SUPABASE_ANON_KEY apunta a producción (no local)
- [ ] Sentry DSN configurado para mobile (si se usa `@sentry/react-native`)

---

*Para soporte con EAS: [docs.expo.dev/eas](https://docs.expo.dev/eas)*
