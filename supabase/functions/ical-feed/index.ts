import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Public, unauthenticated endpoint (see supabase/config.toml — verify_jwt
// disabled for this function): calendar apps (Apple/Google Calendar,
// Outlook) subscribe to a webcal:// URL directly, with no way to attach a
// Supabase session or custom header. The opaque token in the URL path
// IS the credential — see 20240101000180_ical_feed_token.sql for why it
// lives in its own table instead of a profiles column.
//
// Read-only by design: this never writes anything, and only ever reads
// the token owner's own appointments (as coach, client, or group-class
// participant) — never another tenant's or another user's data.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function icsDate(iso: string): string {
  // RFC 5545 UTC form: YYYYMMDDTHHMMSSZ
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function foldLine(line: string): string {
  // RFC 5545 §3.1: lines over 75 octets must be folded with CRLF + a
  // leading space. Titles/locations are short in practice, but a long one
  // must not silently produce an invalid .ics.
  if (line.length <= 75) return line
  let out = line.slice(0, 75)
  let rest = line.slice(75)
  while (rest.length > 0) {
    out += '\r\n ' + rest.slice(0, 74)
    rest = rest.slice(74)
  }
  return out
}

interface AppointmentRow {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  status: string
  location: string | null
}

function buildIcs(rows: AppointmentRow[], calendarName: string): string {
  const now = icsDate(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ARGYM//ical-feed//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const a of rows) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${a.id}@argym`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(a.start_time)}`,
      `DTEND:${icsDate(a.end_time)}`,
      `SUMMARY:${icsEscape(a.title)}`,
      `STATUS:${a.status === 'cancelled' ? 'CANCELLED' : a.status === 'pending_confirmation' ? 'TENTATIVE' : 'CONFIRMED'}`,
    )
    if (a.location) lines.push(`LOCATION:${icsEscape(a.location)}`)
    if (a.description) lines.push(`DESCRIPTION:${icsEscape(a.description)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const token = segments[segments.length - 1]

  if (!token || !UUID_RE.test(token)) {
    return new Response('Invalid token', { status: 400 })
  }

  const { data: tokenRow } = await supabaseAdmin
    .from('ical_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow) {
    return new Response('Not found', { status: 404 })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, tenant_id')
    .eq('id', tokenRow.user_id)
    .single()

  if (!profile) {
    return new Response('Not found', { status: 404 })
  }

  // Own 1:1 appointments (as coach or client) — cancelled ones excluded,
  // a calendar feed should show what's actually happening, not history.
  const { data: direct } = await supabaseAdmin
    .from('appointments')
    .select('id, title, description, start_time, end_time, status, location')
    .eq('tenant_id', profile.tenant_id)
    .or(`coach_id.eq.${profile.id},client_id.eq.${profile.id}`)
    .neq('status', 'cancelled')
    .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('start_time', { ascending: true })
    .limit(300)

  // Group classes the person is a confirmed/pending participant in.
  const { data: participantRows } = await supabaseAdmin
    .from('appointment_participants')
    .select('appointment_id, status, appointments!inner(id, title, description, start_time, end_time, status, location, tenant_id)')
    .eq('user_id', profile.id)
    .neq('status', 'cancelled')
    .eq('appointments.tenant_id', profile.tenant_id)
    .neq('appointments.status', 'cancelled')
    .gte('appointments.start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(300)

  const seen = new Set<string>()
  const rows: AppointmentRow[] = []

  for (const a of direct ?? []) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    rows.push(a as AppointmentRow)
  }
  for (const p of participantRows ?? []) {
    const a = (p as unknown as { appointments: AppointmentRow }).appointments
    if (!a || seen.has(a.id)) continue
    seen.add(a.id)
    rows.push(a)
  }

  rows.sort((a, b) => a.start_time.localeCompare(b.start_time))

  const ics = buildIcs(rows, `${profile.full_name} · ARGYM`)

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendario.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  })
})
