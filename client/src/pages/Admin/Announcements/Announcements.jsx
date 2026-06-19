import { useEffect, useState, useCallback } from 'react'
import styles from './Announcements.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import { useApp } from '../context/AppContext'
import { adminService } from '../../../services/features/adminService'

// Same canonical department codes used on the student Points leaderboard.
const DEPTS = ['AGRI','AIDS','AIML','BIOMEDICAL','BT','CIVIL','CSBS','CSD','CSE','CT','EEE','ECE','EIE','FT','ISE','IT','MECH','MTRS']

const YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
]

function targetLabel(a) {
  const dept = a.target_course ? a.target_course : 'All Departments'
  const yr = a.target_year ? `${a.target_year}${['', 'st', 'nd', 'rd', 'th'][a.target_year] || 'th'} Year` : 'All Years'
  if (!a.target_course && !a.target_year) return 'All Students'
  return `${dept} · ${yr}`
}

function formatDate(ts) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(ts)
  }
}

export default function Announcements() {
  const { showToast } = useApp()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dept, setDept] = useState('all')
  const [year, setYear] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminService.getAnnouncements()
      setItems(res?.data?.items || [])
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load announcements', true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!title.trim()) { showToast('Title is required', true); return }
    if (!body.trim()) { showToast('Message body is required', true); return }
    setSubmitting(true)
    try {
      await adminService.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        target_course: dept === 'all' ? null : dept,
        target_year: year === 'all' ? null : Number(year),
      })
      showToast('Announcement posted')
      setTitle(''); setBody(''); setDept('all'); setYear('all')
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to post announcement', true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (a) => {
    const next = Number(a.is_active) === 0
    try {
      await adminService.setAnnouncementActive(a.announcement_id, next)
      showToast(next ? 'Announcement reactivated' : 'Announcement deactivated')
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update', true)
    }
  }

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.title}"? It will disappear from students immediately.`)) return
    try {
      await adminService.deleteAnnouncement(a.announcement_id)
      showToast('Announcement deleted')
      load()
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete', true)
    }
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Announcements</div>
        <div className={styles.pageSub}>
          Broadcast messages to students by department and/or year
        </div>

        <div className={styles.grid}>
          {/* CREATE FORM */}
          <SectionCard>
            <form className={styles.form} onSubmit={handleCreate}>
              <div className={styles.formTitle}>New Announcement</div>

              <label className={styles.field}>
                <span className={styles.label}>Title</span>
                <input
                  className={styles.input}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab maintenance on Friday"
                  maxLength={255}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Message</span>
                <textarea
                  className={styles.textarea}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the announcement students will see…"
                  rows={5}
                />
              </label>

              <div className={styles.targetRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Department</span>
                  <select className={styles.select} value={dept} onChange={(e) => setDept(e.target.value)}>
                    <option value="all">All Departments</option>
                    {DEPTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>Year</span>
                  <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)}>
                    <option value="all">All Years</option>
                    {YEARS.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.targetHint}>
                Target: <b>{(dept === 'all' && year === 'all')
                  ? 'All Students'
                  : `${dept === 'all' ? 'All Departments' : dept} · ${year === 'all' ? 'All Years' : YEARS.find((y) => y.value === year)?.label}`}</b>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Posting…' : 'Post Announcement'}
              </button>
            </form>
          </SectionCard>

          {/* LIST */}
          <SectionCard noPadding>
            <div className={styles.listHead}>
              <span>Posted Announcements</span>
              <span className={styles.count}>{loading ? '…' : `${items.length}`}</span>
            </div>
            <div className={styles.list}>
              {loading ? (
                <div className={styles.empty}>Loading…</div>
              ) : items.length === 0 ? (
                <div className={styles.empty}>No announcements yet</div>
              ) : (
                items.map((a) => {
                  const inactive = Number(a.is_active) === 0
                  return (
                    <div key={a.announcement_id} className={`${styles.item} ${inactive ? styles.itemInactive : ''}`}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemTitle}>{a.title}</div>
                        <span className={`${styles.status} ${inactive ? styles.statusOff : styles.statusOn}`}>
                          {inactive ? 'Inactive' : 'Active'}
                        </span>
                      </div>
                      <div className={styles.itemBody}>{a.body}</div>
                      <div className={styles.itemMeta}>
                        <span className={styles.targetChip}>{targetLabel(a)}</span>
                        <span className={styles.date}>{formatDate(a.created_at)}</span>
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleToggle(a)}
                        >
                          {inactive ? 'Reactivate' : 'Deactivate'}
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(a)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
