# Requirements Document

## Introduction

A full-featured cross-platform mobile SaaS application (Android and iOS) for client management, appointments, and service delivery in fitness, health, coaching, and similar industries. The platform supports multiple tenants (businesses), three user roles (Admin, Staff/Coach, Client), and a modular feature set that can be toggled per subscription plan. The backend is built on Supabase (PostgreSQL, Auth, Storage, Edge Functions) with Stripe for payments, OpenAI for AI assistance, and compliance with Costa Rica electronic invoicing regulations.

## Glossary

- **System**: The SaaS client management platform as a whole
- **Tenant**: A business or organization that subscribes to and operates the platform
- **Admin**: A user with full control over a Tenant's configuration, users, and data
- **Coach**: A staff member who delivers services, manages clients, and creates plans
- **Client**: An end-user who receives services from a Tenant
- **Appointment**: A scheduled session between a Coach and one or more Clients
- **Routine**: A structured training plan assigned to a Client
- **NutritionPlan**: A structured meal/nutrition plan assigned to a Client
- **VirtualClass**: A scheduled online session delivered via video conferencing
- **Subscription**: A recurring billing agreement between a Tenant and the platform
- **Invoice**: An electronic billing document compliant with Costa Rica regulations
- **AuthService**: The authentication and authorization subsystem (Supabase Auth + JWT)
- **NotificationService**: The subsystem responsible for push and email notifications
- **PaymentService**: The subsystem handling Stripe payment processing
- **InvoicingService**: The subsystem handling Costa Rica electronic invoicing
- **MessagingService**: The real-time chat subsystem (Supabase Realtime)
- **AIAssistant**: The AI chatbot subsystem powered by OpenAI
- **RBAC**: Role-Based Access Control — the permission model governing all actions
- **MobileApp**: The React Native or Flutter cross-platform mobile application
- **API**: The backend API layer implemented via Supabase Edge Functions

---

## Requirements

### Requirement 1: Multi-Tenant Architecture

**User Story:** As a platform operator, I want each business to operate in an isolated tenant environment, so that data, users, and configurations remain separate across organizations.

#### Acceptance Criteria

1. THE System SHALL associate every user, appointment, client record, and configuration with exactly one Tenant.
2. WHEN a user authenticates, THE AuthService SHALL resolve and attach the user's Tenant context to every subsequent API request.
3. THE API SHALL reject any request that attempts to read or modify data belonging to a different Tenant than the authenticated user's Tenant.
4. THE System SHALL support a minimum of 1,000 concurrent Tenants without degradation in response time beyond 500ms per API call.
5. WHERE a Tenant's subscription plan includes a specific module, THE System SHALL enable that module exclusively for that Tenant.
6. WHERE a Tenant's subscription plan does not include a specific module, THE System SHALL disable access to that module for all users of that Tenant.

---

### Requirement 2: Authentication and Authorization

**User Story:** As a user, I want to securely register, log in, and manage my account, so that my data is protected and I can access only the features relevant to my role.

#### Acceptance Criteria

1. THE AuthService SHALL support user registration via email and password.
2. WHERE social login is enabled for a Tenant, THE AuthService SHALL support OAuth 2.0 login via Google and Apple.
3. WHEN a user submits valid credentials, THE AuthService SHALL issue a signed JWT with a maximum expiry of 1 hour and a refresh token with a maximum expiry of 30 days.
4. WHEN a JWT expires, THE AuthService SHALL transparently refresh the session using the refresh token without requiring the user to re-authenticate.
5. IF a refresh token is expired or revoked, THEN THE AuthService SHALL redirect the user to the login screen and invalidate the local session.
6. WHEN a user requests a password reset, THE AuthService SHALL send a time-limited reset link to the user's registered email address within 60 seconds.
7. THE RBAC SHALL enforce three roles: Admin, Coach, and Client, each with a distinct permission set.
8. THE API SHALL return HTTP 403 for any request where the authenticated user's role lacks permission for the requested operation.
9. WHEN a user updates their profile (name, avatar, contact details), THE System SHALL persist the changes and reflect them across all views within one session refresh.
10. THE AuthService SHALL hash all passwords using bcrypt with a minimum cost factor of 12 before storage.

---

### Requirement 3: Role-Based Dashboards

**User Story:** As a user, I want a personalized dashboard that shows metrics and actions relevant to my role, so that I can quickly understand my current status and priorities.

#### Acceptance Criteria

1. WHEN an Admin authenticates, THE MobileApp SHALL display the Admin dashboard showing tenant-wide metrics: total active clients, total appointments for the current week, total revenue for the current month, and system health indicators.
2. WHEN a Coach authenticates, THE MobileApp SHALL display the Coach dashboard showing: upcoming appointments for the next 7 days, assigned clients count, pending tasks, and weekly session completion rate.
3. WHEN a Client authenticates, THE MobileApp SHALL display the Client dashboard showing: next scheduled appointment, active Routine, active NutritionPlan, and recent messages.
4. THE MobileApp SHALL render dashboard charts using weekly and monthly aggregations with a maximum data load time of 3 seconds on a standard 4G connection.
5. WHEN dashboard data is loading, THE MobileApp SHALL display a skeleton loading state to the user.

---

### Requirement 4: Appointment System

**User Story:** As a Coach or Admin, I want to create, edit, and cancel appointments, so that sessions are organized and clients are informed.

#### Acceptance Criteria

1. WHEN an Admin or Coach creates an appointment, THE System SHALL store the appointment with a status of "scheduled", the assigned Coach, the assigned Client(s), the start time, the end time, and the location or virtual link.
2. THE MobileApp SHALL display appointments in daily, weekly, and monthly calendar views.
3. WHEN a Coach marks their availability, THE System SHALL store available time slots and prevent double-booking by rejecting appointment creation that overlaps with an existing scheduled appointment for the same Coach.
4. IF an appointment creation request overlaps with an existing appointment for the assigned Coach, THEN THE System SHALL return a conflict error with the details of the conflicting appointment.
5. WHEN an appointment is created, edited, or cancelled, THE NotificationService SHALL send a push notification and an email notification to all participants within 60 seconds.
6. WHEN an appointment is scheduled 24 hours in the future, THE NotificationService SHALL send a reminder push notification and email to all participants.
7. WHEN a Client or Coach cancels an appointment, THE System SHALL update the appointment status to "cancelled" and record the cancellation timestamp and the user who cancelled.
8. THE System SHALL allow an Admin or Coach to edit appointment details (time, location, participants) up until 1 hour before the scheduled start time.

---

### Requirement 5: Client Management (CRM)

**User Story:** As a Coach or Admin, I want to create and manage client profiles with history, notes, and attachments, so that I can deliver personalized service.

#### Acceptance Criteria

1. WHEN an Admin or Coach creates a client record, THE System SHALL store the client's full name, email, phone number, date of birth, and Tenant association.
2. THE System SHALL maintain a chronological interaction history for each Client, including appointments attended, messages sent, plans assigned, and payments made.
3. WHEN a Coach or Admin adds a note to a Client record, THE System SHALL store the note with the author's identity and a creation timestamp.
4. WHEN a Coach or Admin uploads a file attachment to a Client record, THE System SHALL store the file in Supabase Storage and associate the file URL with the Client record, supporting file types: JPEG, PNG, PDF, with a maximum file size of 20 MB per file.
5. IF a file upload exceeds 20 MB, THEN THE System SHALL reject the upload and return a descriptive error message to the user.
6. THE MobileApp SHALL allow an Admin or Coach to search clients by name, email, or phone number with results returned within 1 second for datasets up to 10,000 clients per Tenant.

---

### Requirement 6: Training and Nutrition Management

**User Story:** As a Coach, I want to create and assign training routines and nutrition plans to clients, so that I can deliver structured programs and track progress.

#### Acceptance Criteria

1. WHEN a Coach creates a Routine, THE System SHALL store the routine with a name, description, list of exercises (each with sets, reps, duration, and rest period), and the creating Coach's identity.
2. WHEN a Coach assigns a Routine to a Client, THE System SHALL associate the Routine with the Client and record the assignment date and the assigning Coach.
3. WHEN a Coach creates a NutritionPlan, THE System SHALL store the plan with a name, description, daily meal entries (each with meal name, food items, macronutrient targets), and the creating Coach's identity.
4. WHEN a Coach assigns a NutritionPlan to a Client, THE System SHALL associate the NutritionPlan with the Client and record the assignment date.
5. WHEN a Client logs a progress entry (weight, body measurements, or workout completion), THE System SHALL store the entry with a timestamp and display it in a chronological progress chart on the Client's profile.
6. THE System SHALL allow Coaches to save Routines and NutritionPlans as reusable templates that can be duplicated and modified for new assignments.
7. WHEN a Coach edits an assigned Routine or NutritionPlan, THE System SHALL update the Client's active plan and record the modification with a timestamp.

---

### Requirement 7: Virtual Classes

**User Story:** As a Coach or Admin, I want to schedule and deliver virtual sessions, so that clients can attend remotely.

#### Acceptance Criteria

1. WHEN a Coach or Admin creates a VirtualClass, THE System SHALL store the class with a title, description, scheduled start time, maximum participant count, and an associated video conference link.
2. WHERE Zoom integration is enabled for a Tenant, THE System SHALL generate a Zoom meeting link automatically when a VirtualClass is created.
3. WHERE WebRTC is used, THE System SHALL generate a unique session room URL for the VirtualClass.
4. WHEN a Client joins a VirtualClass, THE System SHALL record the Client's attendance with a join timestamp.
5. WHEN a VirtualClass ends, THE System SHALL mark the class status as "completed" and store the final attendance list.
6. WHEN a VirtualClass is scheduled, THE NotificationService SHALL send a push notification and email to all enrolled Clients within 60 seconds of creation.

---

### Requirement 8: Internal Messaging

**User Story:** As a Client or Coach, I want to send and receive messages in real time, so that we can communicate without leaving the app.

#### Acceptance Criteria

1. THE MessagingService SHALL support one-to-one chat between a Client and a Coach within the same Tenant.
2. WHEN a user sends a message, THE MessagingService SHALL deliver the message to the recipient's active session within 2 seconds using Supabase Realtime.
3. WHEN a user receives a message while the MobileApp is in the background, THE NotificationService SHALL deliver a push notification containing the sender's name and a message preview within 30 seconds.
4. THE MobileApp SHALL display message history in chronological order with timestamps, loading the most recent 50 messages on initial view and supporting pagination for older messages.
5. THE MessagingService SHALL persist all messages in the database with the sender identity, recipient identity, Tenant, message body, and sent timestamp.
6. IF a message delivery fails due to a network error, THEN THE MobileApp SHALL queue the message locally and retry delivery when connectivity is restored.

---

### Requirement 9: Payments and Subscriptions

**User Story:** As an Admin, I want to manage subscription plans and process payments securely, so that the business can collect revenue and clients can access services.

#### Acceptance Criteria

1. THE PaymentService SHALL integrate with the Stripe API to process subscription payments using credit/debit cards.
2. WHEN a Tenant or Client initiates a subscription purchase, THE PaymentService SHALL create a Stripe Checkout session and redirect the user to the secure Stripe-hosted payment page.
3. WHEN a Stripe payment webhook event of type `payment_intent.succeeded` is received, THE PaymentService SHALL update the subscription status to "active" within 10 seconds.
4. WHEN a Stripe payment webhook event of type `payment_intent.payment_failed` is received, THE PaymentService SHALL update the subscription status to "past_due" and trigger a notification to the affected user within 10 seconds.
5. THE System SHALL support subscription plans with monthly and yearly billing cycles.
6. THE MobileApp SHALL display a payment history list for each Client and Tenant, showing date, amount, currency, and status for each transaction.
7. THE PaymentService SHALL never store raw card numbers or CVV values; all card data SHALL be handled exclusively by Stripe.
8. WHEN a subscription is cancelled, THE System SHALL retain the user's access until the end of the current billing period and then downgrade the account.

---

### Requirement 10: Electronic Invoicing (Costa Rica Compliance)

**User Story:** As an Admin, I want invoices to be generated automatically and comply with Costa Rica's electronic invoicing regulations, so that the business meets its legal obligations.

#### Acceptance Criteria

1. WHEN a payment is confirmed as successful, THE InvoicingService SHALL automatically generate an electronic invoice compliant with the Costa Rica Ministerio de Hacienda (Hacienda) electronic invoicing schema version 4.3.
2. THE InvoicingService SHALL submit each generated invoice to the Hacienda API and store the acceptance response (XML) alongside the invoice record.
3. IF the Hacienda API returns a rejection response, THEN THE InvoicingService SHALL store the rejection details, mark the invoice as "rejected", and notify the Admin within 60 seconds.
4. THE InvoicingService SHALL generate a PDF representation of each accepted invoice and store it in Supabase Storage.
5. WHEN an invoice is accepted, THE System SHALL send the PDF invoice to the Client's registered email address within 5 minutes.
6. THE InvoicingService SHALL assign a unique consecutive invoice number per Tenant in compliance with Hacienda numbering requirements.
7. THE System SHALL allow an Admin to view, search, and download all invoices for their Tenant, filtered by date range, client, or status.

---

### Requirement 11: Admin Panel

**User Story:** As an Admin, I want a comprehensive management panel, so that I can control users, plans, permissions, and system-wide settings for my Tenant.

#### Acceptance Criteria

1. THE MobileApp SHALL provide an Admin-only section where the Admin can create, edit, deactivate, and delete user accounts within their Tenant.
2. WHEN an Admin changes a user's role, THE RBAC SHALL apply the new permissions to that user's session within one session refresh.
3. THE MobileApp SHALL display tenant-wide analytics to the Admin, including total revenue per month, total appointments per week, active client count, and churn rate.
4. THE System SHALL allow an Admin to configure which feature modules are active for their Tenant based on their subscription plan.
5. THE System SHALL allow an Admin to manage subscription plan offerings, including plan name, price, billing cycle, and included feature modules.
6. WHEN an Admin deactivates a user account, THE AuthService SHALL immediately revoke all active sessions for that user.

---

### Requirement 12: AI Chatbot Assistant

**User Story:** As a user, I want an AI assistant available in the app, so that I can get quick answers to FAQs, scheduling help, and support without waiting for a human.

#### Acceptance Criteria

1. WHERE the AI module is enabled for a Tenant, THE AIAssistant SHALL be accessible to all users of that Tenant via a persistent chat interface in the MobileApp.
2. WHEN a user sends a message to the AIAssistant, THE AIAssistant SHALL send the message along with the user's role and relevant context (upcoming appointments, active plans) to the OpenAI API and return a response within 10 seconds.
3. THE AIAssistant SHALL maintain conversation context for a minimum of the last 10 message exchanges within a single session.
4. IF the OpenAI API is unavailable, THEN THE AIAssistant SHALL display a fallback message informing the user that the assistant is temporarily unavailable.
5. THE AIAssistant SHALL not expose any other user's personal data or Tenant data in its responses.

---

### Requirement 13: Notifications System

**User Story:** As a user, I want to receive timely push and email notifications for important events, so that I stay informed without having to check the app constantly.

#### Acceptance Criteria

1. THE NotificationService SHALL send push notifications to mobile devices using a platform-appropriate service (APNs for iOS, FCM for Android).
2. THE NotificationService SHALL send email notifications using a transactional email provider for the following events: appointment creation, appointment cancellation, appointment reminder (24 hours prior), payment confirmation, payment failure, and new message received.
3. WHEN a user opts out of a specific notification type, THE NotificationService SHALL not send that notification type to that user.
4. THE NotificationService SHALL deliver push notifications within 60 seconds of the triggering event under normal network conditions.
5. THE System SHALL store a notification log per user with the event type, delivery timestamp, and delivery status (delivered, failed).

---

### Requirement 14: Localization

**User Story:** As a user in a Spanish-speaking market, I want the app to default to Spanish, so that I can use it comfortably in my native language.

#### Acceptance Criteria

1. THE MobileApp SHALL default to Spanish (es-CR locale) for all UI text, date formats, currency formats, and error messages.
2. THE MobileApp SHALL support English (en-US) as a secondary language selectable by the user in their profile settings.
3. WHEN a user changes their language preference, THE MobileApp SHALL apply the new locale to all screens without requiring an app restart.
4. THE System SHALL format all monetary values using the Costa Rican Colón (CRC) symbol and format by default, with USD as a secondary option configurable per Tenant.

---

### Requirement 15: Performance and Offline Resilience

**User Story:** As a mobile user, I want the app to be fast and partially functional without internet, so that I can access key information even in low-connectivity situations.

#### Acceptance Criteria

1. THE MobileApp SHALL cache the authenticated user's dashboard data, upcoming appointments (next 7 days), and active Routine and NutritionPlan locally for offline access.
2. WHEN the device has no network connectivity, THE MobileApp SHALL display cached data and indicate to the user that the data may not be current.
3. WHEN network connectivity is restored, THE MobileApp SHALL synchronize local changes with the backend within 30 seconds.
4. THE MobileApp SHALL implement lazy loading for list views, loading a maximum of 20 items per page and fetching additional pages on scroll.
5. THE MobileApp SHALL achieve a Time to Interactive (TTI) of under 3 seconds on mid-range Android devices on a 4G connection for the main dashboard screen.

---

### Requirement 16: Security

**User Story:** As a platform operator, I want all data and API endpoints to be secured, so that user data is protected from unauthorized access and attacks.

#### Acceptance Criteria

1. THE API SHALL validate and sanitize all input parameters before processing, rejecting requests with malformed or unexpected data types.
2. THE API SHALL enforce Row-Level Security (RLS) policies in PostgreSQL so that database queries are automatically scoped to the authenticated user's Tenant.
3. THE AuthService SHALL rate-limit login attempts to a maximum of 10 attempts per email address per 15-minute window, returning HTTP 429 after the limit is exceeded.
4. THE System SHALL transmit all data over TLS 1.2 or higher.
5. THE System SHALL store all sensitive configuration values (API keys, secrets) in environment variables and never in source code or client-side bundles.
6. THE MobileApp SHALL not log or persist JWT tokens or refresh tokens in plaintext storage; tokens SHALL be stored in the platform's secure keychain or keystore.

---

### Requirement 17: UI/UX Standards

**User Story:** As a user, I want a clean, modern, and accessible interface, so that the app is easy and pleasant to use.

#### Acceptance Criteria

1. THE MobileApp SHALL support both light mode and dark mode, respecting the device's system-level theme preference by default.
2. WHEN a user manually selects a theme (light or dark) in their profile settings, THE MobileApp SHALL persist that preference and apply it on subsequent launches.
3. THE MobileApp SHALL use bottom tab navigation for primary sections and stack navigation for detail screens.
4. THE MobileApp SHALL meet WCAG 2.1 Level AA color contrast requirements for all text and interactive elements.
5. THE MobileApp SHALL display meaningful error messages in the user's selected language for all failed operations, rather than raw error codes.
6. WHEN a destructive action (delete, cancel appointment) is initiated, THE MobileApp SHALL present a confirmation dialog before executing the action.
