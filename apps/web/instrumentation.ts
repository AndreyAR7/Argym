export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  err: unknown,
  _request: unknown,
  _context: unknown,
) => {
  const { captureException } = await import('@sentry/nextjs')
  captureException(err)
}
