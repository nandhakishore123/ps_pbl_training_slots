import { useState } from 'react'
import styles from './Approvals.module.css'
import Header from '../Header/Header'
import Badge from '../../../components/ui/Badge'
import ActionBtn from '../../../components/ui/ActionBtn'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function Approvals() {
  const { labApprovals, apApprovals, handleLabApproval, handleApApproval } = useData()
  const { showToast } = useApp()
  const [activeTab, setActiveTab] = useState('lab')

  const onLabAction = (id, action) => {
    handleLabApproval(id, action)
    showToast(
      action === 'approved' ? 'Lab record approved!' : 'Lab record rejected',
      action === 'rejected'
    )
  }

  const onApAction = (id, action) => {
    handleApApproval(id, action)
    showToast(
      action === 'approved' ? 'AP claim approved!' : 'AP claim rejected',
      action === 'rejected'
    )
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

        {/* LAB RECORDS TAB */}
        {activeTab === 'lab' && (
          <div className={styles.sectionCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Student</th>
                    <th style={{ width: '14%' }}>Roll No</th>
                    <th style={{ width: '18%' }}>Faculty</th>
                    <th style={{ width: '12%' }}>Slot</th>
                    <th style={{ width: '10%' }}>CQ Score</th>
                    <th style={{ width: '10%' }}>PDF</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labApprovals.map((l) => (
                    <tr key={l.id}>
                      <td><b>{l.student}</b></td>
                      <td className={styles.subCell}>{l.roll}</td>
                      <td className={styles.subCell}>{l.faculty}</td>
                      <td className={styles.subCell}>{l.slot}</td>
                      <td>{l.cqScore}</td>
                      <td>
                        {l.pdfFile ? (
                          <ActionBtn
                            label="PDF"
                            variant="view"
                            onClick={() => showToast('Opening PDF…', false)}
                          />
                        ) : '—'}
                      </td>
                      <td><Badge status={l.status} /></td>
                      <td>
                        {l.status === 'pending' ? (
                          <div className={styles.actionBtns}>
                            <ActionBtn
                              label="✓"
                              variant="approve"
                              onClick={() => onLabAction(l.id, 'approved')}
                            />
                            <ActionBtn
                              label="✕"
                              variant="reject"
                              onClick={() => onLabAction(l.id, 'rejected')}
                            />
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

        {/* AP CLAIMS TAB */}
        {activeTab === 'ap' && (
          <div className={styles.sectionCard}>
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
                      <td>
                        <span className={styles.ptsBadge}>+{a.pts}</span>
                      </td>
                      <td className={styles.subCell}>{a.faculty}</td>
                      <td><Badge status={a.status} /></td>
                      <td>
                        {a.status === 'pending' ? (
                          <div className={styles.actionBtns}>
                            <ActionBtn
                              label="✓"
                              variant="approve"
                              onClick={() => onApAction(a.id, 'approved')}
                            />
                            <ActionBtn
                              label="✕"
                              variant="reject"
                              onClick={() => onApAction(a.id, 'rejected')}
                            />
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
    </div>
  )
}
