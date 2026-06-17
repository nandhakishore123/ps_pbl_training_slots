import { useState, useEffect, useCallback } from 'react'
import styles from './Approvals.module.css'
import Header from '../Header/Header'
import Badge from '../../../components/ui/Badge'
import ActionBtn from '../../../components/ui/ActionBtn'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function Approvals() {
  const {
    apApprovals, handleApApproval,
    getLabRecordApprovals, getLabRecordApprovalDetail, approveLabRecord, rejectLabRecord,
  } = useData()
  const { showToast } = useApp()
  const [activeTab, setActiveTab] = useState('lab')

  // ── Lab Records (real data — Stage 6a-i) ──────────────────────
  const [labStatus, setLabStatus] = useState('pending') // 'pending' | 'all'
  const [labRecords, setLabRecords] = useState([])
  const [labLoading, setLabLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null) // { booking, responses }
  const [detailLoading, setDetailLoading] = useState(false)

  const loadLabRecords = useCallback(async () => {
    setLabLoading(true)
    const data = await getLabRecordApprovals(labStatus)
    setLabRecords(Array.isArray(data) ? data : [])
    setLabLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labStatus])

  useEffect(() => { loadLabRecords() }, [loadLabRecords])

  const openDetail = async (b) => {
    setDetailLoading(true)
    setDetail({ booking: b, responses: null }) // open shell while loading
    const d = await getLabRecordApprovalDetail(b.booking_id)
    setDetail(d || null)
    setDetailLoading(false)
  }

  const handleApprove = async (b) => {
    if (!window.confirm(`Approve ${b.student_name}'s lab record?`)) return
    setBusyId(b.booking_id)
    const ok = await approveLabRecord(b.booking_id)
    setBusyId(null)
    if (ok) { showToast('Lab record approved'); loadLabRecords() }
  }

  const handleReject = async (b) => {
    if (!window.confirm(`Reject ${b.student_name}'s lab record?`)) return
    setBusyId(b.booking_id)
    const ok = await rejectLabRecord(b.booking_id)
    setBusyId(null)
    if (ok) { showToast('Lab record rejected', true); loadLabRecords() }
  }

  // ── AP Claims (still mock — wired in Stage 6a-ii) ─────────────
  const onApAction = (id, action) => {
    handleApApproval(id, action)
    showToast(action === 'approved' ? 'AP claim approved!' : 'AP claim rejected', action === 'rejected')
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>System Approvals</div>
        <div className={styles.pageSub}>
          All pending lab records and AP claims across all faculty
        </div>

        {/* TABS */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'lab' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('lab')}
          >
            Lab Records
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'ap' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('ap')}
          >
            AP Claims
          </button>
        </div>

        {/* LAB RECORDS TAB — real data */}
        {activeTab === 'lab' && (
          <div className={styles.sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <select
                value={labStatus}
                onChange={(e) => setLabStatus(e.target.value)}
                style={{ padding: '8px 12px', border: '1.5px solid #e5e4eb', borderRadius: 10, fontSize: 13, color: '#1a1a2e', background: '#fff', cursor: 'pointer' }}
              >
                <option value="pending">Pending</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Student</th>
                    <th style={{ width: '14%' }}>Reg No</th>
                    <th style={{ width: '20%' }}>Course / Lab</th>
                    <th style={{ width: '16%' }}>Faculty</th>
                    <th style={{ width: '12%' }}>Slot Date</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labLoading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>Loading lab records…</td></tr>
                  ) : labRecords.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
                      {labStatus === 'pending' ? 'No pending lab records.' : 'No lab records found.'}
                    </td></tr>
                  ) : labRecords.map((l) => {
                    const pending = (l.approval_status || 'PENDING') === 'PENDING'
                    return (
                      <tr key={l.booking_id}>
                        <td><b>{l.student_name}</b></td>
                        <td className={styles.subCell}>{l.reg_num}</td>
                        <td className={styles.subCell}>
                          {l.skill_name}{l.level_name ? ` · L${l.level_name}` : ''}
                        </td>
                        <td className={styles.subCell}>{l.faculty_name || '—'}</td>
                        <td className={styles.subCell}>{l.slot_date || '—'}</td>
                        <td><Badge status={(l.approval_status || 'PENDING').toLowerCase()} /></td>
                        <td>
                          <div className={styles.actionBtns}>
                            <ActionBtn label="View" variant="view" onClick={() => openDetail(l)} />
                            {pending && (
                              <>
                                <ActionBtn label="✓" variant="approve" onClick={() => handleApprove(l)} />
                                <ActionBtn label="✕" variant="reject" onClick={() => handleReject(l)} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AP CLAIMS TAB — still mock (Stage 6a-ii) */}
        {activeTab === 'ap' && (
          <div className={styles.sectionCard}>
            <div style={{ fontSize: 12, color: '#b45309', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
              Demo data — AP claims are wired to real data in Stage 6a-ii.
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Student</th>
                    <th style={{ width: '14%' }}>Roll No</th>
                    <th style={{ width: '24%' }}>Activity</th>
                    <th style={{ width: '10%' }}>Points</th>
                    <th style={{ width: '16%' }}>Faculty</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '8%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apApprovals.map((a) => (
                    <tr key={a.id}>
                      <td><b>{a.student}</b></td>
                      <td className={styles.subCell}>{a.roll}</td>
                      <td>{a.activity}</td>
                      <td><span className={styles.ptsBadge}>+{a.pts}</span></td>
                      <td className={styles.subCell}>{a.faculty}</td>
                      <td><Badge status={a.status} /></td>
                      <td>
                        {a.status === 'pending' ? (
                          <div className={styles.actionBtns}>
                            <ActionBtn label="✓" variant="approve" onClick={() => onApAction(a.id, 'approved')} />
                            <ActionBtn label="✕" variant="reject" onClick={() => onApAction(a.id, 'rejected')} />
                          </div>
                        ) : (
                          <span className={styles.doneText}>Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <LabRecordDetailModal
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}

// ── Lab record detail (question + response pairs) ───────────────
function LabRecordDetailModal({ detail, loading, onClose }) {
  const b = detail?.booking || {}
  const responses = detail?.responses
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e5e4eb' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
            Lab Record — {b.student_name || ''}
          </h2>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e5e4eb', background: '#fff', color: '#9ca3af', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            {b.reg_num} · {b.skill_name}{b.level_name ? ` · L${b.level_name}` : ''} · {b.slot_date || ''} · status {b.approval_status || 'PENDING'}
          </div>
          {loading || responses == null ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>Loading responses…</div>
          ) : responses.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No responses recorded.</div>
          ) : (
            responses.map((r) => (
              <div key={r.survey_question_id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{r.question}</div>
                <div style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{r.student_response || '—'}</div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 22px', borderTop: '1px solid #e5e4eb' }}>
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: '1.5px solid #e5e4eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}
