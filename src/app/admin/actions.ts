'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

type PeripheralType = Database['public']['Enums']['peripheral_type']

/**
 * Create service role Supabase client for admin operations
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin privileges (bypasses RLS)
 */
function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

/**
 * Server Action: Create new PC bang venue with all related data
 * @param formData - Form data containing venue info, pricing, specs, peripherals, menu items
 * @returns Error message if failed, otherwise redirects to /admin
 */
export async function createVenue(formData: FormData) {
  const supabase = createAdminClient()

  try {
    // Extract basic venue data
    const name = formData.get('name') as string
    const addressFull = formData.get('address_full') as string
    const addressDistrict = formData.get('address_district') as string
    const phone = formData.get('phone') as string | null
    const latitude = parseFloat(formData.get('latitude') as string)
    const longitude = parseFloat(formData.get('longitude') as string)
    const totalSeats = formData.get('total_seats') ? parseInt(formData.get('total_seats') as string) : null
    const parkingAvailable = formData.get('parking_available') === 'true'
    
    // Operating hours
    const weekdayHours = formData.get('weekday_hours') as string
    const weekendHours = formData.get('weekend_hours') as string
    const operatingHours = {
      weekday: weekdayHours || '09:00-24:00',
      weekend: weekendHours || '09:00-24:00'
    }

    // Amenities (comma-separated string to array)
    const amenitiesStr = formData.get('amenities') as string
    const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()).filter(Boolean) : []

    // 1. INSERT venue
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name,
        location: `POINT(${longitude} ${latitude})`,
        address_full: addressFull,
        address_district: addressDistrict,
        phone: phone || null,
        operating_hours: operatingHours,
        amenities,
        total_seats: totalSeats,
        parking_available: parkingAvailable,
      })
      .select()
      .single()

    if (venueError) {
      return { error: venueError.message }
    }

    // 2. INSERT pricing tiers (dynamic rows)
    const pricingCount = parseInt(formData.get('pricing_count') as string) || 0
    const pricingData = []
    for (let i = 0; i < pricingCount; i++) {
      const tierName = formData.get(`pricing_${i}_tier_name`) as string
      const hourly = parseFloat(formData.get(`pricing_${i}_hourly`) as string) || 0
      const package3h = parseFloat(formData.get(`pricing_${i}_package_3h`) as string) || 0
      const package6h = parseFloat(formData.get(`pricing_${i}_package_6h`) as string) || 0
      const packageOvernight = parseFloat(formData.get(`pricing_${i}_package_overnight`) as string) || 0
      const description = formData.get(`pricing_${i}_description`) as string | null

      if (tierName) {
        pricingData.push({
          venue_id: venue.id,
          tier_name: tierName,
          pricing_structure: {
            hourly,
            package_3h: package3h,
            package_6h: package6h,
            package_overnight: packageOvernight,
          },
          description: description || null,
        })
      }
    }

    if (pricingData.length > 0) {
      const { error: pricingError } = await supabase
        .from('venue_pricing')
        .insert(pricingData)
      if (pricingError) {
        return { error: pricingError.message }
      }
    }

    // 3. INSERT specs (single row)
    const cpu = formData.get('cpu') as string
    const gpu = formData.get('gpu') as string
    const ramGb = parseInt(formData.get('ram_gb') as string)
    const storage = formData.get('storage') as string
    const monitor = formData.get('monitor') as string
    const internetSpeedMbps = formData.get('internet_speed_mbps') 
      ? parseInt(formData.get('internet_speed_mbps') as string) 
      : null

    if (cpu && gpu && ramGb && storage && monitor) {
      const { error: specsError } = await supabase
        .from('venue_specs')
        .insert({
          venue_id: venue.id,
          cpu,
          gpu,
          ram_gb: ramGb,
          storage,
          monitor,
          internet_speed_mbps: internetSpeedMbps,
        })
      if (specsError) {
        return { error: specsError.message }
      }
    }

    // 4. INSERT peripherals (dynamic rows)
    const peripheralsCount = parseInt(formData.get('peripherals_count') as string) || 0
    const peripheralsData = []
    for (let i = 0; i < peripheralsCount; i++) {
      const peripheralType = formData.get(`peripheral_${i}_type`) as PeripheralType
      const brand = formData.get(`peripheral_${i}_brand`) as string
      const model = formData.get(`peripheral_${i}_model`) as string | null

      if (peripheralType && brand) {
        peripheralsData.push({
          venue_id: venue.id,
          peripheral_type: peripheralType,
          brand,
          model: model || null,
        })
      }
    }

    if (peripheralsData.length > 0) {
      const { error: peripheralsError } = await supabase
        .from('venue_peripherals')
        .insert(peripheralsData)
      if (peripheralsError) {
        return { error: peripheralsError.message }
      }
    }

    // 5. INSERT menu items (dynamic rows)
    const menuCount = parseInt(formData.get('menu_count') as string) || 0
    const menuData = []
    for (let i = 0; i < menuCount; i++) {
      const category = formData.get(`menu_${i}_category`) as string
      const itemName = formData.get(`menu_${i}_item_name`) as string
      const priceKrw = parseInt(formData.get(`menu_${i}_price_krw`) as string)
      const isAvailable = formData.get(`menu_${i}_is_available`) === 'true'

      if (category && itemName && priceKrw) {
        menuData.push({
          venue_id: venue.id,
          category,
          item_name: itemName,
          price_krw: priceKrw,
          is_available: isAvailable,
        })
      }
    }

    if (menuData.length > 0) {
      const { error: menuError } = await supabase
        .from('venue_menu_items')
        .insert(menuData)
      if (menuError) {
        return { error: menuError.message }
      }
    }

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }

  revalidatePath('/admin')
  redirect('/admin')
}

/**
 * Server Action: Update existing PC bang venue with all related data
 * @param venueId - UUID of venue to update
 * @param formData - Form data containing updated venue info
 * @returns Error message if failed, otherwise redirects to /admin
 */
export async function updateVenue(venueId: string, formData: FormData) {
  const supabase = createAdminClient()

  try {
    // Extract basic venue data
    const name = formData.get('name') as string
    const addressFull = formData.get('address_full') as string
    const addressDistrict = formData.get('address_district') as string
    const phone = formData.get('phone') as string | null
    const latitude = parseFloat(formData.get('latitude') as string)
    const longitude = parseFloat(formData.get('longitude') as string)
    const totalSeats = formData.get('total_seats') ? parseInt(formData.get('total_seats') as string) : null
    const parkingAvailable = formData.get('parking_available') === 'true'
    
    // Operating hours
    const weekdayHours = formData.get('weekday_hours') as string
    const weekendHours = formData.get('weekend_hours') as string
    const operatingHours = {
      weekday: weekdayHours || '09:00-24:00',
      weekend: weekendHours || '09:00-24:00'
    }

    // Amenities
    const amenitiesStr = formData.get('amenities') as string
    const amenities = amenitiesStr ? amenitiesStr.split(',').map(a => a.trim()).filter(Boolean) : []

    // 1. UPDATE venue
    const { error: venueError } = await supabase
      .from('venues')
      .update({
        name,
        location: `POINT(${longitude} ${latitude})`,
        address_full: addressFull,
        address_district: addressDistrict,
        phone: phone || null,
        operating_hours: operatingHours,
        amenities,
        total_seats: totalSeats,
        parking_available: parkingAvailable,
      })
      .eq('id', venueId)

    if (venueError) {
      return { error: venueError.message }
    }

    // 2. DELETE and re-INSERT pricing tiers (simpler than diff logic)
    await supabase.from('venue_pricing').delete().eq('venue_id', venueId)
    
    const pricingCount = parseInt(formData.get('pricing_count') as string) || 0
    const pricingData = []
    for (let i = 0; i < pricingCount; i++) {
      const tierName = formData.get(`pricing_${i}_tier_name`) as string
      const hourly = parseFloat(formData.get(`pricing_${i}_hourly`) as string) || 0
      const package3h = parseFloat(formData.get(`pricing_${i}_package_3h`) as string) || 0
      const package6h = parseFloat(formData.get(`pricing_${i}_package_6h`) as string) || 0
      const packageOvernight = parseFloat(formData.get(`pricing_${i}_package_overnight`) as string) || 0
      const description = formData.get(`pricing_${i}_description`) as string | null

      if (tierName) {
        pricingData.push({
          venue_id: venueId,
          tier_name: tierName,
          pricing_structure: {
            hourly,
            package_3h: package3h,
            package_6h: package6h,
            package_overnight: packageOvernight,
          },
          description: description || null,
        })
      }
    }

    if (pricingData.length > 0) {
      const { error: pricingError } = await supabase
        .from('venue_pricing')
        .insert(pricingData)
      if (pricingError) {
        return { error: pricingError.message }
      }
    }

    // 3. UPDATE specs (or INSERT if not exists)
    const cpu = formData.get('cpu') as string
    const gpu = formData.get('gpu') as string
    const ramGb = parseInt(formData.get('ram_gb') as string)
    const storage = formData.get('storage') as string
    const monitor = formData.get('monitor') as string
    const internetSpeedMbps = formData.get('internet_speed_mbps') 
      ? parseInt(formData.get('internet_speed_mbps') as string) 
      : null

    if (cpu && gpu && ramGb && storage && monitor) {
      // Check if specs exist
      const { data: existingSpecs } = await supabase
        .from('venue_specs')
        .select('id')
        .eq('venue_id', venueId)
        .single()

      if (existingSpecs) {
        const { error: specsError } = await supabase
          .from('venue_specs')
          .update({
            cpu,
            gpu,
            ram_gb: ramGb,
            storage,
            monitor,
            internet_speed_mbps: internetSpeedMbps,
          })
          .eq('venue_id', venueId)
        if (specsError) {
          return { error: specsError.message }
        }
      } else {
        const { error: specsError } = await supabase
          .from('venue_specs')
          .insert({
            venue_id: venueId,
            cpu,
            gpu,
            ram_gb: ramGb,
            storage,
            monitor,
            internet_speed_mbps: internetSpeedMbps,
          })
        if (specsError) {
          return { error: specsError.message }
        }
      }
    }

    // 4. DELETE and re-INSERT peripherals
    await supabase.from('venue_peripherals').delete().eq('venue_id', venueId)
    
    const peripheralsCount = parseInt(formData.get('peripherals_count') as string) || 0
    const peripheralsData = []
    for (let i = 0; i < peripheralsCount; i++) {
      const peripheralType = formData.get(`peripheral_${i}_type`) as PeripheralType
      const brand = formData.get(`peripheral_${i}_brand`) as string
      const model = formData.get(`peripheral_${i}_model`) as string | null

      if (peripheralType && brand) {
        peripheralsData.push({
          venue_id: venueId,
          peripheral_type: peripheralType,
          brand,
          model: model || null,
        })
      }
    }

    if (peripheralsData.length > 0) {
      const { error: peripheralsError } = await supabase
        .from('venue_peripherals')
        .insert(peripheralsData)
      if (peripheralsError) {
        return { error: peripheralsError.message }
      }
    }

    // 5. DELETE and re-INSERT menu items
    await supabase.from('venue_menu_items').delete().eq('venue_id', venueId)
    
    const menuCount = parseInt(formData.get('menu_count') as string) || 0
    const menuData = []
    for (let i = 0; i < menuCount; i++) {
      const category = formData.get(`menu_${i}_category`) as string
      const itemName = formData.get(`menu_${i}_item_name`) as string
      const priceKrw = parseInt(formData.get(`menu_${i}_price_krw`) as string)
      const isAvailable = formData.get(`menu_${i}_is_available`) === 'true'

      if (category && itemName && priceKrw) {
        menuData.push({
          venue_id: venueId,
          category,
          item_name: itemName,
          price_krw: priceKrw,
          is_available: isAvailable,
        })
      }
    }

    if (menuData.length > 0) {
      const { error: menuError } = await supabase
        .from('venue_menu_items')
        .insert(menuData)
      if (menuError) {
        return { error: menuError.message }
      }
    }

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }

  revalidatePath('/admin')
  redirect('/admin')
}

/**
 * Server Action: Delete PC bang venue (CASCADE deletes all related data)
 * @param venueId - UUID of venue to delete
 * @returns Error message if failed
 */
export async function deleteVenue(venueId: string) {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', venueId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
