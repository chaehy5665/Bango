import { requireAdmin } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteVenueButton } from './delete-button'

type Venue = Database['public']['Tables']['venues']['Row']

function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export default async function AdminPage() {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data: venues, error } = await supabase
    .from('venues')
    .select('id, name, address_district, total_seats')
    .order('created_at', { ascending: false })


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">PC방 관리</h1>
        <Button asChild>
          <Link href="/admin/venues/new">PC방 추가</Link>
        </Button>
      </div>

      {venues && venues.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>지역</TableHead>
              <TableHead>좌석 수</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {venues.map((venue) => (
              <TableRow key={venue.id}>
                <TableCell className="font-medium">{venue.name}</TableCell>
                <TableCell>{venue.address_district}</TableCell>
                <TableCell>{venue.total_seats || '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/venues/${venue.id}/edit`}>수정</Link>
                  </Button>
                  <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">등록된 PC방이 없습니다.</p>
      )}
    </div>
  )
}
