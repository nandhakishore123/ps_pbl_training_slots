import { useState } from 'react'
import styles from './StudentManagement.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import ScorePill from '../../../components/ui/ScorePill'
import StudentFormModal from '../../../components/modals/StudentFormModal'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function StudentManagement() {
  const { students, allStudents, setStudentActive, loading } = useData()
  const { showToast } = useApp()

  const [yearFilter, setYearFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  const openCreate = () => { setEditingStudent(null); setFormOpen(true) }
  const openEdit = (s) => { setEditingStudent(s); setFormOpen(true) }

  const handleDeactivate = async (s) => {
    if (!window.confirm(`Deactivate "${s.name}"? They will be hidden and can no longer log in. Existing bookings/points are kept.`)) return
    const ok = await setStudentActive(s.student_id, false)
    if (ok === true) showToast('Student deactivated')
  }

  const handleReactivate = async (s) => {
    const ok = await setStudentActive(s.student_id, true)
    if (ok === true) showToast('Student reactivated')
  }

  // Drive the management table off allStudents (it carries email + is_active);
  // fall back to the active-only `students` list until it loads. Filter inactive
  // unless the admin toggles "Show inactive".
  const sourceStudents = (allStudents && allStudents.length) ? allStudents : students
  const filtered = sourceStudents
    .filter((s) => showInactive || Number(s.is_active) !== 0)
    .filter((s) => yearFilter === 'all' || String(s.year_of_study) === yearFilter)
    .filter(
      (s) =>
        search === '' ||
        (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
        (s.reg_num && s.reg_num.toLowerCase().includes(search.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
    )

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className={styles.pageTitle}>Student Management</div>
            <div className={styles.pageSub}>
              {loading ? 'Loading...' : `${filtered.length} students`} · Create, edit & deactivate accounts
            </div>
          </div>
          <button
            style={{ background: '#6c47ff', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
            onClick={openCreate}
          >
            ＋ Add Student
          </button>
        </div>

        {/* FILTERS */}
        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            <option value="1">I Year</option>
            <option value="2">II Year</option>
            <option value="3">III Year</option>
            <option value="4">IV Year</option>
          </select>

          <input
            className={styles.input}
            placeholder="Search name / reg num / email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text2, #6b7280)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        {/* TABLE */}
        <SectionCard noPadding>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Student Name</th>
                  <th style={{ width: '16%' }}>Reg Number</th>
                  <th style={{ width: '18%' }}>Email</th>
                  <th style={{ width: '7%' }}>Year</th>
                  <th style={{ width: '11%' }}>Reward Pts</th>
                  <th style={{ width: '11%' }}>Activity Pts</th>
                  <th style={{ width: '8%' }}>Status</th>
                  <th style={{ width: '9%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>Loading students...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((s, i) => {
                    const inactive = Number(s.is_active) === 0
                    return (
                    <tr key={s.student_id || i} style={inactive ? { opacity: 0.6 } : undefined}>
                      <td><b>{s.name}</b></td>
                      <td className={styles.rollCell}>{s.reg_num || '—'}</td>
                      <td className={styles.rollCell}>{s.email || '—'}</td>
                      <td className={styles.yearCell}>{s.year_of_study || '—'}</td>
                      <td><ScorePill score={Number(s.reward_points) || 0} max={5000} /></td>
                      <td><ScorePill score={Number(s.activity_points) || 0} max={5000} /></td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          color: inactive ? '#6b7280' : '#059669',
                          background: inactive ? 'rgba(107,114,128,0.15)' : 'rgba(16,185,129,0.12)',
                        }}>
                          {inactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(s)}>Edit</button>
                          {inactive ? (
                            <button style={{ color: '#059669' }} onClick={() => handleReactivate(s)}>Reactivate</button>
                          ) : (
                            <button style={{ color: '#ef4444' }} onClick={() => handleDeactivate(s)}>Deactivate</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.empty}>
                        No students match filter
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <StudentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        student={editingStudent}
      />
    </div>
  )
}
