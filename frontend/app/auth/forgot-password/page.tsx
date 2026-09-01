'use client'

import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const router = useRouter()
  router.push('/')
  return null
}