'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { VenueFilters, DEFAULT_FILTERS, DistanceFilter, GPUTier, PeripheralBrand, areFiltersDefault } from '@/types/filters'
import { cn } from '@/lib/utils'

interface FilterPanelProps {
  filters: VenueFilters
  onFiltersChange: (filters: VenueFilters) => void
  venueCount: number
}

const DISTANCE_OPTIONS: { value: DistanceFilter; label: string }[] = [
  { value: 500, label: '500m' },
  { value: 1000, label: '1km' },
  { value: 3000, label: '3km' },
  { value: 5000, label: '5km' },
  { value: 10000, label: '10km' },
  { value: 50000, label: '전체 (서울)' },
]

const GPU_TIERS: { value: GPUTier; label: string }[] = [
  { value: '3060+', label: 'RTX 3060+' },
  { value: '4060+', label: 'RTX 4060+' },
  { value: '4080+', label: 'RTX 4080+' },
]

const PERIPHERAL_BRANDS: { value: PeripheralBrand; label: string }[] = [
  { value: 'Logitech', label: 'Logitech' },
  { value: 'Razer', label: 'Razer' },
  { value: 'Corsair', label: 'Corsair' },
  { value: 'HyperX', label: 'HyperX' },
  { value: 'SteelSeries', label: 'SteelSeries' },
]

export function FilterPanel({ filters, onFiltersChange, venueCount }: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<VenueFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS)
    onFiltersChange(DEFAULT_FILTERS)
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const togglePeripheralBrand = (brand: PeripheralBrand) => {
    const current = localFilters.peripheralBrands
    const updated = current.includes(brand)
      ? current.filter(b => b !== brand)
      : [...current, brand]
    setLocalFilters({ ...localFilters, peripheralBrands: updated })
  }

  const hasActiveFilters = !areFiltersDefault(localFilters)

  return (
    <>
      {/* Desktop Filter Panel - Sidebar */}
      <div className="hidden md:block bg-white border-r border-gray-200 w-80 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              필터
            </h2>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleReset}
                className="text-indigo-600 hover:text-indigo-700"
              >
                초기화
              </Button>
            )}
          </div>

          <FilterContent 
            filters={localFilters}
            onFiltersChange={setLocalFilters}
            togglePeripheralBrand={togglePeripheralBrand}
          />

          <div className="pt-4 border-t border-gray-200">
            <Button 
              onClick={() => onFiltersChange(localFilters)} 
              className="w-full"
              size="lg"
            >
              {venueCount}개 PC방 보기
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Filter - Bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button 
              className="fixed bottom-20 right-4 z-30 bg-white shadow-lg rounded-full p-4 border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="필터 열기"
            >
              <SlidersHorizontal className="h-6 w-6 text-gray-700" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  !
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  필터
                </SheetTitle>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleReset}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    초기화
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="py-6 space-y-6">
              <FilterContent 
                filters={localFilters}
                onFiltersChange={setLocalFilters}
                togglePeripheralBrand={togglePeripheralBrand}
              />
            </div>

            <div className="sticky bottom-0 bg-white pt-4 pb-6 border-t border-gray-200">
              <Button 
                onClick={handleApply} 
                className="w-full"
                size="lg"
              >
                {venueCount}개 PC방 보기
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

interface FilterContentProps {
  filters: VenueFilters
  onFiltersChange: (filters: VenueFilters) => void
  togglePeripheralBrand: (brand: PeripheralBrand) => void
}

function FilterContent({ filters, onFiltersChange, togglePeripheralBrand }: FilterContentProps) {
  return (
    <>
      {/* 1. 가격대 필터 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          가격대 (시간당)
        </label>
        <div className="space-y-2">
          <Slider
            min={500}
            max={3000}
            step={100}
            value={[filters.maxPrice || 3000]}
            onValueChange={(value) => 
              onFiltersChange({ ...filters, maxPrice: value[0] === 3000 ? null : value[0] })
            }
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>₩500</span>
            <span className="font-medium text-indigo-600">
              {filters.maxPrice ? `₩${filters.maxPrice.toLocaleString()} 이하` : '제한 없음'}
            </span>
            <span>₩3,000</span>
          </div>
        </div>
      </div>

      {/* 2. 거리 필터 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          거리 반경
        </label>
        <Select
          value={filters.distance.toString()}
          onValueChange={(value) => 
            onFiltersChange({ ...filters, distance: parseInt(value) as DistanceFilter })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISTANCE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. GPU 사양 필터 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          GPU 사양
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onFiltersChange({ ...filters, gpuTier: null })}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-md border transition-colors",
              filters.gpuTier === null
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            )}
          >
            전체
          </button>
          {GPU_TIERS.map(tier => (
            <button
              key={tier.value}
              onClick={() => onFiltersChange({ ...filters, gpuTier: tier.value })}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md border transition-colors",
                filters.gpuTier === tier.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              )}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 주변기기 필터 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          주변기기 브랜드
        </label>
        <div className="flex flex-wrap gap-2">
          {PERIPHERAL_BRANDS.map(brand => (
            <button
              key={brand.value}
              onClick={() => togglePeripheralBrand(brand.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full border transition-colors",
                filters.peripheralBrands.includes(brand.value)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              )}
            >
              {brand.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. 영업시간 필터 */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          영업시간
        </label>
        <div className="space-y-2">
          <button
            onClick={() => onFiltersChange({ ...filters, onlyOpen: !filters.onlyOpen })}
            className={cn(
              "w-full px-4 py-3 text-sm font-medium rounded-lg border transition-colors text-left",
              filters.onlyOpen
                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center",
                filters.onlyOpen ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
              )}>
                {filters.onlyOpen && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              현재 영업중
            </div>
          </button>
          
          <button
            onClick={() => onFiltersChange({ ...filters, only24Hours: !filters.only24Hours })}
            className={cn(
              "w-full px-4 py-3 text-sm font-medium rounded-lg border transition-colors text-left",
              filters.only24Hours
                ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center",
                filters.only24Hours ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
              )}>
                {filters.only24Hours && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              24시간 운영
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
