'use client'

import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()
  router.push('/')
  return null
}