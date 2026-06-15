import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useStore } from '../../../store/useStore'
import { useNavigate } from 'react-router-dom'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const routerNavigate = useNavigate()
  const { state: storeState, showToast: storeShowToast } = useStore()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [darkMode, setDarkMode] = useState(false)

  // ── DARK MODE ───────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('admin-dark')
    if (saved === '1') {
      setDarkMode(true)
    }
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode')
      localStorage.setItem('admin-dark', '1')
    } else {
      document.body.classList.remove('dark-mode')
      localStorage.setItem('admin-dark', '0')
    }
  }, [darkMode])

  const toggleDark = useCallback(() => {
    setDarkMode((prev) => !prev)
  }, [])

  // ── NAVIGATION ──────────────────────────────────────────────
  const navigate = useCallback(
    (pageId) => {
      const routes = {
        dashboard: '/admin-dashboard',
        approvals: '/approvals',
        'faculty-allocation': '/faculty-allocation',
        reports: '/reports',
        settings: '/settings',
        notification: '/notification',
        notifications: '/notification',
        students: '/view-students',
        'venue-allocation': '/venue-allocation',
      }

      const target = routes[pageId] || pageId
      if (typeof target === 'string') {
        setCurrentPage(pageId)
        routerNavigate(target)
        window.scrollTo(0, 0)
      }
    },
    [routerNavigate]
  )

  // ── TOAST ───────────────────────────────────────────────────
  const showToast = useCallback(
    (msg, isError = false) => {
      storeShowToast(msg, isError)
    },
    [storeShowToast]
  )

  return (
    <AppContext.Provider
      value={{
        currentPage,
        navigate,
        darkMode,
        toggleDark,
        toast: storeState.toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
