import { useEffect, useState } from 'react'
import styles from './StudentFormModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

// student = null → create mode; student object → edit mode.
// Mirrors SkillFormModal. Create provisions a users row + students row server-side
// (transactional). email/reg_num/name required; degree/course/year optional.
// On edit, the user_id linkage is immutable — only the email value can change.
export default function StudentFormModal({ isOpen, onClose, student = null }) {
  const { createStudent, updateStudent } = useData()
  const { showToast } = useApp()

  const isEdit = !!student
  const [email, setEmail] = useState('')
  const [regNum, setRegNum] = useState('')
  const [name, setName] = useState('')
  const [degree, setDegree] = useState('')
  const [course, setCourse] = useState('')
  const [year, setYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setEmail(student?.email || '')
      setRegNum(student?.reg_num || '')
      setName(student?.name || '')
      setDegree(student?.degree || '')
      setCourse(student?.course || '')
      setYear(student?.year_of_study != null ? String(student.year_of_study) : '')
      setIsSubmitting(false)
    }
  }, [isOpen, student])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!email.trim()) { showToast('Email is required', true); return }
    if (!regNum.trim()) { showToast('Registration number is required', true); return }
    if (!name.trim()) { showToast('Name is required', true); return }

    const payload = {
      email: email.trim(),
      reg_num: regNum.trim(),
      name: name.trim(),
      degree: degree.trim() || null,
      course: course.trim() || null,
      year_of_study: year === '' ? null : Number(year),
    }
    setIsSubmitting(true)
    const ok = isEdit
      ? await updateStudent(student.student_id, payload)
      : await createStudent(payload)
    setIsSubmitting(false)
    if (ok) {
      showToast(isEdit ? 'Student updated successfully' : 'Student created successfully')
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Student' : 'Add Student'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.field}>
            <label>Email *</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@bitsathy.ac.in"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Reg Number *</label>
              <input
                className={styles.input}
                value={regNum}
                onChange={(e) => setRegNum(e.target.value)}
                placeholder="e.g. 7376242..."
              />
            </div>
            <div className={styles.field}>
              <label>Year of Study</label>
              <select className={styles.select} value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">—</option>
                <option value="1">I Year</option>
                <option value="2">II Year</option>
                <option value="3">III Year</option>
                <option value="4">IV Year</option>
              </select>
            </div>
          </div>
          <div className={styles.field}>
            <label>Name *</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label>Degree</label>
              <input
                className={styles.input}
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech"
              />
            </div>
            <div className={styles.field}>
              <label>Course</label>
              <input
                className={styles.input}
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Biotechnology"
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={isSubmitting || !email.trim() || !regNum.trim() || !name.trim()}
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  )
}
