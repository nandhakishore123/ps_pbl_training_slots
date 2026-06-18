import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { facultyService } from '../../services/features/facultyService'

const P = '#6c47ff'
const font = "'Plus Jakarta Sans', 'Outfit', system-ui, sans-serif"

function Toast({ message, type, onClose }) {
  if (!message) return null
  const bg = type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : '#059669'
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 11000, background: bg, color: '#fff', padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}>×</button>
    </div>
  )
}

// Faculty Lab Record approvals — ownership-gated server-side (faculty only sees
// bookings in their own venues). Approve/reject writes only end_survey approval
// columns; nothing touches seats or points.
export default function FacultyApprovals() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const notify = (message, type = 'success') => setToast({ message, type })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await facultyService.getLabRecordApprovals(status)
      setRecords(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load lab records', 'error')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const openDetail = async (b) => {
    setDetailLoading(true)
    setDetail({ booking: b, responses: null })
    try {
      const res = await facultyService.getLabRecordApprovalDetail(b.booking_id)
      setDetail(res.data || null)
    } catch (err) {
      notify(err?.response?.data?.message || 'Failed to load record', 'error')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const decide = async (b, kind) => {
    if (!window.confirm(`${kind === 'approve' ? 'Approve' : 'Reject'} ${b.student_name}'s lab record?`)) return
    setBusyId(b.booking_id)
    try {
      if (kind === 'approve') await facultyService.approveLabRecord(b.booking_id)
      else await facultyService.rejectLabRecord(b.booking_id)
      notify(kind === 'approve' ? 'Lab record approved' : 'Lab record rejected', kind === 'approve' ? 'success' : 'warning')
      load()
    } catch (err) {
      notify(err?.response?.data?.message || 'Action failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: 13, color: '#1a1a2e', borderTop: '1px solid #f0f2f8' }
  const btn = (bg, color, border) => ({ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font })

  const statusPill = (s) => {
    const v = (s || 'PENDING').toUpperCase()
    const map = { PENDING: ['rgba(245,158,11,0.12)', '#b45309'], APPROVED: ['rgba(16,185,129,0.12)', '#059669'], REJECTED: ['rgba(239,68,68,0.12)', '#ef4444'] }
    const [bg, color] = map[v] || ['#f3f4f6', '#6b7280']
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: bg, color }}>{v}</span>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f8', fontFamily: font }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        <button onClick={() => navigate(-1)} style={{ ...btn('#fff', '#6b7280', '#e5e4eb'), marginBottom: 16 }}>← Back</button>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>Lab Record Approvals</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Review and approve/reject lab records for students in your venues.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e5e4eb', borderRadius: 10, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: font }}>
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e4eb', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#faf9ff' }}>
                  <th style={th}>Student</th>
                  <th style={th}>Reg No</th>
                  <th style={th}>Course / Lab</th>
                  <th style={th}>Slot Date</th>
                  <th style={th}>Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: 24 }}>Loading…</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#9ca3af', padding: 24 }}>
                    {status === 'pending' ? 'No pending lab records.' : 'No lab records found.'}
                  </td></tr>
                ) : records.map((l, i) => {
                  const pending = (l.approval_status || 'PENDING') === 'PENDING'
                  return (
                    <tr key={l.booking_id} style={{ background: i % 2 ? '#fbfaff' : '#fff' }}>
                      <td style={{ ...td, fontWeight: 700 }}>{l.student_name}</td>
                      <td style={{ ...td, fontFamily: 'monospace', color: '#6b7280' }}>{l.reg_num}</td>
                      <td style={td}>{l.skill_name}{l.level_name ? ` · L${l.level_name}` : ''}</td>
                      <td style={td}>{l.slot_date || '—'}</td>
                      <td style={td}>{statusPill(l.approval_status)}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openDetail(l)} style={btn('rgba(108,71,255,0.08)', P, P)}>View</button>
                          {pending && (
                            <>
                              <button onClick={() => decide(l, 'approve')} disabled={busyId === l.booking_id} style={btn('rgba(16,185,129,0.08)', '#059669', 'rgba(5,150,105,0.4)')}>Approve</button>
                              <button onClick={() => decide(l, 'reject')} disabled={busyId === l.booking_id} style={btn('rgba(239,68,68,0.08)', '#ef4444', 'rgba(239,68,68,0.4)')}>Reject</button>
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
      </div>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #e5e4eb' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Lab Record — {detail.booking?.student_name || ''}</h2>
              <button onClick={() => setDetail(null)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e5e4eb', background: '#fff', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                {detail.booking?.reg_num} · {detail.booking?.skill_name}{detail.booking?.level_name ? ` · L${detail.booking.level_name}` : ''} · {detail.booking?.slot_date || ''} · status {detail.booking?.approval_status || 'PENDING'}
              </div>
              {detailLoading || detail.responses == null ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>Loading responses…</div>
              ) : detail.responses.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No responses recorded.</div>
              ) : detail.responses.map((r) => (
                <div key={r.survey_question_id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{r.question}</div>
                  <div style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap' }}>{r.student_response || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 22px', borderTop: '1px solid #e5e4eb' }}>
              <button onClick={() => setDetail(null)} style={btn('#fff', '#6b7280', '#e5e4eb')}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </div>
  )
}
