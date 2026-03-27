export type DistanceFilter = 500 | 1000 | 3000 | 5000 | 10000 | 50000

export type GPUTier = '3060+' | '4060+' | '4080+'

export type PeripheralBrand = 'Logitech' | 'Razer' | 'Corsair' | 'HyperX' | 'SteelSeries'

export interface VenueFilters {
  // 가격대 필터: Min hourly price (500-3000원, step 100)
  maxPrice: number | null
  
  // 거리 필터: Radius in meters
  distance: DistanceFilter
  
  // 사양 필터: Minimum GPU tier
  gpuTier: GPUTier | null
  
  // 주변기기 필터: Preferred peripheral brands
  peripheralBrands: PeripheralBrand[]
  
  // 영업시간 필터
  onlyOpen: boolean    // Currently open (based on current time)
  only24Hours: boolean // Only show 24-hour venues
}

export interface OperatingHours {
  weekday?: string
  weekend?: string
}

export const DEFAULT_FILTERS: VenueFilters = {
  maxPrice: null,
  distance: 50000, // Default 50km radius — shows all Seoul venues
  gpuTier: null,
  peripheralBrands: [],
  onlyOpen: false,
  only24Hours: false
}

// Helper to check if filters are at default state
export function areFiltersDefault(filters: VenueFilters): boolean {
  return (
    filters.maxPrice === null &&
    filters.distance === 50000 &&
    filters.gpuTier === null &&
    filters.peripheralBrands.length === 0 &&
    filters.onlyOpen === false &&
    filters.only24Hours === false
  )
}

// GPU tier parsing helper
export function getGPUTierNumber(gpuModel: string): number {
  const match = gpuModel.match(/(\d{4})/)
  return match ? parseInt(match[1]) : 0
}

// Check if GPU meets minimum tier requirement
export function meetsGPUTier(gpuModel: string, minTier: GPUTier | null): boolean {
  if (!minTier) return true
  
  const gpuNumber = getGPUTierNumber(gpuModel)
  const minNumber = parseInt(minTier.replace('+', ''))
  
  return gpuNumber >= minNumber
}

// Check if venue is currently open
export function isVenueOpen(operatingHours: OperatingHours | null | undefined): boolean {
  if (!operatingHours || typeof operatingHours !== 'object') return false
  
  const now = new Date()
  const day = now.getDay() // 0=Sunday, 1=Monday, etc.
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  // Determine if weekday or weekend
  const isWeekend = day === 0 || day === 6
  const scheduleKey = isWeekend ? 'weekend' : 'weekday'
  const schedule = operatingHours[scheduleKey] as string | undefined
  
  if (!schedule || schedule === '') return false
  if (schedule === '00:00-24:00') return true // 24-hour operation
  
  // Parse schedule (format: "09:00-23:00")
  const [openTime, closeTime] = schedule.split('-')
  if (!openTime || !closeTime) return false
  
  return currentTime >= openTime && currentTime <= closeTime
}

// Check if venue is 24-hour
export function is24Hour(operatingHours: OperatingHours | null | undefined): boolean {
  if (!operatingHours || typeof operatingHours !== 'object') return false
  
  const weekday = operatingHours.weekday as string | undefined
  const weekend = operatingHours.weekend as string | undefined
  
  return weekday === '00:00-24:00' && weekend === '00:00-24:00'
}
