import { useState, useEffect, useRef } from 'react'
import styles from './SwapFacultyModal.module.css'
import { adminService } from '../../services/features/adminService'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

export default function SwapFacultyModal({ isOpen, onClose, mapping }) {
  const { swapFaculty } = useData()
  const { showToast } = useApp()

  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const resultsListRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setResults([])
      setSelectedFaculty(null)
      setReason('')
      setPage(1)
      setHasMore(true)
      fetchFaculty('', 1, true)
    }
  }, [isOpen])

  // Trigger search on query change
  useEffect(() => {
    if (!isOpen) return
    const delayDebounceFn = setTimeout(() => {
      setPage(1)
      setHasMore(true)
      fetchFaculty(search, 1, true)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [search])

  // Fetch more when page changes
  useEffect(() => {
    if (page > 1 && isOpen && hasMore) {
      fetchFaculty(search, page, false)
    }
  }, [page])

  const fetchFaculty = async (q, pageNum, replace) => {
    setLoading(true)
    try {
      const limit = 20
      const res = await adminService.searchFaculty(q, pageNum, limit)
      const data = Array.isArray(res.data) ? res.data : []
      if (data.length < limit) {
        setHasMore(false)
      }
      setResults((prev) => replace ? data : [...prev, ...data])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 15 && !loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFaculty || !reason.trim()) {
      showToast('Please select a faculty and provide a reason', true)
      return
    }

    setIsSubmitting(true)
    const success = await swapFaculty(mapping.mapping_id, selectedFaculty.faculty_id, reason)
    setIsSubmitting(false)

    if (success) {
      showToast('Faculty swapped successfully')
      onClose()
    }
  }

  if (!isOpen || !mapping) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Swap Faculty</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.infoBox}>
            <p><strong>Venue:</strong> {mapping.venue_name}</p>
            <p><strong>Current Faculty:</strong> {mapping.faculty_name} ({mapping.reg_num})</p>
          </div>

          <div className={styles.searchSection}>
            <label>Search New Faculty</label>
            <input
              type="text"
              placeholder="Search by name or reg num..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.input}
            />
          </div>

          <div 
            className={styles.resultsList} 
            ref={resultsListRef} 
            onScroll={handleScroll}
          >
            {results.length > 0 ? (
              results.map((fac) => (
                <div
                  key={fac.faculty_id}
                  className={`${styles.facultyItem} ${selectedFaculty?.faculty_id === fac.faculty_id ? styles.selected : ''}`}
                  onClick={() => setSelectedFaculty(fac)}
                >
                  <div className={styles.facName}>{fac.name}</div>
                  <div className={styles.facReg}>{fac.reg_num} • {fac.department}</div>
                </div>
              ))
            ) : loading && page === 1 ? (
              <div className={styles.emptyText}>Loading...</div>
            ) : (
              <div className={styles.emptyText}>No faculty found.</div>
            )}
            {loading && page > 1 && (
              <div className={styles.loadingMore}>Loading more...</div>
            )}
          </div>
        </div>

        {/* Fixed Reason & Footer */}
        <div className={styles.footerWrap}>
          <div className={styles.reasonBox}>
            <label>Reason for Swap</label>
            <textarea
              className={styles.textarea}
              placeholder="Enter reason for transfer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <div className={styles.footer}>
            <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button 
              className={styles.btnSubmit} 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedFaculty || !reason.trim()}
            >
              {isSubmitting ? 'Swapping...' : 'Swap Faculty'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
