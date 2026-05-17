import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Header({ showBack = false }) {
  const navigate = useNavigate()
  const { darkMode, toggleDark } = useApp()

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 px-[var(--space-page-x)] py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[var(--w-container)] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] border border-slate-200 bg-white text-slate-700 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              aria-label="Back"
              title="Back"
            >
              
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/admin-dashboard')}
            className="flex min-w-0 items-center gap-3 bg-transparent text-left"
            title="Admin Dashboard"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-secondary)] text-[length:var(--fs-md)]">
              f3e0
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[length:var(--fs-md)] font-extrabold text-slate-900">
                Admin Panel
              </span>
              <span className="block truncate text-[length:var(--fs-xs)] text-slate-400">
                Manage slots, approvals, faculty & venues
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleDark}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[length:var(--fs-xs)] font-bold text-slate-600 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  )
}
