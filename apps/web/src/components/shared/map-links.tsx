'use client'

import { Navigation, MapPinned } from 'lucide-react'

interface MapLinksProps {
  location: string
  className?: string
}

// Opens the address in the native Google Maps / Waze app when available
// (both URL schemes fall back to the web app in a browser).
export function MapLinks({ location, className }: MapLinksProps) {
  const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      <a
        href={gMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#4285F4' }}
      >
        <MapPinned size={12} />
        Google Maps
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#33CCFF' }}
      >
        <Navigation size={12} />
        Waze
      </a>
    </div>
  )
}
