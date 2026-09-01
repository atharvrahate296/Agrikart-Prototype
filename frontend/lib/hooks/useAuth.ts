import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string
  role: 'farmer' | 'vendor' | 'expert' | 'admin' | 'buyer' | 'fpo_agent'
  verified: boolean
  created_at: string
  location?: string
  bio?: string
}

export function useAuth() {
  const [user, setUser] = useState<(User & UserProfile) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async (authUser: User) => {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (userProfile || profile) {
        return {
          ...profile,
          ...userProfile,
          role: userProfile?.role || profile?.role || 'farmer',
          full_name: userProfile?.full_name || profile?.full_name || authUser.user_metadata?.full_name || 'User',
          phone: userProfile?.phone || profile?.phone || authUser.phone || '',
          location: userProfile?.location || profile?.location || '',
          bio: userProfile?.bio || profile?.bio || '',
          email: userProfile?.email || profile?.email || authUser.email || '',
          verified: userProfile?.verified ?? profile?.verified ?? profile?.email_verified ?? Boolean(authUser.email_confirmed_at),
        }
      }

      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        phone: authUser.phone || '',
        role: 'farmer',
        verified: Boolean(authUser.email_confirmed_at),
        created_at: authUser.created_at,
      }
    }

    // 1. Get current session
    const getSession = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const profile = await fetchProfile(session.user)
          setUser({ ...session.user, ...profile } as any)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Error fetching session:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user)
          setUser({ ...session.user, ...profile } as any)
        } catch (e) {
          setUser(session.user as any)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
