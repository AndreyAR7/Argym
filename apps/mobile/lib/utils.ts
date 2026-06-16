/**
 * General-purpose utility functions for the mobile app.
 *
 * Note: `formatDuration` here returns a human-readable '1h 30m' / '45m' string.
 * The videos module (types/videos.ts) exports its own `formatDuration` that uses
 * the HH:MM:SS clock format suited for video playback — they serve different purposes.
 */

// ─── Date / Time ─────────────────────────────────────────────────────────────

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

/**
 * Formats a date string using the es-CR locale.
 * Returns '—' for invalid or empty inputs.
 */
export function formatDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CR', options);
}

/**
 * Formats a date string to include both date and time.
 * Returns '—' for invalid inputs.
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a date string to show time only (HH:MM).
 * Returns '—' for invalid inputs.
 */
export function formatTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Converts a duration in seconds to a human-readable string.
 * Examples: 5400 → '1h 30m', 2700 → '45m', 0 → '0m'
 *
 * For the HH:MM:SS clock format used in the video player, use
 * `formatDuration` from `types/videos.ts` instead.
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Capitalizes the first letter of a string, leaving the rest unchanged.
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to `maxLength` characters, appending '…' if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

/**
 * Returns a Spanish greeting based on the current hour:
 * - 00–11 → 'Buenos días'
 * - 12–18 → 'Buenas tardes'
 * - 19–23 → 'Buenas noches'
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour <= 18) return 'Buenas tardes';
  return 'Buenas noches';
}
