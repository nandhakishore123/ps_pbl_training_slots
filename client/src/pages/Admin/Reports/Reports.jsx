import { useEffect, useState } from 'react'
import styles from './Reports.module.css'
import Header from '../Header/Header'
import { useData } from '../context/DataContext'

// Stage 6b: real, READ-ONLY analytics. All numbers come from /admin/reports/*.
// Any metric without a real data source (AP claims → needs Stage 6a) is shown as
// a clearly-labelled placeholder, never a fake number.

const STATUS_ORDER = ['ONGOING', 'PASS', 'FAIL', 'COMPLETED', 'MALPRACTICE']
const fmtPct = (v) => (v == null ? '—' : `${v}%`)

export default function Reports() {
  const { getReportsSummary, getReportsBySkill, getReportsByCourse, getReportsTimeline } = useData()

  const [summary, setSummary] = useState(null)
  const [bySkill, setBySkill] = useState([])
  const [byCourse, setByCourse] = useState([])
  const [timeline, setTimeline] = useState({ byDate: [], byVenue: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      const [s, sk, co, tl] = await Promise.all([
        getReportsSummary(),
        getReportsBySkill(),
        getReportsByCourse(),
        getReportsTimeline(),
      ])
      if (!alive) return
      setSummary(s)
      setBySkill(Array.isArray(sk) ? sk : [])
      setByCourse(Array.isArray(co) ? co : [])
      setTimeline(tl || { byDate: [], byVenue: [] })
      setLoading(false)
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Headline stat tiles — driven by summary (null-safe until loaded).
  const stats = [
    {
      label: 'Attendance Rate',
      val: fmtPct(summary?.attendance?.rate),
      color: 'var(--green)',
      sub: summary ? `${summary.attendance.present}/${summary.attendance.marked} marked present` : '—',
    },
    {
      label: 'Assessment Pass Rate',
      val: fmtPct(summary?.assessments?.passRate),
      color: 'var(--purple)',
      sub: summary ? `${summary.assessments.passed} passed / ${summary.assessments.failed} failed` : '—',
    },
    {
      label: 'Lab Records Submitted',
      val: fmtPct(summary?.labRecords?.rate),
      color: 'var(--gold)',
      sub: summary ? `${summary.labRecords.withRecord} of ${summary.labRecords.totalBookings} bookings` : '—',
    },
    {
      label: 'Slots with Incharge',
      val: fmtPct(summary?.slotsWithIncharge?.rate),
      color: 'var(--blue)',
      sub: summary ? `${summary.slotsWithIncharge.covered}/${summary.slotsWithIncharge.total} active slots` : '—',
    },
  ]

  const maxVenue = Math.max(1, ...timeline.byVenue.map((v) => v.count))
  const maxDate = Math.max(1, ...timeline.byDate.map((d) => d.count))

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Reports & Analytics</div>
        <div className={styles.pageSub}>
          System-wide performance, attendance and completion rates
        </div>

        {loading ? (
          <div className={styles.muted}>Loading analytics…</div>
        ) : (
          <div className={styles.grid}>

            {/* HEADLINE STAT CARDS */}
            {stats.map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statVal} style={{ color: s.color }}>{s.val}</div>
                <div className={styles.statSub}>{s.sub}</div>
              </div>
            ))}

            {/* AP CLAIMS — placeholder (no real source until Stage 6a) */}
            <div className={styles.statCard}>
              <div className={styles.statLabel}>AP Claims Approved</div>
              <div className={styles.placeholderVal}>—</div>
              <div className={styles.placeholderBadge}>Awaiting Stage 6a</div>
              <div className={styles.statSub} style={{ marginTop: 6 }}>
                No activity-point claim data source yet
              </div>
            </div>

            {/* TOTAL BOOKINGS BY STATUS */}
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Bookings</div>
              <div className={styles.statVal}>{summary?.totalBookings ?? 0}</div>
              <div className={styles.statSub}>Across all slots & venues</div>
            </div>

            <div className={`${styles.statCard} ${styles.fullWidth}`}>
              <div className={styles.deptTitle}>Bookings by Status</div>
              <div className={styles.statusRow}>
                {STATUS_ORDER.map((st) => (
                  <div key={st} className={styles.statusChip}>
                    <span className={styles.statusChipVal}>{summary?.bookingsByStatus?.[st] ?? 0}</span>
                    <span className={styles.statusChipLabel}>{st}</span>
                  </div>
                ))}
              </div>
              {summary?.assessments != null && (
                <div className={styles.statSub} style={{ marginTop: 12 }}>
                  Assessments — avg score {fmtPct(summary.assessments.avgScorePct)} ·
                  {' '}{summary.assessments.total} attempts ({summary.assessments.ongoing} ongoing)
                </div>
              )}
            </div>

            {/* COMPLETION BY COURSE (department proxy — no department column on students) */}
            <div className={`${styles.statCard} ${styles.fullWidth}`}>
              <div className={styles.deptTitle}>Completion by Course (department proxy)</div>
              {byCourse.length === 0 ? (
                <div className={styles.muted}>No booking data yet.</div>
              ) : (
                byCourse.map((d) => (
                  <div key={d.course} className={styles.deptRow}>
                    <div className={styles.barName} title={d.course}>{d.course}</div>
                    <div className={styles.progressWrap}>
                      <div className={styles.progressFill} style={{ width: `${d.completionRate}%` }} />
                    </div>
                    <div className={styles.deptPct}>{d.completionRate}%</div>
                  </div>
                ))
              )}
            </div>

            {/* COMPLETION / PASS-FAIL BY SKILL */}
            <div className={`${styles.statCard} ${styles.fullWidth}`}>
              <div className={styles.deptTitle}>By Course / Lab</div>
              {bySkill.length === 0 ? (
                <div className={styles.muted}>No booking data yet.</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Course / Lab</th>
                      <th>Type</th>
                      <th className={styles.numCell}>Bookings</th>
                      <th className={styles.numCell}>Pass</th>
                      <th className={styles.numCell}>Fail</th>
                      <th className={styles.numCell}>Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySkill.map((r) => (
                      <tr key={r.training_skill_id}>
                        <td>{r.skill_name}</td>
                        <td>{r.skill_type}</td>
                        <td className={styles.numCell}>{r.bookings}</td>
                        <td className={styles.numCell}>{r.pass}</td>
                        <td className={styles.numCell}>{r.fail}</td>
                        <td className={styles.numCell}>{r.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* BOOKINGS PER VENUE */}
            <div className={`${styles.statCard} ${styles.fullWidth}`}>
              <div className={styles.deptTitle}>Bookings per Venue</div>
              {timeline.byVenue.length === 0 ? (
                <div className={styles.muted}>No booking data yet.</div>
              ) : (
                timeline.byVenue.map((v) => (
                  <div key={v.venue_name} className={styles.deptRow}>
                    <div className={styles.barName} title={v.venue_name}>{v.venue_name}</div>
                    <div className={styles.progressWrap}>
                      <div className={styles.progressFill} style={{ width: `${Math.round((v.count / maxVenue) * 100)}%` }} />
                    </div>
                    <div className={styles.deptPct}>{v.count}</div>
                  </div>
                ))
              )}
            </div>

            {/* BOOKINGS OVER TIME (recent dates) */}
            <div className={`${styles.statCard} ${styles.fullWidth}`}>
              <div className={styles.deptTitle}>Bookings over Time (recent)</div>
              {timeline.byDate.length === 0 ? (
                <div className={styles.muted}>No booking data yet.</div>
              ) : (
                timeline.byDate.map((d) => (
                  <div key={d.slot_date} className={styles.deptRow}>
                    <div className={styles.barName} title={d.slot_date}>{d.slot_date}</div>
                    <div className={styles.progressWrap}>
                      <div className={styles.progressFill} style={{ width: `${Math.round((d.count / maxDate) * 100)}%` }} />
                    </div>
                    <div className={styles.deptPct}>{d.count}</div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
