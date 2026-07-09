import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad — ARGYM',
  description: 'Política de privacidad y tratamiento de datos personales de ARGYM.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Volver al inicio</Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Política de Privacidad</h1>
          <p className="text-sm text-gray-500">Última actualización: julio 2026</p>
        </header>

        <section className="space-y-6 text-gray-700 dark:text-gray-300">

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. Responsable del tratamiento</h2>
            <p>ARGYM es el responsable del tratamiento de los datos personales recopilados a través de esta plataforma. Contacto: <a href="mailto:privacidad@argym.app" className="text-blue-600 hover:underline">privacidad@argym.app</a></p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. Datos que recopilamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (cifrada).</li>
              <li><strong>Datos de perfil:</strong> foto de perfil, teléfono, nivel de condición física.</li>
              <li><strong>Datos de uso:</strong> citas, asistencias, progreso de entrenamiento, videos vistos.</li>
              <li><strong>Datos de pago:</strong> referencia de transacción (nunca almacenamos números de tarjeta — Stripe los procesa directamente).</li>
              <li><strong>Datos técnicos:</strong> token de notificación push, dirección IP (logs del servidor).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. Finalidad del tratamiento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Proveer las funcionalidades de la plataforma (gestión de miembros, citas, pagos).</li>
              <li>Enviar comunicaciones relacionadas con el servicio (confirmaciones, recordatorios).</li>
              <li>Mejorar la plataforma mediante análisis de uso agregado y anonimizado.</li>
              <li>Cumplir obligaciones legales y prevenir fraudes.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">4. Base legal</h2>
            <p>El tratamiento de datos se basa en: (a) la ejecución del contrato de servicio con el gimnasio, (b) el consentimiento del usuario al registrarse, y (c) el interés legítimo para seguridad y prevención de fraudes.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5. Compartición de datos</h2>
            <p>No vendemos datos personales a terceros. Compartimos datos únicamente con:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Stripe:</strong> procesamiento de pagos (cumple PCI DSS).</li>
              <li><strong>Supabase:</strong> infraestructura de base de datos y autenticación.</li>
              <li><strong>Expo/Firebase:</strong> envío de notificaciones push.</li>
              <li><strong>Sentry:</strong> monitoreo de errores (datos técnicos anonimizados).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">6. Retención de datos</h2>
            <p>Conservamos los datos mientras la cuenta esté activa y por el período requerido por ley (máximo 7 años para registros contables). Al cancelar la suscripción, los datos se eliminan en un plazo de 90 días, excepto los requeridos legalmente.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">7. Derechos del titular</h2>
            <p>De acuerdo con la Ley 8968 de Costa Rica, tienes derecho a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Acceso:</strong> solicitar una copia de tus datos.</li>
              <li><strong>Rectificación:</strong> corregir datos incorrectos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de tus datos.</li>
              <li><strong>Oposición:</strong> oponerte a determinados tratamientos.</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
            </ul>
            <p className="mt-2">Para ejercer estos derechos, escríbenos a <a href="mailto:privacidad@argym.app" className="text-blue-600 hover:underline">privacidad@argym.app</a>.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">8. Seguridad</h2>
            <p>Implementamos medidas técnicas y organizativas para proteger tus datos: cifrado en tránsito (HTTPS/TLS 1.3), cifrado en reposo, políticas de acceso por rol (RLS), autenticación de dos factores disponible, y auditorías periódicas de seguridad.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">9. Cookies</h2>
            <p>Usamos cookies estrictamente necesarias para la sesión de usuario y preferencias de idioma/tema. No usamos cookies de rastreo publicitario de terceros.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">10. Cambios a esta política</h2>
            <p>Notificaremos cambios materiales por email. El uso continuo tras la notificación constituye aceptación.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">11. Contacto</h2>
            <p>
              Para cualquier consulta de privacidad: <a href="mailto:privacidad@argym.app" className="text-blue-600 hover:underline">privacidad@argym.app</a><br/>
              También puede presentar una reclamación ante la Agencia de Protección de Datos de los Habitantes (PRODHAB) de Costa Rica.
            </p>
          </div>

        </section>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
          <Link href="/terms" className="hover:underline">Términos de Servicio</Link>
          {' · '}
          <Link href="/" className="hover:underline">Inicio</Link>
        </div>
      </div>
    </div>
  )
}
