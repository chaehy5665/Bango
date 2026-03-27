import { requireAdmin } from '@/lib/admin-auth'

/**
 * This is a placeholder admin page.
 * The actual admin panel will be implemented in Task 16.
 */
export default async function AdminPage() {
  await requireAdmin()

  return (
    <div>
      <h1>Admin</h1>
      <p>Authenticated</p>
    </div>
  )
}
