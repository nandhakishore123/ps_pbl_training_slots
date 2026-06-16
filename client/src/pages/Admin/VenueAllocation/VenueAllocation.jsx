import { useState } from 'react'
import styles from './VenueAllocation.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import Badge from '../../../components/ui/Badge'
import SwapFacultyModal from '../../../components/modals/SwapFacultyModal'
import VenueMapModal from '../../../components/modals/VenueMapModal'
import VenueFormModal from '../../../components/modals/VenueFormModal'
import VenueSkillsModal from '../../../components/modals/VenueSkillsModal'
import { useData } from '../context/DataContext'
import { useApp } from '../context/AppContext'

export default function VenueAllocation() {
  const { venues, allVenues, loading, setVenueActive } = useData()
  const { showToast } = useApp()

  const [statusFilter, setStatusFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapMapping, setSwapMapping] = useState(null)
  const [mapOpen, setMapOpen] = useState(false)

  // Venue create/edit + skills management
  const [venueFormOpen, setVenueFormOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState(null)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [skillsVenue, setSkillsVenue] = useState(null)

  const openCreateVenue = () => { setEditingVenue(null); setVenueFormOpen(true) }
  const openEditVenue = (v) => { setEditingVenue(v); setVenueFormOpen(true); closeMenu() }
  const openSkills = (v) => { setSkillsVenue(v); setSkillsOpen(true); closeMenu() }

  const handleDeactivate = async (v) => {
    closeMenu()
    let res = await setVenueActive(v.venue_id, false, false)
    if (res && res.requiresConfirmation) {
      if (window.confirm(`${res.message}\n\nProceed?`)) {
        res = await setVenueActive(v.venue_id, false, true)
        if (res === true) showToast('Venue deactivated')
      }
      return
    }
    if (res === true) showToast('Venue deactivated')
  }

  const handleReactivate = async (v) => {
    closeMenu()
    const res = await setVenueActive(v.venue_id, true)
    if (res === true) showToast('Venue reactivated')
  }

  // ── FILTERED DATA ────────────────────────────────────────────
  // Source: active-only `venues` by default; full `allVenues` (incl. inactive)
  // when the admin toggles "Show inactive". The Venue Map stays active-only.
  const sourceVenues = showInactive ? allVenues : venues

  // Deduplicate by venue_id (keep latest entry per venue) as safety net
  const uniqueVenues = Array.from(
    sourceVenues.reduce((map, v) => {
      map.set(v.venue_id, v)
      return map
    }, new Map()).values()
  )

  const processedVenues = uniqueVenues.map(v => ({
    ...v,
    status: Number(v.is_active) === 0
      ? 'inactive'
      : (v.faculty_id ? 'occupied' : 'free')
  }))

  const filtered = processedVenues
    .filter((v) => statusFilter === 'all' || v.status === statusFilter)

  const occupied = processedVenues.filter((v) => v.status === 'occupied').length
  const free = processedVenues.filter((v) => v.status === 'free').length

  // Venue Map always shows active venues only (independent of the inactive toggle).
  const mapVenues = Array.from(
    venues.reduce((map, v) => {
      map.set(v.venue_id, v)
      return map
    }, new Map()).values()
  ).map(v => ({ ...v, status: v.faculty_id ? 'occupied' : 'free' }))

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
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={styles.mapBtn}
              style={{ background: '#6c47ff', color: '#fff', borderColor: '#6c47ff' }}
              onClick={(e) => { e.stopPropagation(); openCreateVenue() }}
            >
              + Create Venue
            </button>
            <button
              className={styles.mapBtn}
              onClick={(e) => { e.stopPropagation(); setMapOpen(true) }}
            >
              Venue Map
            </button>
          </div>
        </div>

        {/* TABLE CARD */}
        <SectionCard title="All Venues">
          {/* FILTERS */}
          <div className={styles.filterRow} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <select
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Venues</option>
              <option value="occupied">Occupied</option>
              <option value="free">Free</option>
              {showInactive && <option value="inactive">Inactive</option>}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text2, #6b7280)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => { setShowInactive(e.target.checked); if (!e.target.checked && statusFilter === 'inactive') setStatusFilter('all') }}
              />
              Show inactive
            </label>
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
                ) : filtered.length > 0 ? filtered.map((v) => {
                  const inactive = v.status === 'inactive'
                  return (
                  <tr key={v.venue_id} style={inactive ? { opacity: 0.6 } : undefined}>
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
                    <td>
                      {inactive ? (
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 700, color: '#6b7280', background: 'rgba(107,114,128,0.15)',
                        }}>
                          Inactive
                        </span>
                      ) : (
                        <Badge status={v.status} />
                      )}
                    </td>
                    <td>
                      <div
                        className={styles.menuWrap}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className={styles.manageBtn}
                          onClick={(e) => toggleMenu(v.venue_id, e)}
                        >
                          Manage ▾
                        </button>
                        {openMenuId === v.venue_id && (
                          <div className={styles.dropdown}>
                            <div className={styles.dropItem} onClick={() => openEditVenue(v)}>
                              ✎ Edit Venue
                            </div>
                            <div className={styles.dropItem} onClick={() => openSkills(v)}>
                              ⚙ Manage Skills
                            </div>
                            {inactive ? (
                              <>
                                <div className={styles.dropDivider} />
                                <div
                                  className={styles.dropItem}
                                  style={{ color: '#059669' }}
                                  onClick={() => handleReactivate(v)}
                                >
                                  ↻ Reactivate
                                </div>
                              </>
                            ) : (
                              <>
                                {v.faculty_id && v.mapping_id && (
                                  <div
                                    className={`${styles.dropItem} ${styles.dropSwap}`}
                                    onClick={() => openSwap(v)}
                                  >
                                    ⇄ Swap Faculty
                                  </div>
                                )}
                                <div className={styles.dropDivider} />
                                <div
                                  className={styles.dropItem}
                                  style={{ color: '#ef4444' }}
                                  onClick={() => handleDeactivate(v)}
                                >
                                  ⨯ Deactivate
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
        venues={mapVenues}
      />

      <VenueFormModal
        isOpen={venueFormOpen}
        onClose={() => setVenueFormOpen(false)}
        venue={editingVenue}
      />

      {skillsOpen && skillsVenue && (
        <VenueSkillsModal
          isOpen={skillsOpen}
          onClose={() => setSkillsOpen(false)}
          venue={skillsVenue}
        />
      )}
    </div>
  )
}

