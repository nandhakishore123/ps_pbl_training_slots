import { useState } from 'react'
import styles from './PSSlots.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import ActionBtn from '../../../components/ui/ActionBtn'
import AddSlotModal from '../../../components/modals/AddSlotModal'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function PSSlots() {
  const { psSlots, faculty, deletePsSlot } = useData()
  const { showToast } = useApp()
  const [addOpen, setAddOpen] = useState(false)

  const handleDelete = (index) => {
    deletePsSlot(index)
    showToast('PS Slot deleted', false)
  }

  return (
    <div className={styles.page}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>PS Slot Management</div>
        <div className={styles.pageSub}>
          Create, edit and manage Problem Solving training slots
        </div>

        {/* ADD BUTTON */}
        <div className={styles.addRow}>
          <button
            className={styles.addBtn}
            onClick={() => setAddOpen(true)}
          >
            + Add New Slot
          </button>
        </div>

        {/* TABLE */}
        <SectionCard noPadding>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Slot ID</th>
                  <th style={{ width: '16%' }}>Day</th>
                  <th style={{ width: '20%' }}>Time</th>
                  <th style={{ width: '20%' }}>Venue</th>
                  <th style={{ width: '18%' }}>Faculty Incharge</th>
                  <th style={{ width: '16%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {psSlots.length > 0 ? (
                  psSlots.map((s, i) => {
                    const fac = faculty.find((f) => f.id === s.faculty)
                    return (
                      <tr key={s.id}>
                        <td><b>{s.id}</b></td>
                        <td>{s.day}</td>
                        <td className={styles.timeCell}>{s.time}</td>
                        <td className={styles.venueCell}>{s.venue}</td>
                        <td className={styles.facCell}>
                          {fac ? fac.name : '—'}
                        </td>
                        <td>
                          <ActionBtn
                            label="Reassign"
                            variant="transfer"
                            onClick={() => showToast('Reassign coming soon', false)}
                          />
                          <ActionBtn
                            label="Delete"
                            variant="reject"
                            onClick={() => handleDelete(i)}
                          />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.empty}>No PS slots found</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* ADD SLOT MODAL */}
      <AddSlotModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        type="PS"
      />
    </div>
  )
}
