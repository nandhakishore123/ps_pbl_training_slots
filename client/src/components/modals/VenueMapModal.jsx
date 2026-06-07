import { useState, useRef } from 'react'
import styles from './VenueMapModal.module.css'

export default function VenueMapModal({ isOpen, onClose, venues = [] }) {
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 })
  const overlayRef = useRef(null)

  if (!isOpen) return null

  // Dynamically group real database venues by block/location
  const grouped = {}
  venues.forEach((v) => {
    const blockName = v.location || 'General Block'
    if (!grouped[blockName]) {
      grouped[blockName] = []
    }
    const exists = grouped[blockName].some((x) => x.venue_id === v.venue_id)
    if (!exists) {
      grouped[blockName].push(v)
    }
  })

  const venueBlocks = Object.keys(grouped).map((blockName) => ({
    block: blockName,
    venues: grouped[blockName].map((v) => ({
      venue_id: v.venue_id,
      name: v.venue_name,
      type: v.skill_type || 'PS',
      status: v.faculty_id ? 'occupied' : 'free',
      faculty: v.faculty_name || null,
    })),
  }))

  const handleMouseOver = (e, title) => {
    setTooltip({
      visible: true,
      text: title,
      x: Math.min(e.clientX + 12, window.innerWidth - 260),
      y: e.clientY - 40,
    })
  }

  const handleMouseOut = () => {
    setTooltip({ visible: false, text: '', x: 0, y: 0 })
  }

  const getCellStyle = (v) => {
    if (v.status === 'occupied' && v.type === 'PBL') {
      return { bg: 'rgba(108,71,255,0.18)', border: '#6c47ff' }
    } else if (v.status === 'occupied' && v.type === 'PS') {
      return { bg: 'rgba(16,185,129,0.18)', border: '#10b981' }
    } else if (v.status === 'free' && v.type === 'PBL') {
      return { bg: 'rgba(108,71,255,0.06)', border: 'rgba(108,71,255,0.3)' }
    } else if (v.status === 'free' && v.type === 'PS') {
      return { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.3)' }
    } else {
      return { bg: 'var(--bg)', border: 'var(--border)' }
    }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className={styles.boxHeader}>
          <div className={styles.headerTop}>
            <div>
              <div className={styles.title}>Venue Map — BIT Campus</div>
              <div className={styles.sub}>
                All venues with occupancy status and PBL/PS mapping
              </div>
              {/* LEGEND */}
              <div className={styles.legend}>
                <span className={styles.legendItem}>
                  <span className={styles.legendPBL} />PBL
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendPS} />PS
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendOccupied} />Occupied
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendFree} />Free
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendNone} />Not Mapped
                </span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* SCROLL CONTENT */}
        <div className={styles.boxScroll}>
          {venueBlocks.map((block, bi) => {
            const total = block.venues.length
            const occupied = block.venues.filter((v) => v.status === 'occupied').length
            const free = block.venues.filter((v) => v.status === 'free').length
            const pbl = block.venues.filter((v) => v.type === 'PBL').length
            const ps = block.venues.filter((v) => v.type === 'PS').length

            return (
              <div key={bi}>
                {bi > 0 && <div className={styles.divider} />}

                <div className={styles.blockHeader}>
                  <div>
                    <div className={styles.blockName}>{block.block}</div>
                    <div className={styles.blockSub}>{total} venues total</div>
                  </div>
                  <div className={styles.blockStats}>
                    <span className={styles.statOccupied}>{occupied} Occupied</span>
                    <span className={styles.statFree}>{free} Free</span>
                    <span className={styles.statPBL}>{pbl} PBL</span>
                    <span className={styles.statPS}>{ps} PS</span>
                  </div>
                </div>

                <div className={styles.cellGrid}>
                  {block.venues.map((v, vi) => {
                    const cellStyle = getCellStyle(v)
                    const dotColor = v.status === 'occupied' ? '#ef4444' : '#10b981'
                    const title =
                      v.name +
                      (v.type ? ` [${v.type}]` : '') +
                      (v.faculty ? ` — ${v.faculty}` : '')
                    const shortName =
                      v.name.replace(/[A-Za-z\s]+/, '').trim() ||
                      v.name.substring(0, 4)

                    return (
                      <div
                        key={vi}
                        className={styles.cell}
                        style={{
                          background: cellStyle.bg,
                          border: `1.5px solid ${cellStyle.border}`,
                        }}
                        onMouseOver={(e) => handleMouseOver(e, title)}
                        onMouseOut={handleMouseOut}
                      >
                        <span
                          className={styles.cellLabel}
                          style={{
                            color: v.status === 'occupied' ? 'var(--text)' : 'var(--text3)',
                          }}
                        >
                          {shortName}
                        </span>
                        <span
                          className={styles.cellDot}
                          style={{ background: dotColor }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* FOOTER */}
        <div className={styles.boxFooter}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </div>

      </div>

      {/* TOOLTIP */}
      {tooltip.visible && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
