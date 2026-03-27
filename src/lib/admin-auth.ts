

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Verify admin password against environment variable
 * @param password - Password to verify
 * @returns boolean - true if password matches ADMIN_PASSWORD env var
 */
export function verifyAdmin(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {

    return false
  }
  return password === adminPassword
}

/**
 * Get current admin session status by checking httpOnly cookie
 * @returns Promise<boolean> - true if admin-session cookie exists and equals 'authenticated'
 */
export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')
  return session?.value === 'authenticated'
}

/**
 * Guard function to protect admin routes
 * Redirects unauthenticated users to /admin/login
 * @throws redirect - Redirects to /admin/login if not authenticated
 */
export async function requireAdmin(): Promise<void> {
  const isAuthenticated = await getAdminSession()
  if (!isAuthenticated) {
    redirect('/admin/login')
  }
}
