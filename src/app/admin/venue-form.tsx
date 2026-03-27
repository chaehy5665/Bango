'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createVenue, updateVenue } from './actions'
import { Database } from '@/types/database'

type Venue = Database['public']['Tables']['venues']['Row']
type VenuePricing = Database['public']['Tables']['venue_pricing']['Row']
type VenueSpecs = Database['public']['Tables']['venue_specs']['Row']
type VenuePeripheral = Database['public']['Tables']['venue_peripherals']['Row']
type VenueMenuItem = Database['public']['Tables']['venue_menu_items']['Row']
type PeripheralType = Database['public']['Enums']['peripheral_type']

interface VenueFormProps {
  venue?: Venue
  pricing?: VenuePricing[]
  specs?: VenueSpecs
  peripherals?: VenuePeripheral[]
  menuItems?: VenueMenuItem[]
}

interface PricingRow {
  tier_name: string
  hourly: number
  package_3h: number
  package_6h: number
  package_overnight: number
  description: string
}

interface PeripheralRow {
  peripheral_type: PeripheralType
  brand: string
  model: string
}

interface MenuRow {
  category: string
  item_name: string
  price_krw: number
  is_available: boolean
}

interface PricingStructure {
  hourly?: number
  package_3h?: number
  package_6h?: number
  package_overnight?: number
}

function extractLocation(locationStr: unknown): { lat: number; lng: number } {
  if (typeof locationStr === 'string') {
    const match = locationStr.match(/POINT\(([0-9.-]+) ([0-9.-]+)\)/)
    if (match) {
      return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
    }
  }
  return { lat: 37.5665, lng: 126.978 }
}

export function VenueForm({ venue, pricing, specs, peripherals, menuItems }: VenueFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const venueLocation = venue ? extractLocation(venue.location) : { lat: 37.5665, lng: 126.978 }
  const venueOperatingHours = venue?.operating_hours as { weekday?: string; weekend?: string } | undefined

  const [pricingRows, setPricingRows] = useState<PricingRow[]>(
    pricing && pricing.length > 0
      ? pricing.map(p => {
          const ps = p.pricing_structure as PricingStructure
          return {
            tier_name: p.tier_name,
            hourly: ps?.hourly || 0,
            package_3h: ps?.package_3h || 0,
            package_6h: ps?.package_6h || 0,
            package_overnight: ps?.package_overnight || 0,
            description: p.description || '',
          }
        })
      : [{ tier_name: '기본', hourly: 1500, package_3h: 4000, package_6h: 7000, package_overnight: 10000, description: '' }]
  )

  const [peripheralRows, setPeripheralRows] = useState<PeripheralRow[]>(
    peripherals && peripherals.length > 0
      ? peripherals.map(p => ({
          peripheral_type: p.peripheral_type,
          brand: p.brand,
          model: p.model || '',
        }))
      : [{ peripheral_type: 'keyboard' as PeripheralType, brand: '', model: '' }]
  )

  const [menuRows, setMenuRows] = useState<MenuRow[]>(
    menuItems && menuItems.length > 0
      ? menuItems.map(m => ({
          category: m.category,
          item_name: m.item_name,
          price_krw: m.price_krw,
          is_available: m.is_available,
        }))
      : [{ category: '음료', item_name: '', price_krw: 0, is_available: true }]
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      formData.set('pricing_count', pricingRows.length.toString())
      formData.set('peripherals_count', peripheralRows.length.toString())
      formData.set('menu_count', menuRows.length.toString())

      const result = venue
        ? await updateVenue(venue.id, formData)
        : await createVenue(formData)

      // Server Actions call redirect() on success, which throws NEXT_REDIRECT error
      // If we get here with a result, it's an error response
      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      }
      // If result is undefined, redirect() was called and navigation is in progress
    } catch (error) {
      // Next.js redirect() throws a special error - let it propagate for navigation
      // Only catch actual errors
      if (error && typeof error === 'object' && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT')) {
        throw error // Re-throw to allow Next.js to handle redirect
      }
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">기본 정보</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              이름 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={venue?.name}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              지역 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="address_district"
              defaultValue={venue?.address_district}
              placeholder="예: 강남구"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            주소 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            name="address_full"
            defaultValue={venue?.address_full}
            placeholder="서울시 강남구 테헤란로 123"
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">전화번호</label>
            <input
              type="text"
              name="phone"
              defaultValue={venue?.phone || ''}
              placeholder="02-1234-5678"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">좌석 수</label>
            <input
              type="number"
              name="total_seats"
              defaultValue={venue?.total_seats || ''}
              placeholder="50"
              min="0"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              위도 <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              name="latitude"
              defaultValue={venueLocation.lat}
              step="0.000001"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              경도 <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              name="longitude"
              defaultValue={venueLocation.lng}
              step="0.000001"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">평일 운영시간</label>
            <input
              type="text"
              name="weekday_hours"
              defaultValue={venueOperatingHours?.weekday || '09:00-24:00'}
              placeholder="09:00-24:00"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">주말 운영시간</label>
            <input
              type="text"
              name="weekend_hours"
              defaultValue={venueOperatingHours?.weekend || '09:00-24:00'}
              placeholder="09:00-24:00"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">편의시설</label>
          <input
            type="text"
            name="amenities"
            defaultValue={venue?.amenities?.join(', ') || ''}
            placeholder="WiFi, 샤워실, 흡연실 (쉼표로 구분)"
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="parking_available"
            id="parking_available"
            defaultChecked={venue?.parking_available}
            value="true"
            className="w-4 h-4"
          />
          <label htmlFor="parking_available" className="text-sm font-medium">
            주차 가능
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-semibold">요금제</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPricingRows([...pricingRows, { tier_name: '', hourly: 0, package_3h: 0, package_6h: 0, package_overnight: 0, description: '' }])
            }
          >
            행 추가
          </Button>
        </div>

        {pricingRows.map((row, idx) => (
          <div key={idx} className="p-4 border rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">요금제 {idx + 1}</h3>
              {pricingRows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPricingRows(pricingRows.filter((_, i) => i !== idx))}
                >
                  제거
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  티어명 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name={`pricing_${idx}_tier_name`}
                  value={row.tier_name}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].tier_name = e.target.value
                    setPricingRows(newRows)
                  }}
                  placeholder="기본, VIP 등"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">시간당 요금</label>
                <input
                  type="number"
                  name={`pricing_${idx}_hourly`}
                  value={row.hourly}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].hourly = parseFloat(e.target.value) || 0
                    setPricingRows(newRows)
                  }}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">3시간 패키지</label>
                <input
                  type="number"
                  name={`pricing_${idx}_package_3h`}
                  value={row.package_3h}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].package_3h = parseFloat(e.target.value) || 0
                    setPricingRows(newRows)
                  }}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">6시간 패키지</label>
                <input
                  type="number"
                  name={`pricing_${idx}_package_6h`}
                  value={row.package_6h}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].package_6h = parseFloat(e.target.value) || 0
                    setPricingRows(newRows)
                  }}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">숙박 패키지</label>
                <input
                  type="number"
                  name={`pricing_${idx}_package_overnight`}
                  value={row.package_overnight}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].package_overnight = parseFloat(e.target.value) || 0
                    setPricingRows(newRows)
                  }}
                  min="0"
                  step="100"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <input
                  type="text"
                  name={`pricing_${idx}_description`}
                  value={row.description}
                  onChange={(e) => {
                    const newRows = [...pricingRows]
                    newRows[idx].description = e.target.value
                    setPricingRows(newRows)
                  }}
                  placeholder="선택 사항"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">PC 사양</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              CPU <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="cpu"
              defaultValue={specs?.cpu || ''}
              placeholder="Intel i5-13400F"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              GPU <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="gpu"
              defaultValue={specs?.gpu || ''}
              placeholder="RTX 4060"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              RAM (GB) <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              name="ram_gb"
              defaultValue={specs?.ram_gb || ''}
              placeholder="16"
              min="1"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              저장장치 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="storage"
              defaultValue={specs?.storage || ''}
              placeholder="SSD 512GB"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              모니터 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="monitor"
              defaultValue={specs?.monitor || ''}
              placeholder="27인치 144Hz"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">인터넷 속도 (Mbps)</label>
            <input
              type="number"
              name="internet_speed_mbps"
              defaultValue={specs?.internet_speed_mbps || ''}
              placeholder="1000"
              min="0"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-semibold">주변기기</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPeripheralRows([...peripheralRows, { peripheral_type: 'keyboard', brand: '', model: '' }])
            }
          >
            행 추가
          </Button>
        </div>

        {peripheralRows.map((row, idx) => (
          <div key={idx} className="p-4 border rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">주변기기 {idx + 1}</h3>
              {peripheralRows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeripheralRows(peripheralRows.filter((_, i) => i !== idx))}
                >
                  제거
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  종류 <span className="text-destructive">*</span>
                </label>
                <select
                  name={`peripheral_${idx}_type`}
                  value={row.peripheral_type}
                  onChange={(e) => {
                    const newRows = [...peripheralRows]
                    newRows[idx].peripheral_type = e.target.value as PeripheralType
                    setPeripheralRows(newRows)
                  }}
                  required
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="keyboard">키보드</option>
                  <option value="mouse">마우스</option>
                  <option value="headset">헤드셋</option>
                  <option value="chair">의자</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  브랜드 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name={`peripheral_${idx}_brand`}
                  value={row.brand}
                  onChange={(e) => {
                    const newRows = [...peripheralRows]
                    newRows[idx].brand = e.target.value
                    setPeripheralRows(newRows)
                  }}
                  placeholder="로지텍"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">모델</label>
                <input
                  type="text"
                  name={`peripheral_${idx}_model`}
                  value={row.model}
                  onChange={(e) => {
                    const newRows = [...peripheralRows]
                    newRows[idx].model = e.target.value
                    setPeripheralRows(newRows)
                  }}
                  placeholder="G Pro"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-xl font-semibold">메뉴</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setMenuRows([...menuRows, { category: '음료', item_name: '', price_krw: 0, is_available: true }])
            }
          >
            행 추가
          </Button>
        </div>

        {menuRows.map((row, idx) => (
          <div key={idx} className="p-4 border rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">메뉴 {idx + 1}</h3>
              {menuRows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMenuRows(menuRows.filter((_, i) => i !== idx))}
                >
                  제거
                </Button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  카테고리 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name={`menu_${idx}_category`}
                  value={row.category}
                  onChange={(e) => {
                    const newRows = [...menuRows]
                    newRows[idx].category = e.target.value
                    setMenuRows(newRows)
                  }}
                  placeholder="음료, 라면 등"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  메뉴명 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name={`menu_${idx}_item_name`}
                  value={row.item_name}
                  onChange={(e) => {
                    const newRows = [...menuRows]
                    newRows[idx].item_name = e.target.value
                    setMenuRows(newRows)
                  }}
                  placeholder="콜라"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  가격 (원) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  name={`menu_${idx}_price_krw`}
                  value={row.price_krw}
                  onChange={(e) => {
                    const newRows = [...menuRows]
                    newRows[idx].price_krw = parseInt(e.target.value) || 0
                    setMenuRows(newRows)
                  }}
                  min="0"
                  step="100"
                  required
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  name={`menu_${idx}_is_available`}
                  id={`menu_${idx}_is_available`}
                  checked={row.is_available}
                  onChange={(e) => {
                    const newRows = [...menuRows]
                    newRows[idx].is_available = e.target.checked
                    setMenuRows(newRows)
                  }}
                  value="true"
                  className="w-4 h-4 mr-2"
                />
                <label htmlFor={`menu_${idx}_is_available`} className="text-sm font-medium">
                  판매중
                </label>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin')}
          disabled={isSubmitting}
        >
          취소
        </Button>
      </div>
    </form>
  )
}
