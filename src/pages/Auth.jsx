import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'

export default function Auth() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [institution, setInstitution] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const isRegister = mode === 'register'

  // Si ya hay sesión, no mostrar el login.
  if (!authLoading && session) {
    return <Navigate to="/dashboard" replace />
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { institution_name: institution },
          },
        })
        if (error) throw error

        // Crear la fila de la institución con id = auth.uid().
        // Sólo es posible si signUp devolvió sesión (confirmación de correo
        // desactivada); si no, la creará AuthContext tras el primer login.
        if (data.session && data.user) {
          const { error: profErr } = await supabase
            .from('institutions')
            .upsert({ id: data.user.id, name: institution })
          if (profErr) throw profErr
          navigate('/dashboard')
        } else {
          setMessage(
            'Registro exitoso. Revisa tu correo para confirmar la cuenta de la institución.'
          )
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (err) {
      setError(traducirError(err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Panel lateral de marca */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12 text-white">
        <Logo className="h-11 w-11" textClassName="text-white" />

        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Gestión de inventario de hemocomponentes
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            La plataforma para bancos de sangre privados en Venezuela. Controla
            existencias, vencimientos y trazabilidad en un solo lugar.
          </p>
        </div>

        <p className="text-sm text-slate-400">
          © {new Date().getFullYear()} VENA. Todos los derechos reservados.
        </p>
      </aside>

      {/* Panel de formulario */}
      <main className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo visible en móvil */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo className="h-11 w-11" textClassName="text-slate-900" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              {isRegister ? 'Registrar institución' : 'Iniciar sesión'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isRegister
                ? 'Crea la cuenta de tu banco de sangre.'
                : 'Accede al panel de tu institución.'}
            </p>

            {/* Selector de modo */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-md py-2 text-sm font-semibold transition ${
                  !isRegister
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-md py-2 text-sm font-semibold transition ${
                  isRegister
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {isRegister && (
                <div>
                  <label
                    htmlFor="institution"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Nombre de la institución
                  </label>
                  <input
                    id="institution"
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Banco de Sangre Central"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@institucion.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-900 py-2.5 font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Procesando…'
                  : isRegister
                    ? 'Crear cuenta'
                    : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
                className="font-semibold text-blue-900 hover:underline"
              >
                {isRegister ? 'Inicia sesión' : 'Regístrate'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function traducirError(msg = '') {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos.'
  if (m.includes('user already registered'))
    return 'Ya existe una cuenta con este correo.'
  if (m.includes('email not confirmed'))
    return 'Debes confirmar tu correo antes de iniciar sesión.'
  if (m.includes('password'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  return msg || 'Ocurrió un error. Inténtalo de nuevo.'
}
