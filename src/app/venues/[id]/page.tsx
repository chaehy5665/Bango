import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, MapPin, Phone, Clock } from 'lucide-react'

type PageParams = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: venue } = await supabase
    .from('venues')
    .select('name, address_full')
    .eq('id', id)
    .single()
  
  if (!venue) {
    return {
      title: '업소를 찾을 수 없습니다',
    }
  }

  // Get pricing summary for OG description
  const { data: pricing } = await supabase
    .from('venue_pricing')
    .select('pricing_structure')
    .eq('venue_id', id)
    .limit(1)
    .single()

  let priceDescription = ''
  if (pricing?.pricing_structure) {
    const priceStructure = pricing.pricing_structure as any
    const hourlyPrices = Object.values(priceStructure)
      .filter((v): v is number => typeof v === 'number')
    if (hourlyPrices.length > 0) {
      const minPrice = Math.min(...hourlyPrices)
      const maxPrice = Math.max(...hourlyPrices)
      priceDescription = minPrice === maxPrice 
        ? `시간당 ₩${minPrice.toLocaleString()}`
        : `시간당 ₩${minPrice.toLocaleString()}~₩${maxPrice.toLocaleString()}`
    }
  }

  return {
    title: `${venue.name} | 방고`,
    description: `${venue.address_full} ${priceDescription}`.trim(),
    openGraph: {
      title: venue.name,
      description: `${venue.address_full} ${priceDescription}`.trim(),
    },
  }
}

export default async function VenueDetailPage({ params }: PageParams) {
  const { id } = await params
  const supabase = await createClient()
  
  // Fetch venue
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()
  
  if (venueError || !venue) {
    notFound()
  }

  // Fetch all related data in parallel
  const [
    { data: pricing },
    { data: specs },
    { data: peripherals },
    { data: menuItems },
    { data: images },
  ] = await Promise.all([
    supabase.from('venue_pricing').select('*').eq('venue_id', id),
    supabase.from('venue_specs').select('*').eq('venue_id', id).single(),
    supabase.from('venue_peripherals').select('*').eq('venue_id', id),
    supabase.from('venue_menu_items').select('*').eq('venue_id', id),
    supabase.from('venue_images').select('*').eq('venue_id', id).order('display_order'),
  ])

  // Calculate stale warning (30 days)
  const updatedAt = new Date(venue.updated_at)
  const now = new Date()
  const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysSinceUpdate > 30

  // Parse operating hours
  const operatingHours = venue.operating_hours as Record<string, string>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Link 
            href="/map" 
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            지도 돌아가기
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{venue.name}</h1>
          {isStale && (
            <Badge variant="destructive" className="mt-2">
              업데이트 필요 ({daysSinceUpdate}일 전)
            </Badge>
          )}
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Images Section */}
        {images && images.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
                {images.map((img) => (
                  <div key={img.id} className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={img.image_url} 
                      alt={img.alt_text || venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-900">{venue.address_full}</p>
                <p className="text-sm text-gray-500">{venue.address_district}</p>
              </div>
            </div>
            {venue.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <a href={`tel:${venue.phone}`} className="text-gray-900 hover:text-indigo-600">
                  {venue.phone}
                </a>
              </div>
            )}
            {operatingHours && (
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {operatingHours.weekday && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-900">평일:</span>{' '}
                      <span className="text-gray-700">{operatingHours.weekday}</span>
                    </p>
                  )}
                  {operatingHours.weekend && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-900">주말:</span>{' '}
                      <span className="text-gray-700">{operatingHours.weekend}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
            {venue.amenities && venue.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {venue.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            )}
            {venue.total_seats && (
              <p className="text-sm text-gray-600">총 좌석: {venue.total_seats}석</p>
            )}
            <p className="text-sm text-gray-600">
              주차: {venue.parking_available ? '가능' : '불가능'}
            </p>
          </CardContent>
        </Card>

        {/* Pricing Section */}
        {pricing && pricing.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>가격</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pricing.map((price) => {
                  const priceStructure = price.pricing_structure as Record<string, any>
                  return (
                    <div key={price.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <h3 className="font-semibold text-lg mb-2">{price.tier_name}</h3>
                      {price.description && (
                        <p className="text-sm text-gray-600 mb-3">{price.description}</p>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>시간</TableHead>
                            <TableHead className="text-right">가격</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(priceStructure)
                            .filter(([_, value]) => typeof value === 'number')
                            .map(([hours, priceValue]) => (
                            <TableRow key={hours}>
                              <TableCell>{hours}</TableCell>
                              <TableCell className="text-right font-medium">
                                ₩{(priceValue as number).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Specs Section */}
        {specs && (
          <Card>
            <CardHeader>
              <CardTitle>사양</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">CPU</p>
                  <p className="text-gray-900">{specs.cpu}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">GPU</p>
                  <p className="text-gray-900">{specs.gpu}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">RAM</p>
                  <p className="text-gray-900">{specs.ram_gb}GB</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">저장장치</p>
                  <p className="text-gray-900">{specs.storage}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">모니터</p>
                  <p className="text-gray-900">{specs.monitor}</p>
                </div>
                {specs.internet_speed_mbps && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">인터넷 속도</p>
                    <p className="text-gray-900">{specs.internet_speed_mbps}Mbps</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Peripherals Section */}
        {peripherals && peripherals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>주변기기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peripherals.map((peripheral) => (
                  <div key={peripheral.id}>
                    <p className="text-sm font-medium text-gray-500 capitalize">
                      {peripheral.peripheral_type === 'mouse' && '마우스'}
                      {peripheral.peripheral_type === 'keyboard' && '키보드'}
                      {peripheral.peripheral_type === 'headset' && '헤드셋'}
                      {peripheral.peripheral_type === 'chair' && '의자'}
                    </p>
                    <p className="text-gray-900">
                      {peripheral.brand}
                      {peripheral.model && ` ${peripheral.model}`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Section */}
        {menuItems && menuItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>메뉴</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['food', 'drink', 'snack'].map((category) => {
                  const categoryItems = menuItems.filter((item) => item.category === category)
                  if (categoryItems.length === 0) return null
                  
                  return (
                    <div key={category} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <h3 className="font-semibold text-lg mb-3 capitalize">
                        {category === 'food' && '음식'}
                        {category === 'drink' && '음료'}
                        {category === 'snack' && '간식'}
                      </h3>
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <span className="text-gray-900">{item.item_name}</span>
                            <span className="font-medium text-gray-900">
                              ₩{item.price_krw.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last Updated */}
        <p className="text-xs text-gray-500 text-center">
          마지막 업데이트: {new Date(venue.updated_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  )
}
