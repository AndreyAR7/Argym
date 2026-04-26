/**
 * Centralized asset registry.
 * All images used in the app are referenced from here.
 *
 * Structure:
 *   assets/images/brand/      → logos, brand marks
 *   assets/images/onboarding/ → onboarding screens
 *   assets/images/icons/      → custom icons
 *
 * HOW TO ADD THE LOGO:
 *   1. Copy your logo file to:
 *      saas-client-management-platform/apps/mobile/assets/images/brand/logo.png
 *   2. Restart Metro with: npx expo start -c
 *   3. The AppLogo component will automatically use it everywhere.
 */

// Use AppLogo component instead of importing directly here.
// AppLogo handles the missing-file case gracefully.
export {};
