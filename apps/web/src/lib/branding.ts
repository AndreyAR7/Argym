// ARGYM platform-level branding — the SaaS itself, not any single gym.
// Used as the default/fallback logo wherever no tenant-specific branding
// applies (generic /login, super-admin "ARGYM HQ" panel, app chrome brand mark).
const TENANT_LOGOS_BASE =
  'https://soxlhslpgnegmihjdwod.supabase.co/storage/v1/object/public/tenant-logos/_platform'

export const ARGYM_LOGO_URL = `${TENANT_LOGOS_BASE}/logo.png`
