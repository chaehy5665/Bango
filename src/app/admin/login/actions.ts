'use server'

import { cookies } from 'next/headers'
import { verifyAdmin } from '@/lib/admin-auth'

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string

  if (!password) {
    return { error: '비밀번호를 입력하세요', success: false }
  }

  if (!verifyAdmin(password)) {
    return { error: '비밀번호가 일치하지 않습니다', success: false }
  }

  // Password is correct, set the httpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('admin-session', 'authenticated', {
    httpOnly: true,
    maxAge: 86400, // 24 hours in seconds
    path: '/',
    sameSite: 'strict',
  })

  // Return success - client will handle redirect
  return { success: true, error: null }
}
