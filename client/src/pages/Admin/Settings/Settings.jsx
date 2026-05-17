import { useState } from 'react'
import styles from './Settings.module.css'
import Header from '../Header/Header'
import { useApp } from '../context/AppContext'

const initialRules = [
  { activity: 'Hackathon – 1st Place', points: 10 },
  { activity: 'Paper Publication', points: 15 },
  { activity: 'Sports – National', points: 8 },
  { activity: 'Workshop Participation', points: 3 },
  { activity: 'Seminar Presentation', points: 5 },
]

const departments = ['CSE', 'ECE', 'MECH', 'BIO', 'EEE']

export default function Settings() {
  const { showToast } = useApp()
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [rules, setRules] = useState(initialRules)

  const updatePoints = (index, value) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, points: value } : r))
    )
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Points Details</div>
        <div className={styles.pageSub}>
          Configure academic year, departments and point rules
        </div>

        {/* ACADEMIC YEAR */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Academic Year</div>
          <div className={styles.yearRow}>
            <input
              className={styles.input}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
            <button
              className={styles.saveBtn}
              onClick={() => showToast('Academic year updated', false)}
            >
              Update
            </button>
          </div>
        </div>

        {/* POINT RULES */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Point Rules</div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Activity Type</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={i}>
                    <td>{r.activity}</td>
                    <td>
                      <input
                        className={styles.pointInput}
                        type="number"
                        value={r.points}
                        onChange={(e) => updatePoints(i, e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className={styles.saveBtn}
                        onClick={() => showToast('Rule updated', false)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DEPARTMENTS */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Departments</div>
          <div className={styles.deptChips}>
            {departments.map((d) => (
              <span key={d} className={styles.deptChip}>{d}</span>
            ))}
          </div>
          <button
            className={styles.addDeptBtn}
            onClick={() => showToast('Dept management coming soon', false)}
          >
            + Add Department
          </button>
        </div>

      </div>
    </div>
  )
}
