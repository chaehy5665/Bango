// src/utils/geo-parser.ts

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Parse PostGIS EWKB hex string to {lat, lng}
 * Format: 01 (endian) + 01000020 (type w/ SRID) + E6100000 (SRID 4326) + X (8 bytes) + Y (8 bytes)
 * Total length for SRID 4326 Point: 1 + 4 + 4 + 8 + 8 = 25 bytes = 50 hex chars
 * Or standard WKB: 1 + 4 + 8 + 8 = 21 bytes = 42 hex chars
 */
export function parsePostGISPoint(hex: string): LatLng | null {
  try {
    if (!hex || typeof hex !== 'string') return null
    
    // Remove '0x' prefix if present
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    
    // Basic validation for Point geometry
    // EWKB with SRID 4326 (0101000020E6100000...)
    // byte 0: 01 (little endian)
    // bytes 1-4: 01000020 (Point type + SRID flag)
    // bytes 5-8: E6100000 (SRID 4326)
    // bytes 9-16: X (longitude)
    // bytes 17-24: Y (latitude)
    
    // We can just grab the last 16 bytes (32 hex chars) which are X and Y doubles
    // regardless of header (as long as it's a Point)
    
    if (cleanHex.length < 32) return null
    
    const xHex = cleanHex.slice(cleanHex.length - 32, cleanHex.length - 16)
    const yHex = cleanHex.slice(cleanHex.length - 16)
    
    const buffer = new ArrayBuffer(16)
    const view = new DataView(buffer)
    
    // Parse X (longitude)
    for (let i = 0; i < 8; i++) {
      view.setUint8(i, parseInt(xHex.substr(i * 2, 2), 16))
    }
    const lng = view.getFloat64(0, true) // little endian
    
    // Parse Y (latitude)
    for (let i = 0; i < 8; i++) {
      view.setUint8(8 + i, parseInt(yHex.substr(i * 2, 2), 16))
    }
    const lat = view.getFloat64(8, true) // little endian
    
    return { lat, lng }
  } catch (e) {
    console.error('Error parsing PostGIS point:', e)
    return null
  }
}
