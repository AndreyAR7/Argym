-- ============================================================
-- Migration 000145: Document why avatars stay publicly readable
--
-- The audit flagged avatars_public_read (000105) as inconsistent with
-- videos/video-thumbnails, which were tightened to authenticated +
-- tenant-folder reads in 000110 after they turned out to gate paid
-- content. Reviewed and left as-is on purpose, not an oversight:
--
--   1. Low sensitivity — profile photos, not paid/paywalled content.
--   2. The check-in monitor kiosk (apps/web/src/app/monitor/[branchId])
--      has NO user session at all (it's a public unattended screen at
--      the gym entrance) and renders a scanning client's avatar_url
--      directly via a plain <img src> the instant they check in — see
--      monitor-display.tsx:296. Restricting this bucket to
--      `authenticated` (the videos pattern) would 403 every avatar on
--      that screen and break an already-shipped feature.
--
-- Write access was already correctly scoped to each user's own folder
-- (avatars_user_insert/update/delete, unchanged here) — only read
-- was ever public, and that's staying public deliberately.
-- ============================================================

COMMENT ON POLICY "avatars_public_read" ON storage.objects IS
  'Intentionally public (unlike videos/thumbnails): low-sensitivity profile photos, and the unauthenticated check-in monitor kiosk renders them directly. See migration 000145.';
