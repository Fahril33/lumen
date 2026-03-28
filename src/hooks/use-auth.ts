import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types/database'

let listenersCount = 0
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
let authSubscription: any = null

export function useAuth() {
  const { session, user, profile, isLoading, setSession, setProfile, setLoading, reset } =
    useAuthStore()

  useEffect(() => {
    listenersCount++

    if (listenersCount === 1) {
      const fetchProfile = async (userId: string) => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        if (data) setProfile(data)
      }

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s)
        if (s?.user) {
          fetchProfile(s.user.id)
        }
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      })
      
      authSubscription = subscription
    }

    return () => {
      listenersCount--
      if (listenersCount === 0 && authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
    }
  }, [setLoading, setProfile, setSession])
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error }
  }

  async function signInWithMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    reset()
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: new Error('Not authenticated') }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { error } = await (supabase.from('profiles') as any)
      .update(updates)
      .eq('id', user.id)
    if (!error && profile) {
      setProfile({ ...profile, ...updates })
    }
    return { error }
  }

  return {
    session,
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
    updateProfile,
  }
}
