# Bugfix Requirements Document

## Introduction

Se han detectado múltiples errores de continuidad en el monorepo ARGYM (Expo/React Native + Supabase) que causan crashes en runtime, divergencias entre tipos TypeScript y la base de datos, validaciones débiles, código muerto que genera confusión, y configuraciones inconsistentes. Estos bugs afectan la estabilidad, la type-safety y la integridad de datos del sistema multi-tenant con roles admin/coach/client.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a coach taps a push notification THEN the system crashes because `router.push('/(coach)/notifications')` references a route file (`app/(coach)/notifications.tsx`) that does not exist

1.2 WHEN a client taps a push notification THEN the system crashes because `router.push('/(client)/notifications')` references a route file (`app/(client)/notifications.tsx`) that does not exist

1.3 WHEN a subscription record is read from `user_subscriptions` table with status `'pending'` THEN the TypeScript type `SubscriptionStatus` does not include `'pending'` causing type mismatches at runtime

1.4 WHEN a subscription record has status `'trialing'` or `'past_due'` according to the TypeScript type THEN the database column (using `subscription_status_type` enum) rejects these values causing insert/update failures

1.5 WHEN a plan record is read from the `plans` table with `billing_cycle = 'one_time'` THEN the shared TypeScript type `BillingCycle = 'monthly' | 'yearly'` does not recognize the value causing type errors

1.6 WHEN a profile is read from the database with `theme = 'midnight'`, `'violet'`, or `'emerald'` THEN the TypeScript type `UserTheme = 'system' | 'light' | 'dark'` marks it as invalid despite the app fully supporting these themes

1.7 WHEN the `packages/types/src/errors.ts` defines `FORBIDDEN` (AUTH_005), `OFFLINE` (NET_002), and `SERVER_ERROR` (GEN_003) THEN the app's `lib/types.ts` `AppErrorCode` enum does not include these codes causing missing error handling coverage

1.8 WHEN a user registers with a password of 6 characters without complexity requirements THEN the app's local validation (`lib/validations.ts`) accepts it, allowing weak passwords that would be rejected by the package-level schema (min 8, uppercase+lowercase+number required)

1.9 WHEN the `auth.store.ts` reads profile fields `approval_status`, `rejection_reason`, and `email` from the database THEN the `Profile` interface in `lib/types.ts` does not declare these fields, requiring an unsafe `as unknown as Profile` cast that eliminates type safety

1.10 WHEN `app/(client)/exercise-demo.tsx` is navigated to THEN the file is not registered in `app/(client)/_layout.tsx` Stack.Screen declarations causing inconsistent navigation behavior (no configured animation/transition)

1.11 WHEN tools read workspace configuration from `package.json` THEN only `"apps/mobile"` is declared in workspaces, while `pnpm-workspace.yaml` declares `'apps/*'` and `'packages/*'`, causing inconsistency for tooling that reads `package.json` workspaces

1.12 WHEN `packages/types`, `packages/services`, and `packages/validations` exist in the repo THEN they are never imported by `apps/mobile` (not listed in its `package.json` dependencies) and contain divergent type definitions (e.g., `Profile` missing `client_level`), creating dead code that misleads developers

### Expected Behavior (Correct)

2.1 WHEN a coach taps a push notification THEN the system SHALL navigate to a valid notifications screen within the coach route group without crashing

2.2 WHEN a client taps a push notification THEN the system SHALL navigate to a valid notifications screen within the client route group without crashing

2.3 WHEN a subscription record is read from `user_subscriptions` table THEN the TypeScript type SHALL include all values from `subscription_status_type` enum: `'active' | 'cancelled' | 'expired' | 'pending'`

2.4 WHEN TypeScript code references subscription statuses THEN the type SHALL match exactly the `subscription_status_type` enum used by the `user_subscriptions` table, without including values (`'trialing'`, `'past_due'`) that the database rejects

2.5 WHEN a plan record is read from the `plans` table THEN the TypeScript type `BillingCycle` SHALL include `'one_time'` to match the `billing_cycle_type` database enum (`'monthly' | 'yearly' | 'one_time'`)

2.6 WHEN a profile is read from the database THEN the TypeScript type `UserTheme` SHALL include all supported theme values: `'system' | 'light' | 'dark' | 'midnight' | 'violet' | 'emerald'`

2.7 WHEN error codes are used in the application THEN the `AppErrorCode` enum in `lib/types.ts` SHALL include `FORBIDDEN` (AUTH_005), `OFFLINE` (NET_002), and `SERVER_ERROR` (GEN_003) for complete error handling coverage

2.8 WHEN a user registers THEN the password validation SHALL require a minimum of 8 characters with at least one uppercase letter, one lowercase letter, and one number, and email SHALL be normalized to lowercase

2.9 WHEN profile data is loaded in `auth.store.ts` THEN the `Profile` interface SHALL declare `approval_status`, `rejection_reason`, and `email` fields so that no unsafe type casts are needed

2.10 WHEN `app/(client)/exercise-demo.tsx` is used THEN it SHALL be registered as a `Stack.Screen` in `app/(client)/_layout.tsx` with proper animation configuration consistent with the rest of the navigation

2.11 WHEN the root `package.json` declares workspaces THEN it SHALL include both `'apps/*'` and `'packages/*'` to match `pnpm-workspace.yaml` and avoid tooling inconsistencies

2.12 WHEN shared packages (`packages/types`, `packages/services`, `packages/validations`) exist THEN either they SHALL be properly integrated as dependencies in `apps/mobile/package.json` with synchronized type definitions, or they SHALL be removed/archived to eliminate dead code confusion

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin taps a push notification THEN the system SHALL CONTINUE TO navigate to `/(admin)/notifications` as currently implemented

3.2 WHEN navigation occurs to existing registered routes (e.g., `/(coach)/clients`, `/(client)/inicio`) THEN the system SHALL CONTINUE TO navigate correctly with the configured fade animation

3.3 WHEN subscription records have status `'active'`, `'cancelled'`, or `'expired'` THEN the system SHALL CONTINUE TO handle these values correctly in both TypeScript and database operations

3.4 WHEN plans have `billing_cycle` of `'monthly'` or `'yearly'` THEN the system SHALL CONTINUE TO process them correctly without any type errors

3.5 WHEN a profile has `theme = 'system'`, `'light'`, or `'dark'` THEN the system SHALL CONTINUE TO apply these themes correctly

3.6 WHEN existing error codes (`INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `RATE_LIMIT_EXCEEDED`, `UNAUTHORIZED`, `TENANT_NOT_FOUND`, `MODULE_DISABLED`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `NETWORK_ERROR`, `UNKNOWN`, `NOT_FOUND`) are used THEN the system SHALL CONTINUE TO handle them with no changes

3.7 WHEN a user signs in with valid credentials THEN the sign-in validation SHALL CONTINUE TO work correctly

3.8 WHEN `auth.store.ts` performs sign-in, sign-out, token refresh, and permission fetching THEN these operations SHALL CONTINUE TO function correctly

3.9 WHEN existing client screens (`inicio`, `progress`, `routine`, `nutrition`, `videos`, `plans`, `promotions`, `profile`, `client-appointments`, `video-player`) are navigated to THEN they SHALL CONTINUE TO render correctly with current animation settings

3.10 WHEN `pnpm install` is run THEN the workspace resolution SHALL CONTINUE TO work correctly for all existing packages

3.11 WHEN the app imports from `@/lib/types`, `@/lib/validations`, or `@/store/auth.store` THEN these local imports SHALL CONTINUE TO resolve correctly
