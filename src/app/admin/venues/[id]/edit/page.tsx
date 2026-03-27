import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { notFound } from 'next/navigation'
import { VenueForm } from '../../../venue-form'

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', id)
    .single()

  if (!venue) {
    notFound()
  }

  const { data: pricing } = await supabase
    .from('venue_pricing')
    .select('*')
    .eq('venue_id', id)

  const { data: specs } = await supabase
    .from('venue_specs')
    .select('*')
    .eq('venue_id', id)
    .single()

  const { data: peripherals } = await supabase
    .from('venue_peripherals')
    .select('*')
    .eq('venue_id', id)

  const { data: menuItems } = await supabase
    .from('venue_menu_items')
    .select('*')
    .eq('venue_id', id)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">PC방 수정</h1>
      <VenueForm
        venue={venue}
        pricing={pricing || []}
        specs={specs || undefined}
        peripherals={peripherals || []}
        menuItems={menuItems || []}
      />
    </div>
  )
}
