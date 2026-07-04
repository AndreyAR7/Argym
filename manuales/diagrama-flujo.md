# Diagramas de Flujo — ARGYM Platform
> Diagramas en sintaxis Mermaid. Renderiza con cualquier editor compatible: GitHub, GitLab, Obsidian, VS Code (extensión Mermaid), o [mermaid.live](https://mermaid.live).

---

## 1. Flujo de Registro y Aprobación de Usuario

```mermaid
flowchart TD
    A([Usuario abre la app / web]) --> B[Pantalla de bienvenida]
    B --> C{¿Tiene cuenta?}
    C -- Sí --> D[Pantalla de Login]
    C -- No --> E[Formulario de Registro]

    E --> F[Ingresar nombre, email, contraseña]
    F --> G[Verificar email]
    G --> H{¿Email verificado?}
    H -- No --> G
    H -- Sí --> I[Estado: Pendiente de aprobación]
    I --> J[Admin recibe notificación]

    J --> K{Admin revisa solicitud}
    K -- Aprueba --> L[Email + Push: Cuenta aprobada]
    K -- Rechaza --> M[Email: Solicitud rechazada]

    L --> N[Usuario puede iniciar sesión]
    M --> O([Fin — usuario contacta al gimnasio])

    D --> P{Credenciales válidas?}
    P -- No --> Q[Error: credenciales inválidas]
    Q --> D
    P -- Sí --> R{Estado de la cuenta}
    R -- Pendiente --> S[Pantalla: En revisión]
    R -- Rechazada --> T[Pantalla: Cuenta rechazada]
    R -- Aprobada --> U{Rol del usuario}

    U -- Admin --> V[Portal Admin /admin]
    U -- Coach --> W[Portal Coach /coach]
    U -- Cliente --> X[Portal Cliente /client]
```

---

## 2. Flujo de Gestión de Clientes (Admin)

```mermaid
flowchart TD
    A([Admin en Portal Web]) --> B[Módulo: Clientes]
    B --> C{Acción}

    C -- Ver listado --> D[Tabla con filtros: nombre, nivel, estado, sucursal]
    D --> E[Selecciona cliente]
    E --> F{Acción sobre cliente}
    F -- Ver perfil --> G[Página de perfil completo]
    F -- Editar --> H[Editar nombre, teléfono, nivel]
    F -- Desactivar --> I[Cuenta desactivada\nCliente no puede ingresar]
    F -- Asignar plan --> J[Selecciona plan + aplica promoción]
    J --> K[Suscripción creada\nStripe procesa pago]

    C -- Nuevo cliente --> L[Formulario: nombre, email, teléfono]
    L --> M[Sistema crea cuenta]
    M --> N[Email de bienvenida enviado]

    C -- Aprobaciones --> O[Lista de pendientes]
    O --> P{Admin decide}
    P -- Aprobar --> Q[Push + Email al cliente]
    P -- Rechazar --> R[Email con motivo al cliente]
```

---

## 3. Flujo de Gestión de Citas

```mermaid
sequenceDiagram
    actor C as Cliente
    actor Co as Coach
    actor A as Admin
    participant S as Sistema ARGYM

    C->>S: Solicita cita (fecha, hora, tipo)
    S->>A: Notificación: nueva solicitud
    S->>Co: Notificación: nueva cita asignada
    A->>S: (Opcional) confirma o ajusta
    Co->>S: Confirma la cita
    S->>C: Push + Email: cita confirmada
    S->>Co: Push: cita confirmada

    Note over C,S: El día de la cita

    C->>S: Check-in con QR (opcional)
    S->>C: +50 XP otorgados
    Co->>S: Marca cita como completada
    S->>C: Push: sesión registrada
    S->>C: XP adicionales otorgados

    alt Cliente cancela
        C->>S: Cancela la cita
        S->>Co: Push: cita cancelada
        S->>A: Notificación de cancelación
    else Coach cancela
        Co->>S: Cancela la cita
        S->>C: Push + Email: cita cancelada
    end
```

---

## 4. Flujo de Gamificación

```mermaid
flowchart LR
    subgraph Acciones["Acciones que generan XP"]
        A1[Check-in QR\n+50 XP]
        A2[Completar entrenamiento\n+100 XP]
        A3[Ver video asignado\n+25 XP]
        A4[Ganar reto 1v1\n+200 XP]
        A5[Completar reto grupal\nVariable]
    end

    subgraph Motor["Motor de Gamificación"]
        B[Acumular XP]
        C{¿Nivel sube?}
        D{¿Insignia desbloqueada?}
    end

    subgraph Resultados["Resultados"]
        E[Actualiza ranking en tiempo real]
        F[Notificación: nuevo nivel]
        G[Notificación: insignia obtenida]
        H[Progreso en reto activo]
    end

    A1 & A2 & A3 & A4 & A5 --> B
    B --> C
    B --> D
    B --> E
    C -- Sí --> F
    D -- Sí --> G
    B --> H
```

---

## 5. Flujo de Reto 1v1

```mermaid
sequenceDiagram
    actor C1 as Cliente A (retador)
    actor C2 as Cliente B (retado)
    participant S as Sistema ARGYM

    C1->>S: Crea reto 1v1 (meta, período, oponente)
    S->>C2: Push: "¡Te han desafiado!"
    S->>C2: Invitación visible en Retos > Pendientes

    C2->>S: Acepta el reto
    S->>C1: Push: "Reto aceptado, ¡comienza!"
    S->>S: Estado del reto → En curso

    loop Durante el período del reto
        C1->>S: Realiza acciones (entrena, check-in)
        S->>S: Suma XP a C1 en el reto
        C2->>S: Realiza acciones (entrena, check-in)
        S->>S: Suma XP a C2 en el reto
    end

    S->>S: Período finaliza
    S->>S: Compara XP de C1 vs C2
    alt C1 gana
        S->>C1: Push + +200 XP: "¡Ganaste el reto!"
        S->>C2: Push: "Perdiste el reto contra C1"
    else C2 gana
        S->>C2: Push + +200 XP: "¡Ganaste el reto!"
        S->>C1: Push: "Perdiste el reto contra C2"
    else Empate
        S->>C1: Push: "Empate — buen esfuerzo"
        S->>C2: Push: "Empate — buen esfuerzo"
    end
```

---

## 6. Flujo de Videos (Asignación y Reproducción)

```mermaid
flowchart TD
    subgraph Admin["Admin sube video"]
        A1[Sube archivo MP4] --> A2[Estado: Borrador]
        A2 --> A3{¿Publicar?}
        A3 -- Sí --> A4[Estado: Publicado\nVisible para coaches]
        A3 -- No --> A2
    end

    subgraph Coach["Coach asigna video"]
        B1[Accede a Videoteca] --> B2[Elige video publicado]
        B2 --> B3[Selecciona cliente + nota]
        B3 --> B4[Video asignado al cliente]
        B4 --> B5[Push al cliente: nuevo video]
    end

    subgraph Cliente["Cliente ve video"]
        C1[Entra a Mis Videos] --> C2[Encuentra el video asignado]
        C2 --> C3[Toca para reproducir]
        C3 --> C4[API /api/video-url genera URL firmada\ncon expiración de 1 hora]
        C4 --> C5[Reproductor carga el video]
        C5 --> C6{¿Vio más de 5 segundos?}
        C6 -- Sí --> C7[Sistema registra la vista\n+25 XP otorgados]
        C6 -- No --> C8[Sin registro]
    end

    A4 --> B1
    B4 --> C1
```

---

## 7. Flujo de Suscripciones y Pagos (Stripe)

```mermaid
flowchart TD
    A([Cliente accede a Mi Plan]) --> B[Ve planes disponibles]
    B --> C[Selecciona un plan]
    C --> D{¿Tiene código de promoción?}
    D -- Sí --> E[Aplica descuento]
    D -- No --> F[Precio base]
    E & F --> G[Confirma el plan]
    G --> H[Stripe procesa el pago]
    H --> I{¿Pago exitoso?}
    I -- No --> J[Error: pago fallido\nSolicita nuevo método]
    I -- Sí --> K[Suscripción activa]
    K --> L[Email: recibo de pago]
    K --> M[Push: plan activado]
    K --> N[Acceso a contenido del plan]

    subgraph Renovación["Renovación automática"]
        O[Stripe intenta cobrar al vencer el período]
        O --> P{¿Cobro exitoso?}
        P -- Sí --> Q[Suscripción renovada\nEmail de confirmación]
        P -- No --> R[Email: pago fallido\nGracia de 3 días]
        R --> S{¿Se soluciona?}
        S -- Sí --> Q
        S -- No --> T[Suscripción cancelada\nAcceso revocado]
    end

    K --> O
```

---

## 8. Flujo de Notificaciones y Comunicación Automática

```mermaid
flowchart LR
    subgraph Eventos["Eventos del sistema"]
        E1[Cita creada]
        E2[Cita confirmada]
        E3[Cita cancelada]
        E4[Plan comprado]
        E5[Plan por vencer]
        E6[Cuenta aprobada]
        E7[XP ganados]
    end

    subgraph Motor["Motor de comunicación"]
        M1{¿Hay regla activa?}
        M2[Selecciona plantilla]
        M3[Renderiza con datos del evento]
    end

    subgraph Canales["Canales de entrega"]
        CH1[📧 Email via SMTP]
        CH2[📱 Push notification\n notify-push Edge Function]
        CH3[🔔 In-app notification]
    end

    E1 & E2 & E3 & E4 & E5 & E6 --> M1
    E7 --> CH2
    M1 -- Regla existe y activa --> M2
    M1 -- Sin regla --> Z([Ignorado])
    M2 --> M3
    M3 --> CH1
    M3 --> CH2
    CH1 --> LOG[Registro en email_logs]
    CH2 --> NQ[Registro en notification_queue]
```

---

## 9. Arquitectura General de la Plataforma

```mermaid
graph TB
    subgraph Clientes["Clientes / Dispositivos"]
        WEB[Web App\nNext.js 15]
        MOB[Mobile App\nReact Native / Expo]
    end

    subgraph Backend["Backend — Supabase"]
        DB[(PostgreSQL\ncon RLS multi-tenant)]
        AUTH[Auth Service\nJWT + Sessions]
        STORE[Storage\nVideos, Imágenes]
        RT[Realtime\nWebSocket]
        EF[Edge Functions\nDeno]
    end

    subgraph Externos["Servicios externos"]
        STRIPE[Stripe\nPagos]
        FCM[FCM / APNs\nPush Notifications]
        SMTP[SMTP\nEmail]
    end

    WEB <-->|HTTPS + WSS| AUTH
    WEB <-->|Supabase Client| DB
    WEB <-->|Supabase Client| STORE
    WEB <-->|Realtime| RT
    MOB <-->|HTTPS + WSS| AUTH
    MOB <-->|Supabase Client| DB
    MOB <-->|Realtime| RT

    EF -->|service_role| DB
    EF --> FCM
    EF --> SMTP
    EF --> STRIPE

    WEB -->|server actions| EF
    WEB -->|webhooks| STRIPE

    DB -->|triggers| EF
```

---

*Renderiza estos diagramas en [mermaid.live](https://mermaid.live) o en cualquier editor Markdown con soporte Mermaid.*
