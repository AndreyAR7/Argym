-- Per-tenant primary color for branded login/register pages (slug-routed,
-- e.g. /login/carogym). logo_url already exists and is reused as-is.
ALTER TABLE public.tenants ADD COLUMN primary_color TEXT;
