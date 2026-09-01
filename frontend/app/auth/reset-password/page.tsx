'use client'

import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  router.push('/')
  return null
}