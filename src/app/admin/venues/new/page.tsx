import { requireAdmin } from '@/lib/admin-auth'
import { VenueForm } from '../../venue-form'

export default async function NewVenuePage() {
  await requireAdmin()

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">PC방 추가</h1>
      <VenueForm />
    </div>
  )
}
