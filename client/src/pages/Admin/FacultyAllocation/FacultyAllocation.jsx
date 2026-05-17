import { useState } from 'react'
import styles from './FacultyAllocation.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import Badge from '../../../components/ui/Badge'
import TransferModal from '../../../components/modals/TransferModal'
import { useData } from '../context/DataContext'

export default function FacultyAllocation() {
  const { faculty, slotMap } = useData()

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferContext, setTransferContext] = useState(null)

  const assigned = faculty.filter((f) => f.status === 'active' && f.venues.length > 0).length
  const unassigned = faculty.filter((f) => f.venues.length === 0).length

  const openFacultyTransfer = (facultyId) => {
    setTransferContext({ type: 'faculty', id: facultyId })
    setTransferOpen(true)
  }

  const openSingleSlotTransfer = (facultyId, slotId) => {
    setTransferContext({ type: 'singleslot', facultyId, slotId })
    setTransferOpen(true)
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Faculty Allocation</div>
        <div className={styles.pageSub}>
          Assign faculty to venues and transfer slot responsibilities
        </div>

        {/* MINI STATS */}
        <div className={styles.miniStats}>
          <div className={`${styles.miniCard} ${styles.purpleAccent}`}>
            <div className={`${styles.miniVal} ${styles.purple}`}>18</div>
            <div className={styles.miniLabel}>Total Faculty</div>
          </div>
          <div className={`${styles.miniCard} ${styles.redAccent}`}>
            <div className={`${styles.miniVal} ${styles.red}`}>{assigned}</div>
            <div className={styles.miniLabel}>Assigned</div>
          </div>
          <div className={`${styles.miniCard} ${styles.greenAccent}`}>
            <div className={`${styles.miniVal} ${styles.green}`}>{unassigned}</div>
            <div className={styles.miniLabel}>Unassigned</div>
          </div>
        </div>

        {/* TABLE */}
        <SectionCard title="Faculty & Their Assignments">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Faculty Name</th>
                  <th style={{ width: '12%' }}>Dept</th>
                  <th style={{ width: '22%' }}>Assigned Venues</th>
                  <th style={{ width: '26%' }}>Slots Today</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '16%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f) => {
                  const mySlots = slotMap[f.id] || []
                  return (
                    <tr key={f.id}>
                      {/* NAME */}
                      <td>
                        <div className={styles.facRow}>
                          <div className={styles.avatar}>{f.initials}</div>
                          <div className={styles.facName}>{f.name}</div>
                        </div>
                      </td>

                      {/* DEPT */}
                      <td className={styles.deptCell}>{f.dept}</td>

                      {/* VENUES */}
                      <td className={styles.venueCell}>
                        {f.venues.length ? f.venues.join(', ') : '—'}
                      </td>

                      {/* SLOTS */}
                      <td>
                        {mySlots.length > 0 ? (
                          <div className={styles.slotTags}>
                            {mySlots.map((s) => (
                              <span key={s.id} className={styles.slotTag}>
                                {s.time}
                                <span
                                  className={styles.transferIcon}
                                  title="Transfer this slot"
                                  onClick={() => openSingleSlotTransfer(f.id, s.id)}
                                >
                                  ⇄
                                </span>
                              </span>
                            ))}
                            <div className={styles.slotHint}>
                              {mySlots.length} slot{mySlots.length !== 1 ? 's' : ''} · click ⇄ to transfer one
                            </div>
                          </div>
                        ) : (
                          <span className={styles.noSlots}>—</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td>
                        <Badge status={f.status} />
                      </td>

                      {/* ACTION */}
                      <td>
                        <button
                          className={styles.transferBtn}
                          onClick={() => openFacultyTransfer(f.id)}
                        >
                          Transfer All
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* TRANSFER MODAL */}
      <TransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        context={transferContext}
      />
    </div>
  )
}
