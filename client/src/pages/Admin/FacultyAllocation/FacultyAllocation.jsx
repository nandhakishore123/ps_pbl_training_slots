import { useState, useMemo } from 'react'
import styles from './FacultyAllocation.module.css'
import Header from '../Header/Header'
import SectionCard from '../../../components/ui/SectionCard'
import FacultyActionModal from '../../../components/modals/FacultyActionModal'
import { useData } from '../context/DataContext'

export default function FacultyAllocation() {
  const { faculty, loading } = useData()

  const [actionOpen, setActionOpen] = useState(false)
  const [actionContext, setActionContext] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)

  // ── GROUP FACULTY DATA ────────────────────────────────────────────
  const groupedFaculty = useMemo(() => {
    if (!faculty) return []
    const map = new Map()

    faculty.forEach((row) => {
      if (!map.has(row.faculty_id)) {
        map.set(row.faculty_id, {
          id: row.faculty_id,
          name: row.name,
          reg_num: row.reg_num,
          department: row.department,
          initials: row.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          mappings: []
        })
      }
      
      if (row.mapping_id) {
        map.get(row.faculty_id).mappings.push({
          mapping_id: row.mapping_id,
          venue_name: row.venue_name,
          venue_id: row.venue_id,
          skill_type: row.skill_type,
          slot_id: row.slot_id,
          start_time: row.start_time,
          end_time: row.end_time
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [faculty])

  const assigned = groupedFaculty.filter((f) => f.mappings.length > 0).length
  const unassigned = groupedFaculty.filter((f) => f.mappings.length === 0).length

  // ── MENU HANDLERS ────────────────────────────────────────────
  const toggleMenu = (facultyId, e) => {
    e.stopPropagation()
    setOpenMenuId((prev) => (prev === facultyId ? null : facultyId))
  }

  const closeMenu = () => setOpenMenuId(null)

  // ── ACTION HANDLERS ────────────────────────────────────────
  const openAction = (type, facultyItem, mapping = null) => {
    setActionContext({ type, faculty: facultyItem, mapping })
    setActionOpen(true)
    closeMenu()
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const hh = parseInt(h, 10)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    const h12 = hh % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  return (
    <div className={styles.page} onClick={closeMenu}>
      <Header showBack />

      <div className={styles.content}>
        <div className={styles.pageTitle}>Faculty Allocation</div>
        <div className={styles.pageSub}>
          Assign faculty to venues and manage their slots
        </div>

        {/* MINI STATS */}
        <div className={styles.miniStats}>
          <div className={`${styles.miniCard} ${styles.purpleAccent}`}>
            <div className={`${styles.miniVal} ${styles.purple}`}>{groupedFaculty.length}</div>
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
                  <th style={{ width: '25%' }}>Faculty Name</th>
                  <th style={{ width: '15%' }}>Dept</th>
                  <th style={{ width: '40%' }}>Assigned Venues & Slots</th>
                  <th style={{ width: '20%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className={styles.empty}>Loading faculty...</td></tr>
                ) : groupedFaculty.length > 0 ? groupedFaculty.map((f) => (
                  <tr key={f.id}>
                    {/* NAME */}
                    <td>
                      <div className={styles.facRow}>
                        <div className={styles.avatar}>{f.initials}</div>
                        <div>
                          <div className={styles.facName}>{f.name}</div>
                          <div className={styles.facReg}>{f.reg_num}</div>
                        </div>
                      </div>
                    </td>

                    {/* DEPT */}
                    <td className={styles.deptCell}>{f.department || '—'}</td>

                    {/* VENUES & SLOTS */}
                    <td>
                      {f.mappings.length > 0 ? (
                        <div className={styles.slotTags}>
                          {f.mappings.map((m) => (
                            <span key={m.mapping_id} className={styles.slotTag}>
                              <b>{m.venue_name}</b> ({m.skill_type}) • {formatTime(m.start_time)} - {formatTime(m.end_time)}
                              <span
                                className={styles.transferIcon}
                                title="Transfer this individual venue"
                                onClick={(e) => { e.stopPropagation(); openAction('transfer_individual', f, m); }}
                              >
                                ⇄
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={styles.noSlots}>— No assignments —</span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td>
                      <div
                        className={styles.menuWrap}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className={styles.manageBtn}
                          onClick={(e) => toggleMenu(f.id, e)}
                        >
                          Actions ▾
                        </button>
                        {openMenuId === f.id && (
                          <div className={styles.dropdown}>
                            <div
                              className={`${styles.dropItem} ${styles.dropSwap}`}
                              onClick={() => openAction('add_venue', f)}
                            >
                              + Add Venue
                            </div>
                            {f.mappings.length > 0 && (
                              <>
                                <div className={styles.dropDivider} />
                                <div
                                  className={`${styles.dropItem} ${styles.dropMove}`}
                                  onClick={() => openAction('transfer_all', f)}
                                >
                                  ⇄ Transfer All Venues
                                </div>
                                <div className={styles.dropDivider} />
                                <div
                                  className={`${styles.dropItem} ${styles.dropMove}`}
                                  onClick={() => openAction('transfer_individual', f)}
                                >
                                  ⇄ Transfer Individual Venue
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>
                      <div className={styles.empty}>No faculty found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* ACTION MODAL */}
      {actionOpen && actionContext && (
        <FacultyActionModal
          isOpen={actionOpen}
          onClose={() => setActionOpen(false)}
          context={actionContext}
        />
      )}
    </div>
  )
}

