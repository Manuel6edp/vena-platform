import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/inventario', label: 'Inventario', icon: IconInventory },
  { to: '/alertas', label: 'Alertas', icon: IconAlert },
  { to: '/red', label: 'Red VENA', icon: IconNetwork },
  { to: '/configuracion', label: 'Configuración', icon: IconSettings },
]

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-blue-900 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 py-6">
        <div className="px-6 pb-6">
          <Logo className="h-9 w-9" textClassName="text-white" />
        </div>
        {nav}
        <SidebarFooter
          name={profile?.name}
          email={user?.email}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-slate-900 py-6">
            <div className="px-6 pb-6">
              <Logo className="h-9 w-9" textClassName="text-white" />
            </div>
            {nav}
            <SidebarFooter
              name={profile?.name}
              email={user?.email}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Logo className="h-8 w-8" textClassName="text-slate-900" />
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-300 p-2 text-slate-600"
            aria-label="Abrir menú"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarFooter({ name, email, onLogout }) {
  return (
    <div className="mt-4 border-t border-slate-800 px-3 pt-4">
      <div className="px-3">
        <p className="truncate text-sm font-semibold text-white">
          {name ?? 'Institución'}
        </p>
        <p className="truncate text-xs text-slate-400">{email}</p>
      </div>
      <button
        onClick={onLogout}
        className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        <IconLogout className="h-5 w-5" />
        Cerrar sesión
      </button>
    </div>
  )
}

/* ---- Íconos (SVG inline) ---- */
function IconDashboard(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5v7H4V5zM14 4h5a1 1 0 011 1v4h-6V4zM4 14h6v6H5a1 1 0 01-1-1v-5zM14 12h6v7a1 1 0 01-1 1h-5v-8z" />
    </svg>
  )
}
function IconInventory(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
function IconAlert(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-2.99l-7.07-12.02a2 2 0 00-3.48 0L3.19 16.01A2 2 0 004.93 19z" />
    </svg>
  )
}
function IconNetwork(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-6.5L15 9m-6 6l-1.5 1.5m9 0L15 15M9 9L7.5 7.5" />
      <circle cx="12" cy="12" r="2.5" strokeWidth={2} />
    </svg>
  )
}
function IconSettings(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
    </svg>
  )
}
function IconLogout(props) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
