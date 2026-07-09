import Link from 'next/link'

export const metadata = {
  title: 'Términos de Servicio — ARGYM',
  description: 'Términos y condiciones de uso de la plataforma ARGYM.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <header className="space-y-2">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Volver al inicio</Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Términos de Servicio</h1>
          <p className="text-sm text-gray-500">Última actualización: julio 2026</p>
        </header>

        <section className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">1. Aceptación de los términos</h2>
            <p>Al acceder o usar la plataforma ARGYM, aceptas quedar vinculado por estos Términos de Servicio. Si no aceptas alguno de los términos, no debes usar el servicio.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">2. Descripción del servicio</h2>
            <p>ARGYM es una plataforma SaaS de gestión para gimnasios que incluye administración de membresías, programación de citas, seguimiento de progreso, videoteca, gamificación y módulos de comunicación. El servicio se presta bajo suscripción mensual o anual.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">3. Cuentas de usuario</h2>
            <p>Cada gimnasio (inquilino) es responsable de mantener la confidencialidad de las credenciales de sus usuarios y de todas las actividades que ocurran bajo sus cuentas. Debes notificarnos inmediatamente ante cualquier uso no autorizado.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">4. Facturación y pagos</h2>
            <p>Los planes de suscripción se cobran por adelantado. Los pagos se procesan mediante Stripe. Si un pago falla, el acceso puede suspenderse tras un período de gracia de 3 días. No se emiten reembolsos por períodos parciales.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">5. Propiedad intelectual</h2>
            <p>Todo el contenido de la plataforma ARGYM (código, diseño, marca, logotipos) es propiedad de ARGYM o sus licenciantes y está protegido por leyes de propiedad intelectual. Los datos y contenidos que el gimnasio cargue (fotos, videos, información de clientes) pertenecen al gimnasio.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">6. Privacidad de datos</h2>
            <p>El tratamiento de datos personales se rige por nuestra <Link href="/privacy" className="text-blue-600 hover:underline">Política de Privacidad</Link>. Cumplimos con la Ley de Protección de la Persona Frente al Tratamiento de sus Datos Personales de Costa Rica (Ley 8968).</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">7. Limitación de responsabilidad</h2>
            <p>ARGYM no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso del servicio. Nuestra responsabilidad total no excederá el monto pagado en los 12 meses anteriores al reclamo.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">8. Terminación</h2>
            <p>Puedes cancelar tu suscripción en cualquier momento desde el portal de administración. ARGYM puede suspender o terminar el acceso por incumplimiento de estos términos, previo aviso cuando sea posible.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">9. Modificaciones</h2>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Notificaremos cambios significativos por email con al menos 30 días de anticipación. El uso continuo del servicio constituye aceptación de los nuevos términos.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">10. Ley aplicable</h2>
            <p>Estos términos se rigen por las leyes de Costa Rica. Cualquier disputa se someterá a la jurisdicción de los tribunales de San José, Costa Rica.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">11. Contacto</h2>
            <p>Para consultas sobre estos términos: <a href="mailto:legal@argym.app" className="text-blue-600 hover:underline">legal@argym.app</a></p>
          </div>

        </section>
      </div>
    </div>
  )
}
