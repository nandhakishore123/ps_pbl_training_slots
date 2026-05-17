import { useState } from 'react'
import styles from './StudentManagement.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import ScorePill from '../../../components/ui/ScorePill'
import ActionBtn from '../../../components/ui/ActionBtn'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function StudentManagement() {
  const { students } = useData()
  const { showToast } = useApp()

  const [deptFilter, setDeptFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = students
    .filter((s) => deptFilter === 'all' || s.dept === deptFilter)
    .filter((s) => yearFilter === 'all' || s.year === yearFilter)
    .filter(
      (s) =>
        search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Student Management</div>
        <div className={styles.pageSub}>
          331 students across all departments · View & override points
        </div>

        {/* FILTERS */}
        <div className={styles.filterRow}>
          <select
            className={styles.select}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="BIO">BIO</option>
          </select>

          <select
            className={styles.select}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All Years</option>
            <option value="I Year">I Year</option>
            <option value="II Year">II Year</option>
            <option value="III Year">III Year</option>
            <option value="IV Year">IV Year</option>
          </select>

          <input
            className={styles.input}
            placeholder="Search name / roll…"
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
                  <th style={{ width: '22%' }}>Student Name</th>
                  <th style={{ width: '16%' }}>Roll No</th>
                  <th style={{ width: '10%' }}>Year</th>
                  <th style={{ width: '8%' }}>Dept</th>
                  <th style={{ width: '12%' }}>PS Points</th>
                  <th style={{ width: '12%' }}>PBL Points</th>
                  <th style={{ width: '10%' }}>AP Points</th>
                  <th style={{ width: '10%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((s, i) => (
                    <tr key={i}>
                      <td><b>{s.name}</b></td>
                      <td className={styles.rollCell}>{s.roll}</td>
                      <td className={styles.yearCell}>{s.year}</td>
                      <td className={styles.deptCell}>{s.dept}</td>
                      <td><ScorePill score={s.ps} max={100} /></td>
                      <td><ScorePill score={s.pbl} max={100} /></td>
                      <td><ScorePill score={s.ap} max={100} /></td>
                      <td>
                        <ActionBtn
                          label="Edit"
                          variant="edit"
                          onClick={() => showToast('Edit coming soon', false)}
                        />
                      </td>
                    </tr>
                  ))
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
    </div>
  )
}
