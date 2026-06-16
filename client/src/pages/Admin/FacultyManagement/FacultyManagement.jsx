import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './FacultyManagement.module.css'
import SectionCard from '../../../components/ui/SectionCard'
import { superAdminService } from '../../../services/features/superAdminService'

const formatTime = (t) => {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hh = parseInt(h, 10)
  if (Number.isNaN(hh)) return String(t)
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`
}

const errMsg = (err, fallback) => err?.response?.data?.message || fallback

// ── Group flat rows (faculty × mapping) into faculty objects ──────────────────
function groupFaculty(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.faculty_id)) {
      map.set(r.faculty_id, {
        faculty_id: r.faculty_id,
        user_id: r.user_id,
        name: r.name,
        reg_num: r.reg_num,
        email: r.email,
        designation: r.designation,
        department: r.department,
        is_active: r.is_active,
        mappings: [],
      })
    }
    if (r.mapping_id) {
      map.get(r.faculty_id).mappings.push({
        mapping_id: r.mapping_id,
        venue_id: r.venue_id,
        venue_name: r.venue_name,
        location: r.location,
        slot_id: r.slot_id,
        start_time: r.start_time,
        end_time: r.end_time,
      })
    }
  }
  return Array.from(map.values())
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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

export default function FacultyManagement() {
  const navigate = useNavigate()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [busy, setBusy] = useState(false)

  // modal: { type: 'create'|'edit'|'assign'|'reassign'|'revoke', faculty?, mapping? }
  const [modal, setModal] = useState(null)

  // form state
  const [form, setForm] = useState({})
  // lookups for assign
  const [lookups, setLookups] = useState({ venues: [], slots: [], skills: [] })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await superAdminService.listFaculty()
      setRows(res.data || [])
    } catch (err) {
      setError(errMsg(err, 'Failed to load faculty.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const faculty = useMemo(() => groupFaculty(rows), [rows])

  const stats = useMemo(() => {
    const total = faculty.length
    const active = faculty.filter((f) => Number(f.is_active) === 1).length
    const assigned = faculty.filter((f) => f.mappings.length > 0).length
    return { total, active, revoked: total - active, assigned }
  }, [faculty])

  // ── open modals ─────────────────────────────────────────────
  const openCreate = () => {
    setForm({ name: '', email: '', designation: '', department: '' })
    setModal({ type: 'create' })
  }

  const openEdit = (f) => {
    setForm({ name: f.name || '', designation: f.designation || '', department: f.department || '' })
    setModal({ type: 'edit', faculty: f })
  }

  const openAssign = async (f) => {
    setForm({ venueId: '', slotId: '', trainingSkillId: '' })
    setModal({ type: 'assign', faculty: f })
    try {
      const [v, s, sk] = await Promise.all([
        superAdminService.getVenues(),
        superAdminService.getSlotTimings(),
        superAdminService.getTrainingSkills(),
      ])
      setLookups({ venues: v.data || [], slots: s.data || [], skills: sk.data || [] })
    } catch (err) {
      showToast(errMsg(err, 'Failed to load assignment options.'), 'error')
    }
  }

  const openReassign = (f, mapping = null) => {
    setForm({ toFacultyId: '', reason: '', mode: mapping ? 'individual' : 'all' })
    setModal({ type: 'reassign', faculty: f, mapping })
  }

  const openRevoke = (f) => setModal({ type: 'revoke', faculty: f })

  const closeModal = () => { if (!busy) { setModal(null); setForm({}) } }

  // ── submit handlers ─────────────────────────────────────────
  const submitCreate = async () => {
    setBusy(true)
    try {
      await superAdminService.createFaculty({
        name: form.name,
        email: form.email,
        designation: form.designation,
        department: form.department,
      })
      showToast('Faculty created.')
      setModal(null); setForm({})
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to create faculty.'), 'error')
    } finally { setBusy(false) }
  }

  const submitEdit = async () => {
    setBusy(true)
    try {
      await superAdminService.updateFaculty(modal.faculty.faculty_id, {
        name: form.name,
        designation: form.designation,
        department: form.department,
      })
      showToast('Faculty updated.')
      setModal(null); setForm({})
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to update faculty.'), 'error')
    } finally { setBusy(false) }
  }

  const submitAssign = async () => {
    setBusy(true)
    try {
      await superAdminService.assignFacultyToLab(modal.faculty.faculty_id, {
        venueId: form.venueId,
        slotId: form.slotId,
        trainingSkillId: form.trainingSkillId,
      })
      showToast('Faculty assigned to lab.')
      setModal(null); setForm({})
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to assign faculty to lab.'), 'error')
    } finally { setBusy(false) }
  }

  const submitReassign = async () => {
    setBusy(true)
    try {
      if (form.mode === 'individual') {
        await superAdminService.reassignIndividual({
          mappingId: modal.mapping.mapping_id,
          toFacultyId: form.toFacultyId,
          reason: form.reason,
        })
      } else {
        await superAdminService.reassignAll({
          fromFacultyId: modal.faculty.faculty_id,
          toFacultyId: form.toFacultyId,
          reason: form.reason,
        })
      }
      showToast('Venue(s) reassigned.')
      setModal(null); setForm({})
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to reassign.'), 'error')
    } finally { setBusy(false) }
  }

  const submitRevoke = async () => {
    setBusy(true)
    try {
      await superAdminService.revokeFaculty(modal.faculty.faculty_id)
      showToast('Faculty revoked.')
      setModal(null)
      await load()
    } catch (err) {
      // 409 when the faculty still has labs — show the backend message inline.
      showToast(errMsg(err, 'Failed to revoke faculty.'), 'error')
    } finally { setBusy(false) }
  }

  const reactivate = async (f) => {
    setBusy(true)
    try {
      await superAdminService.reactivateFaculty(f.faculty_id)
      showToast('Faculty reactivated.')
      await load()
    } catch (err) {
      showToast(errMsg(err, 'Failed to reactivate faculty.'), 'error')
    } finally { setBusy(false) }
  }

  // target list for reassign (exclude self)
  const reassignTargets = useMemo(
    () => faculty.filter((f) => f.faculty_id !== modal?.faculty?.faculty_id),
    [faculty, modal]
  )

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
            <div className={styles.headerTitle}>Faculty Management</div>
            <div className={styles.headerSub}>Create, edit, assign labs & revoke faculty accounts</div>
          </div>
        </div>
        <button className={styles.primaryBtn} onClick={openCreate}>+ Create Faculty</button>
      </header>

      <div className={styles.content}>
        {/* MINI STATS */}
        <div className={styles.miniStats}>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#6c47ff' }}>{stats.total}</div><div className={styles.miniLabel}>Total Faculty</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#059669' }}>{stats.active}</div><div className={styles.miniLabel}>Active</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#ef4444' }}>{stats.revoked}</div><div className={styles.miniLabel}>Revoked</div></div>
          <div className={styles.miniCard}><div className={styles.miniVal} style={{ color: '#f59e0b' }}>{stats.assigned}</div><div className={styles.miniLabel}>With Labs</div></div>
        </div>

        <SectionCard title="Faculty" noPadding>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Name</th>
                  <th style={{ width: '20%' }}>Email</th>
                  <th style={{ width: '12%' }}>Department</th>
                  <th style={{ width: '26%' }}>Assigned Labs</th>
                  <th style={{ width: '8%' }}>Status</th>
                  <th style={{ width: '14%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><div className={styles.empty}>Loading faculty…</div></td></tr>
                ) : error ? (
                  <tr><td colSpan={6}><div className={styles.empty} style={{ color: '#ef4444' }}>{error}</div></td></tr>
                ) : faculty.length === 0 ? (
                  <tr><td colSpan={6}><div className={styles.empty}>No faculty yet. Click “Create Faculty” to add one.</div></td></tr>
                ) : faculty.map((f) => {
                  const active = Number(f.is_active) === 1
                  return (
                    <tr key={f.faculty_id}>
                      <td>
                        <div className={styles.facName}>{f.name}</div>
                        {f.reg_num && <div className={styles.facReg}>{f.reg_num}</div>}
                        {f.designation && <div className={styles.facReg} style={{ fontFamily: 'inherit' }}>{f.designation}</div>}
                      </td>
                      <td className={styles.email}>{f.email}</td>
                      <td>{f.department || '—'}</td>
                      <td>
                        {f.mappings.length > 0 ? (
                          <div className={styles.slotTags}>
                            {f.mappings.map((m) => (
                              <span key={m.mapping_id} className={styles.slotTag}>
                                <b>{m.venue_name}</b> · {formatTime(m.start_time)}–{formatTime(m.end_time)}
                                <button
                                  className={styles.actionBtn}
                                  style={{ padding: '2px 6px', fontSize: 10 }}
                                  title="Reassign this lab"
                                  onClick={() => openReassign(f, m)}
                                >⇄</button>
                              </span>
                            ))}
                          </div>
                        ) : <span className={styles.noSlots}>— No labs —</span>}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${active ? styles.badgeActive : styles.badgeRevoked}`}>
                          {active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => openEdit(f)}>Edit</button>
                          <button className={styles.actionBtn} onClick={() => openAssign(f)}>Assign Lab</button>
                          {f.mappings.length > 0 && (
                            <button className={styles.actionBtn} onClick={() => openReassign(f, null)}>Reassign All</button>
                          )}
                          {active ? (
                            <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => openRevoke(f)}>Revoke</button>
                          ) : (
                            <button className={styles.actionBtn} onClick={() => reactivate(f)}>Reactivate</button>
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

      {/* ── CREATE ── */}
      {modal?.type === 'create' && (
        <Modal
          title="Create Faculty"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitCreate} disabled={busy || !form.name?.trim() || !form.email?.trim()}>
                {busy ? 'Creating…' : 'Create'}
              </button>
            </>
          }
        >
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email *</label>
            <input className={styles.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="faculty@bitsathy.ac.in" />
            <div className={styles.hint}>Must be the faculty’s real Google account — this is their login.</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Designation</label>
            <input className={styles.input} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Assistant Professor" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Department</label>
            <input className={styles.input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. CSE" />
          </div>
        </Modal>
      )}

      {/* ── EDIT ── */}
      {modal?.type === 'edit' && (
        <Modal
          title="Edit Faculty"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitEdit} disabled={busy || !form.name?.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        >
          <div className={styles.field}>
            <label className={styles.label}>Email (login — not editable)</label>
            <input className={styles.input} value={modal.faculty.email} disabled />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Designation</label>
            <input className={styles.input} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Department</label>
            <input className={styles.input} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </Modal>
      )}

      {/* ── ASSIGN LAB ── */}
      {modal?.type === 'assign' && (
        <Modal
          title="Assign Lab"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitAssign} disabled={busy || !form.venueId || !form.slotId || !form.trainingSkillId}>
                {busy ? 'Assigning…' : 'Assign'}
              </button>
            </>
          }
        >
          <div className={styles.note}>Assigning <b>{modal.faculty.name}</b> to a venue + slot, and linking that venue to the chosen skill so students can book it.</div>
          <div className={styles.field}>
            <label className={styles.label}>Venue *</label>
            <select className={styles.select} value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
              <option value="">Select venue</option>
              {lookups.venues.map((v) => (
                <option key={v.venue_id} value={v.venue_id}>{v.venue_name}{v.location ? ` — ${v.location}` : ''}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Slot *</label>
            <select className={styles.select} value={form.slotId} onChange={(e) => setForm({ ...form, slotId: e.target.value })}>
              <option value="">Select slot</option>
              {lookups.slots.map((s) => (
                <option key={s.slot_id} value={s.slot_id}>{formatTime(s.start_time)} – {formatTime(s.end_time)}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Training Skill *</label>
            <select className={styles.select} value={form.trainingSkillId} onChange={(e) => setForm({ ...form, trainingSkillId: e.target.value })}>
              <option value="">Select skill</option>
              {lookups.skills.map((sk) => (
                <option key={sk.training_skill_id} value={sk.training_skill_id}>{sk.skill_name}{sk.skill_type ? ` (${sk.skill_type})` : ''}</option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* ── REASSIGN ── */}
      {modal?.type === 'reassign' && (
        <Modal
          title={form.mode === 'individual' ? 'Reassign Lab' : 'Reassign All Labs'}
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={styles.btnSubmit} onClick={submitReassign} disabled={busy || !form.toFacultyId || !form.reason?.trim()}>
                {busy ? 'Reassigning…' : 'Reassign'}
              </button>
            </>
          }
        >
          <div className={styles.note}>
            {form.mode === 'individual'
              ? <>Moving <b>{modal.mapping.venue_name}</b> ({formatTime(modal.mapping.start_time)}–{formatTime(modal.mapping.end_time)}) from <b>{modal.faculty.name}</b>.</>
              : <>Moving all <b>{modal.faculty.mappings.length}</b> lab(s) from <b>{modal.faculty.name}</b>.</>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reassign to *</label>
            <select className={styles.select} value={form.toFacultyId} onChange={(e) => setForm({ ...form, toFacultyId: e.target.value })}>
              <option value="">Select target faculty</option>
              {reassignTargets.map((t) => (
                <option key={t.faculty_id} value={t.faculty_id}>{t.name}{t.department ? ` — ${t.department}` : ''}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reason *</label>
            <textarea className={styles.textarea} rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for transfer…" />
          </div>
        </Modal>
      )}

      {/* ── REVOKE ── */}
      {modal?.type === 'revoke' && (
        <Modal
          title="Revoke Faculty"
          onClose={closeModal}
          footer={
            <>
              <button className={styles.btnCancel} onClick={closeModal} disabled={busy}>Cancel</button>
              <button className={`${styles.btnSubmit} ${styles.btnDanger}`} onClick={submitRevoke} disabled={busy}>
                {busy ? 'Revoking…' : 'Revoke'}
              </button>
            </>
          }
        >
          <div className={styles.warn}>
            This deactivates <b>{modal.faculty.name}</b>’s login. If they still have assigned labs, revoke is blocked — reassign their labs first.
          </div>
          {modal.faculty.mappings.length > 0 && (
            <div className={styles.hint}>This faculty currently has {modal.faculty.mappings.length} assigned lab(s).</div>
          )}
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
