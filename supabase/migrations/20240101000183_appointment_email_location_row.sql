-- Inject {{location_row}} / {{location_row_table}} placeholders into the
-- appointment email templates so in-person appointments show the address
-- plus Google Maps / Waze links. Two anchor shapes exist across the 4
-- templates: appointment.created lays fields out as individual <p> rows,
-- while confirmed/cancelled/reminder share a <table><tr><td> info block.
-- send-communication renders both variables every time (empty string when
-- the appointment isn't in_person or has no location), so injecting both
-- placeholders is safe regardless of which one a given template ends up
-- using.

UPDATE public.email_templates
SET body_html = REPLACE(
  body_html,
  '<p style="margin:8px 0;font-size:16px;">
📍 <strong>Gimnasio:</strong> {{gym_name}}
</p>',
  '<p style="margin:8px 0;font-size:16px;">
📍 <strong>Gimnasio:</strong> {{gym_name}}
</p>

{{location_row}}'
)
WHERE body_html LIKE '%📍 <strong>Gimnasio:</strong> {{gym_name}}%'
  AND body_html NOT LIKE '%{{location_row}}%';

UPDATE public.email_templates
SET body_html = REPLACE(
  body_html,
  '<tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr>',
  '<tr><td style="padding:5px 0;color:#6b7280;white-space:nowrap;width:130px">&#127947;&#65039; Coach</td><td style="padding:5px 0;font-weight:600;color:#111827">{{coach_name}}</td></tr>{{location_row_table}}'
)
WHERE body_html LIKE '%&#127947;&#65039; Coach%'
  AND body_html NOT LIKE '%{{location_row_table}}%';
