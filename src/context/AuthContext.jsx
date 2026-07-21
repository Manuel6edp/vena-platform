import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    // Cambios de sesión (login, logout, refresh de token)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Cargar el perfil de la institución cuando hay sesión.
  // Red de seguridad: si no existe la fila en institutions (p. ej. el trigger
  // no corrió, o es un usuario creado antes), la crea con id = auth.uid().
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    let active = true
    ;(async () => {
      const user = session.user
      let { data } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!data) {
        const name =
          user.user_metadata?.institution_name || 'Institución sin nombre'
        const { data: created } = await supabase
          .from('institutions')
          .upsert({ id: user.id, name })
          .select()
          .maybeSingle()
        data = created
      }

      if (active) setProfile(data)
    })()
    return () => {
      active = false
    }
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
