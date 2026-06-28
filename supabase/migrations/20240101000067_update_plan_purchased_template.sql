-- Update the "Plan adquirido" email template to a formal payment receipt
-- that includes invoice number, billing cycle, price, dates, and payment reference.
-- Runs for all tenants that have the template seeded.

DO $$
DECLARE
  v_body TEXT := '<div style="font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#6C63FF;padding:24px 32px">
    <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">{{gym_name}}</h1>
  </div>
  <div style="padding:32px">
    <p style="margin:0 0 6px;font-size:15px;color:#374151">Hola <strong>{{client_name}}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151">Tu pago ha sido procesado exitosamente. A continuaci&oacute;n encontrar&aacute;s el comprobante de tu suscripci&oacute;n en <strong>{{gym_name}}</strong>.</p>

    <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 24px">

      <div style="background:#6C63FF;padding:14px 20px">
        <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.8px">Comprobante de pago</p>
        <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#ffffff">{{invoice_number}}</p>
      </div>

      <div style="padding:18px 20px;background:#ffffff;border-bottom:1px solid #f3f4f6">
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827">{{plan_name}}</p>
        <p style="margin:5px 0 0;font-size:13px;color:#6b7280">{{billing_cycle}} &middot; {{gym_name}}</p>
      </div>

      <div style="padding:16px 20px;background:#ffffff">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr>
            <td style="padding:6px 0;color:#6b7280">Monto pagado</td>
            <td style="padding:6px 0;font-weight:700;color:#111827;text-align:right;font-size:15px">{{price}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Tipo de cobro</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{billing_cycle}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Fecha de pago</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{payment_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280">Vigente hasta</td>
            <td style="padding:6px 0;font-weight:600;color:#111827;text-align:right">{{end_date}}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding:12px 0 0"><div style="height:1px;background:#f3f4f6"></div></td>
          </tr>
          <tr>
            <td style="padding:10px 0 4px;color:#9ca3af;font-size:11px">N&uacute;mero de factura</td>
            <td style="padding:10px 0 4px;color:#9ca3af;font-size:11px;text-align:right">{{invoice_number}}</td>
          </tr>
          <tr>
            <td style="padding:0 0 6px;color:#9ca3af;font-size:11px">Referencia de pago</td>
            <td style="padding:0 0 6px;color:#9ca3af;font-size:11px;text-align:right;word-break:break-all">{{payment_reference}}</td>
          </tr>
        </table>
      </div>

      <div style="padding:12px 20px;background:#f0fdf4;border-top:1px solid #bbf7d0;text-align:center">
        <span style="font-size:13px;font-weight:700;color:#15803d">&#10003; &nbsp;Pago confirmado</span>
      </div>

    </div>

    <div style="text-align:center;margin:0 0 24px">
      <a href="{{login_url}}" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Acceder a mi cuenta</a>
    </div>

    <p style="margin:0;font-size:13px;color:#6b7280">Si tienes alguna pregunta sobre esta suscripci&oacute;n, responde a este correo o cont&aacute;ctanos directamente. Guarda este mensaje como comprobante de tu pago.</p>
    <p style="margin:12px 0 0;font-size:13px;color:#6b7280">&iexcl;Gracias por confiar en <strong>{{gym_name}}</strong>!</p>
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">{{gym_name}} &middot; Email autom&aacute;tico &middot; No responder a este mensaje</p>
  </div>
</div>';
BEGIN
  UPDATE public.email_templates
     SET subject   = '{{gym_name}}: Comprobante de pago — {{plan_name}}',
         body_html = v_body,
         variables = ARRAY['client_name','plan_name','billing_cycle','price','payment_date','end_date','invoice_number','payment_reference','gym_name','login_url'],
         updated_at = NOW()
   WHERE name = 'Plan adquirido';
END;
$$;
