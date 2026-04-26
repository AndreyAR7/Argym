export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

export function formatAppointmentDateTime(iso: string): string {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  const date = isToday
    ? 'Hoy'
    : d.toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${date} · ${time}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}
