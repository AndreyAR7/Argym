-- Replace Impetú's basic seed_tenant_defaults() templates/rules with a
-- full copy of CaroGym's richer set, adapted with Impetú's brand color
-- (#6C63FF -> #3B7AF7) and fixing one template ("Nueva cita creada") that
-- hardcoded the literal word "ARGYM" instead of the {{gym_name}} variable
-- every other template already uses correctly.

DELETE FROM public.communication_rules WHERE tenant_id = '0d9a6996-d1c7-494e-a92a-72e240d1d582';
DELETE FROM public.email_templates    WHERE tenant_id = '0d9a6996-d1c7-494e-a92a-72e240d1d582';

WITH inserted_templates AS (
  INSERT INTO public.email_templates (tenant_id, name, subject, body_html, variables)
  SELECT
    '0d9a6996-d1c7-494e-a92a-72e240d1d582'::uuid,
    name,
    subject,
    REPLACE(REPLACE(body_html, '#6C63FF', '#3B7AF7'), 'ARGYM', '{{gym_name}}'),
    variables
  FROM public.email_templates
  WHERE tenant_id = '1101f246-8804-4ffb-b0a8-50f9ce7925da'
    AND name != 'Cita creada — pendiente de confirmación'  -- orphan template, no active rule uses it
  RETURNING id, name
),
rule_source AS (
  SELECT cr.name AS rule_name, cr.event_type, cr.recipients, cr.delay_minutes, cr.is_active,
         et.name AS template_name
  FROM public.communication_rules cr
  JOIN public.email_templates et ON et.id = cr.template_id
  WHERE cr.tenant_id = '1101f246-8804-4ffb-b0a8-50f9ce7925da'
)
INSERT INTO public.communication_rules (tenant_id, name, event_type, template_id, recipients, delay_minutes, is_active)
SELECT
  '0d9a6996-d1c7-494e-a92a-72e240d1d582'::uuid,
  rs.rule_name, rs.event_type, it.id, rs.recipients, rs.delay_minutes, rs.is_active
FROM rule_source rs
JOIN inserted_templates it ON it.name = rs.template_name;
