import { useState } from 'react'
import styles from './VenueAllocation.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import Badge from '../../../components/ui/Badge'
import SwapFacultyModal from '../../../components/modals/SwapFacultyModal'
import VenueMapModal from '../../../components/modals/VenueMapModal'
import { useData } from '../context/DataContext'

export default function VenueAllocation() {
  const { venues, loading } = useData()

  const [statusFilter, setStatusFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapMapping, setSwapMapping] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)

  // ── FILTERED DATA ────────────────────────────────────────────
  // Deduplicate by venue_id (keep latest entry per venue) as safety net
  const uniqueVenues = Array.from(
    venues.reduce((map, v) => {
      map.set(v.venue_id, v)
      return map
    }, new Map()).values()
  )

  const processedVenues = uniqueVenues.map(v => ({
    ...v,
    status: v.faculty_id ? 'occupied' : 'free'
  }))

  const filtered = processedVenues
    .filter((v) => statusFilter === 'all' || v.status === statusFilter)

  const occupied = processedVenues.filter((v) => v.status === 'occupied').length
  const free = processedVenues.filter((v) => v.status === 'free').length

  // ── MENU HANDLERS ────────────────────────────────────────────
  // Use mapping_id as the toggle key (unique per row)
  const toggleMenu = (mappingId, e) => {
    e.stopPropagation()
    setOpenMenuId((prev) => (prev === mappingId ? null : mappingId))
  }

  const closeMenu = () => setOpenMenuId(null)

  // ── TRANSFER HANDLERS ────────────────────────────────────────
  const openSwap = (venue) => {
    setSwapMapping(venue)
    setSwapOpen(true)
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
              <div className={`${styles.miniVal} ${styles.purple}`}>{processedVenues.length}</div>
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
          </div>

          {/* TABLE */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Venue Name</th>
                  <th style={{ width: '20%' }}>Location</th>
                  <th style={{ width: '25%' }}>Assigned Faculty</th>
                  <th style={{ width: '15%' }}>Status</th>
                  <th style={{ width: '15%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className={styles.empty}>Loading venues...</td>
                  </tr>
                ) : filtered.length > 0 ? filtered.map((v) => (
                  <tr key={v.venue_id}>
                    <td>
                      <b>{v.venue_name}</b>
                      <div className={styles.capacityText}>Capacity: {v.capacity}</div>
                    </td>
                    <td className={styles.blockCell}>
                      {v.location || '—'}
                    </td>
                    <td>
                      {v.faculty_id ? (
                        <div>
                          <div className={styles.facName}>{v.faculty_name}</div>
                          <div className={styles.facDept}>{v.reg_num}</div>
                        </div>
                      ) : (
                        <span className={styles.unassigned}>— Unassigned</span>
                      )}
                    </td>
                    <td><Badge status={v.status} /></td>
                    <td>
                      {v.faculty_id && v.mapping_id && (
                        <div
                          className={styles.menuWrap}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={styles.manageBtn}
                            onClick={(e) => toggleMenu(v.mapping_id, e)}
                          >
                            Manage ▾
                          </button>
                          {openMenuId === v.mapping_id && (
                            <div className={styles.dropdown}>
                              <div
                                className={`${styles.dropItem} ${styles.dropSwap}`}
                                onClick={() => openSwap(v)}
                              >
                                ⇄ Swap Faculty
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5}>
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
      {swapOpen && swapMapping && (
        <SwapFacultyModal
          isOpen={swapOpen}
          onClose={() => setSwapOpen(false)}
          mapping={swapMapping}
        />
      )}
      <VenueMapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        venues={processedVenues}
      />
    </div>
  )
}

