import { useState } from 'react'
import styles from './VenueAllocation.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import Badge from '../../../components/ui/Badge'
import TransferModal from '../../../components/modals/TransferModal'
import VenueMapModal from '../../../components/modals/VenueMapModal'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function VenueAllocation() {
  const { venues, faculty, revokeVenueTransfer } = useData()
  const { showToast } = useApp()

  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferContext, setTransferContext] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)

  // ── FILTERED DATA ────────────────────────────────────────────
  const filtered = venues
    .filter((v) => statusFilter === 'all' || v.status === statusFilter)
    .filter((v) => typeFilter === 'all' || v.type === typeFilter)

  const occupied = venues.filter((v) => v.status === 'occupied').length
  const free = venues.filter((v) => v.status === 'free').length

  // ── MENU HANDLERS ────────────────────────────────────────────
  const toggleMenu = (venueId, e) => {
    e.stopPropagation()
    setOpenMenuId((prev) => (prev === venueId ? null : venueId))
  }

  const closeMenu = () => setOpenMenuId(null)

  // ── TRANSFER HANDLERS ────────────────────────────────────────
  const openSwap = (venueId) => {
    setTransferContext({ type: 'swap', id: venueId })
    setTransferOpen(true)
    closeMenu()
  }

  const openMove = (venueId) => {
    setTransferContext({ type: 'move', id: venueId })
    setTransferOpen(true)
    closeMenu()
  }

  const handleRevoke = (venueId) => {
    revokeVenueTransfer(venueId)
    showToast('Transfer revoked', false)
    closeMenu()
  }

  return (
    <div className={styles.page} onClick={closeMenu}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Venue Allocation</div>
        <div className={styles.pageSub}>
          Manage all labs, rooms and their current assignments
        </div>

        {/* TOP ROW — mini stats + map button */}
        <div className={styles.topRow}>
          <div className={styles.miniStats}>
            <div className={`${styles.miniCard} ${styles.purpleAccent}`}>
              <div className={`${styles.miniVal} ${styles.purple}`}>12</div>
              <div className={styles.miniLabel}>Total Venues</div>
            </div>
            <div className={`${styles.miniCard} ${styles.redAccent}`}>
              <div className={`${styles.miniVal} ${styles.red}`}>{occupied}</div>
              <div className={styles.miniLabel}>Occupied</div>
            </div>
            <div className={`${styles.miniCard} ${styles.greenAccent}`}>
              <div className={`${styles.miniVal} ${styles.green}`}>{free}</div>
              <div className={styles.miniLabel}>Free</div>
            </div>
          </div>
          <button
            className={styles.mapBtn}
            onClick={(e) => { e.stopPropagation(); setMapOpen(true) }}
          >
            Venue Map
          </button>
        </div>

        {/* TABLE CARD */}
        <SectionCard title="All Venues">
          {/* FILTERS */}
          <div className={styles.filterRow}>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Venues</option>
              <option value="occupied">Occupied</option>
              <option value="free">Free</option>
            </select>
            <select
              className={styles.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="PBL">PBL Labs</option>
              <option value="PS">PS Labs</option>
            </select>
          </div>

          {/* TABLE */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Venue Name</th>
                  <th style={{ width: '15%' }}>Block / Room</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '20%' }}>Assigned Faculty</th>
                  <th style={{ width: '18%' }}>Current Slot</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '15%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((v) => {
                  const fac = v.faculty ? faculty.find((f) => f.id === v.faculty) : null
                  const tf = v.transferredTo ? faculty.find((f) => f.id === v.transferredTo) : null
                  return (
                    <tr key={v.id}>
                      <td><b>{v.name}</b></td>
                      <td className={styles.blockCell}>
                        {v.block}
                        <br />
                        <span className={styles.roomText}>{v.room}</span>
                      </td>
                      <td>
                        <Badge status={v.type === 'PBL' ? 'occupied' : 'approved'} />
                      </td>
                      <td>
                        {fac ? (
                          <div>
                            <div className={styles.facName}>{fac.name}</div>
                            <div className={styles.facDept}>{fac.dept}</div>
                          </div>
                        ) : (
                          <span className={styles.unassigned}>— Unassigned</span>
                        )}
                        {tf && (
                          <div className={styles.transferredTag}>
                            → Transferred to {tf.name}
                          </div>
                        )}
                      </td>
                      <td className={styles.slotCell}>{v.slot || '—'}</td>
                      <td><Badge status={v.status} /></td>
                      <td>
                        <div
                          className={styles.menuWrap}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={styles.manageBtn}
                            onClick={(e) => toggleMenu(v.id, e)}
                          >
                            Manage ▾
                          </button>
                          {openMenuId === v.id && (
                            <div className={styles.dropdown}>
                              <div
                                className={`${styles.dropItem} ${styles.dropSwap}`}
                                onClick={() => openSwap(v.id)}
                              >
                                ⇄ Swap Faculty
                              </div>
                              <div className={styles.dropDivider} />
                              <div
                                className={`${styles.dropItem} ${styles.dropMove}`}
                                onClick={() => openMove(v.id)}
                              >
                                ↗ Move Venue
                              </div>
                              {v.transferredTo && (
                                <>
                                  <div className={styles.dropDivider} />
                                  <div
                                    className={`${styles.dropItem} ${styles.dropRevoke}`}
                                    onClick={() => handleRevoke(v.id)}
                                  >
                                    ✕ Revoke Transfer
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.empty}>No venues match filter</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* MODALS */}
      <TransferModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        context={transferContext}
      />
      <VenueMapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
      />
    </div>
  )
}
