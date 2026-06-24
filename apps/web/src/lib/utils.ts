import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale = 'es-CR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date)
}

export function formatCurrency(amount: number, currency = 'CRC', locale = 'es-CR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}
