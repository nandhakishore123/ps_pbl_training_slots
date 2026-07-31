// UserManagement.jsx — Admin console for NON-STUDENT users (roles 2,3,4,5).
// Create, list, switch role, set a display name, and activate/deactivate.
// Students (role 1) are deliberately absent — they stay in Student Management.
// Layout/behaviour mirrors FacultyManagement (header + miniStats + table +
// modal shell + bottom-right toast).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './UserManagement.module.css'
import SectionCard from '../../../components/ui/SectionCard'
import { adminService } from '../../../services/features/adminService'
import { useAuthStore } from '../../../store/authStore'

const errMsg = (err, fallback) => err?.response?.data?.message || fallback

// The only roles this page manages. Role 1 (student) is intentionally absent.
const ROLES = [
  { id: 2, label: 'Faculty' },
  { id: 3, label: 'Admin' },
  { id: 4, label: 'Inventory Incharge' },
  { id: 5, label: 'Intern' },
]
const roleLabel = (roleId) => ROLES.find((r) => r.id === Number(roleId))?.label || `Role ${roleId}`

// ── Modal shell (same shape as FacultyManagement's) ──────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{title}</div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const navigate = useNavigate()
  // The logged-in admin — used to disable the self-destructive row actions.
  // The backend enforces this too; the UI just makes it visible.
  const me = useAuthStore((s) => s.user)
  const myUserId = Number(me?.user_id)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // modal: { type: 'create'|'role'|'name'|'deactivate', user? }
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.getManageUsers()
      setUsers(res?.data?.items || [])
    } catch (err) {
      setError(errMsg(err, 'Failed to load users.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => Number(u.is_active) === 1).length
    const interns = users.filter((u) => Number(u.role_id) === 5).length
    return { total, active, inactive: total - active, interns }
  }, [users])

  // ── open modals ─────────────────────────────────────────────
  const openCreate = () => {
    setForm({ name: '', email: '', role_id: '' })
    setModal({ type: 'create' })
  }
  const openRole = (u) => {
    setForm({ role_id: String(u.role_id) })
    setModal({ type: 'role', user: u })
  }
  const openName = (u) => {
    setForm({ name: u.name || '' })
    setModal({ type: 'name', user: u })
  }
  const openDeactivate = (u) => setModal({ type: 'deactivate', user: u })
  const closeModal = () => { if (!busy) { setModal(null); setForm({}) } }

  // ── actions ─────────────────────────────────────────────────
  const submitCreate = async () => {
    setBusy(true)
    try {
      await adminService.createManageUser({
        email: String(form.email || '').trim(),
        name: String(form.name || '').trim(),
        role_id: Number(form.role_id),
      })
      showToast('User created.')
      closeModal()
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to create user.'), 'error')
    } finally { setBusy(false) }
  }

  const submitRole = async () => {
    setBusy(true)
    try {
      await adminService.switchUserRole(modal.user.user_id, Number(form.role_id))
      showToast('Role updated.')
      closeModal()
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to update role.'), 'error')
    } finally { setBusy(false) }
  }

  const submitName = async () => {
    setBusy(true)
    try {
      await adminService.setUserName(modal.user.user_id, String(form.name || '').trim())
      showToast('Name updated.')
      closeModal()
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to update name.'), 'error')
    } finally { setBusy(false) }
  }

  const confirmDeactivate = async () => {
    setBusy(true)
    try {
      await adminService.setUserActive(modal.user.user_id, false)
      showToast('User deactivated.')
      closeModal()
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to deactivate user.'), 'error')
    } finally { setBusy(false) }
  }

  // Activating is not destructive — no confirm step.
  const activate = async (u) => {
    setBusy(true)
    try {
      await adminService.setUserActive(u.user_id, true)
      showToast('User activated.')
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to activate user.'), 'error')
    } finally { setBusy(false) }
  }

  const createValid = String(form.name || '').trim() && String(form.email || '').trim() && form.role_id

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/admin-dashboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <div>
            <div className={styles.headerTitle}>User Management</div>
            <div className={styles.headerSub}>Create & manage faculty, admin, incharge and intern accounts</div>
          </div>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>+ Add User</button>
      </header>

      <div className={styles.content}>
        {/* MINI STATS */}
        <div className={styles.miniStats}>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#6c47ff' }}>{stats.total}</div><div className={styles.miniLabel}>Total Users</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#059669' }}>{stats.active}</div><div className={styles.miniLabel}>Active</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#ef4444' }}>{stats.inactive}</div><div className={styles.miniLabel}>Inactive</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#f59e0b' }}>{stats.interns}</div><div className={styles.miniLabel}>Interns</div></div>
        </div>

        <SectionCard title="Users (excluding students)" noPadding>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Name</th>
                  <th style={{ width: '28%' }}>Email</th>
                  <th style={{ width: '16%' }}>Role</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '22%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}><div className={styles.empty}>Loading users…</div></td></tr>
                ) : error ? (
                  <tr><td colSpan={5}><div className={styles.empty} style={{ color: '#ef4444' }}>{error}</div></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5}><div className={styles.empty}>No users yet. Click “Add User” to create one.</div></td></tr>
                ) : users.map((u) => {
                  const active = Number(u.is_active) === 1
                  const isSelf = Number(u.user_id) === myUserId
                  return (
                    <tr key={u.user_id}>
                      <td>
                        {u.name
                          ? <span className={styles.userName}>{u.name}</span>
                          : <span className={styles.noName}>—</span>}
                        {isSelf && <span className={styles.selfTag}>You</span>}
                      </td>
                      <td className={styles.email}>{u.email}</td>
                      <td><span className={styles.roleTag}>{roleLabel(u.role_id)}</span></td>
                      <td>
                        <span className={`${styles.badge} ${active ? styles.badgeActive : styles.badgeInactive}`}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionBtn}
                            disabled={busy || isSelf}
                            title={isSelf ? 'You cannot change your own role' : 'Change role'}
                            onClick={() => openRole(u)}
                          >Change Role</button>
                          <button className={styles.actionBtn} disabled={busy} onClick={() => openName(u)}>
                            {u.name ? 'Edit Name' : 'Set Name'}
                          </button>
                          {active ? (
                            <button
                              className={`${styles.actionBtn} ${styles.actionDanger}`}
                              disabled={busy || isSelf}
                              title={isSelf ? 'You cannot deactivate yourself' : 'Deactivate'}
                              onClick={() => openDeactivate(u)}
                            >Deactivate</button>
                          ) : (
                            <button className={styles.actionBtn} disabled={busy} onClick={() => activate(u)}>Activate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* CREATE */}
      {modal?.type === 'create' && (
        <Modal
          title="Add User"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitCreate} disabled={busy || !createValid}>
                {busy ? 'Creating…' : 'Create'}
              </button>
            </>
          }
        >
          <div className={styles.note}>
            Students are created in <strong>Student Management</strong> — this page covers faculty, admins, inventory incharges and interns.
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input className={styles.input} value={form.name || ''} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email *</label>
            <input className={styles.input} type="email" value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@bitsathy.ac.in" />
            <div className={styles.hint}>This is the Google account they will sign in with.</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Role *</label>
            <select className={styles.select} value={form.role_id || ''}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              <option value="">— Select role —</option>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {/* CHANGE ROLE */}
      {modal?.type === 'role' && (
        <Modal
          title="Change Role"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitRole}
                disabled={busy || !form.role_id || Number(form.role_id) === Number(modal.user.role_id)}>
                {busy ? 'Saving…' : 'Save Role'}
              </button>
            </>
          }
        >
          <div className={styles.field}>
            <label className={styles.label}>User</label>
            <input className={styles.input} value={`${modal.user.name || '—'} · ${modal.user.email}`} disabled />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Role</label>
            <select className={styles.select} value={form.role_id || ''}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className={styles.note}>
            They will be signed out and must log in again for the new role to apply.
          </div>
        </Modal>
      )}

      {/* SET / EDIT NAME */}
      {modal?.type === 'name' && (
        <Modal
          title={modal.user.name ? 'Edit Name' : 'Set Name'}
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitName} disabled={busy || !String(form.name || '').trim()}>
                {busy ? 'Saving…' : 'Save Name'}
              </button>
            </>
          }
        >
          <div className={styles.field}>
            <label className={styles.label}>Email (not editable)</label>
            <input className={styles.input} value={modal.user.email} disabled />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input className={styles.input} value={form.name || ''} autoFocus
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
            <div className={styles.hint}>Shown as the buyer name on lab purchases.</div>
          </div>
        </Modal>
      )}

      {/* DEACTIVATE CONFIRM */}
      {modal?.type === 'deactivate' && (
        <Modal
          title="Deactivate User"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={`${styles.btnSubmit} ${styles.btnDanger}`} onClick={confirmDeactivate} disabled={busy}>
                {busy ? 'Deactivating…' : 'Deactivate'}
              </button>
            </>
          }
        >
          <div className={styles.warn}>
            Deactivate <strong>{modal.user.name || modal.user.email}</strong>? They will be signed out and blocked from logging in until reactivated.
          </div>
        </Modal>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastErr : styles.toastOk}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
