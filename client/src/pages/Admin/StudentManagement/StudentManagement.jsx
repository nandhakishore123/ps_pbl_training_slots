import { useState } from 'react'
import styles from './StudentManagement.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import ScorePill from '../../../components/ui/ScorePill'
import { useData } from '../context/DataContext'

export default function StudentManagement() {
  const { students, loading } = useData()

  const [deptFilter, setDeptFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = students
    .filter((s) => deptFilter === 'all' || s.department === deptFilter)
    .filter((s) => yearFilter === 'all' || String(s.year_of_study) === yearFilter)
    .filter(
      (s) =>
        search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.reg_num && s.reg_num.toLowerCase().includes(search.toLowerCase()))
    )

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Student Management</div>
        <div className={styles.pageSub}>
          {loading ? 'Loading...' : `${students.length} students across all departments`} · View & override points
        </div>

        {/* FILTERS */}
        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {[...new Set(students.map(s => s.department).filter(Boolean))].sort().map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

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
            placeholder="Search name / reg num…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <SectionCard noPadding>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Student Name</th>
                  <th style={{ width: '20%' }}>Reg Number</th>
                  <th style={{ width: '10%' }}>Year</th>
                  <th style={{ width: '15%' }}>Department</th>
                  <th style={{ width: '15%' }}>Reward Points</th>
                  <th style={{ width: '15%' }}>Activity Points</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className={styles.empty}>Loading students...</td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((s, i) => (
                    <tr key={s.student_id || i}>
                      <td><b>{s.name}</b></td>
                      <td className={styles.rollCell}>{s.reg_num || '—'}</td>
                      <td className={styles.yearCell}>{s.year_of_study || '—'}</td>
                      <td className={styles.deptCell}>{s.department || '—'}</td>
                      <td><ScorePill score={Number(s.reward_points) || 0} max={5000} /></td>
                      <td><ScorePill score={Number(s.activity_points) || 0} max={5000} /></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
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
    </div>
  )
}
