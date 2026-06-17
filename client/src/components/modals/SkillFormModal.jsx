import { useEffect, useState } from 'react'
import styles from './SkillFormModal.module.css'
import { useData } from '../../pages/Admin/context/DataContext'
import { useApp } from '../../pages/Admin/context/AppContext'

// skill = null → create mode; skill object → edit mode.
// Mirrors VenueFormModal. PS vs PBL is the skill_type column; category is the
// required category_id FK.
export default function SkillFormModal({ isOpen, onClose, skill = null }) {
  const { createTrainingSkill, updateTrainingSkill, skillCategories, getSkillCategories } = useData()
  const { showToast } = useApp()

  const isEdit = !!skill
  const [skillName, setSkillName] = useState('')
  const [skillType, setSkillType] = useState('PS')
  const [categoryId, setCategoryId] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSkillName(skill?.skill_name || '')
      setSkillType(skill?.skill_type || 'PS')
      setCategoryId(skill?.category_id != null ? String(skill.category_id) : '')
      setImageUrl(skill?.image_url || '')
      setIsSubmitting(false)
      // Ensure the category dropdown is populated (cached after first load).
      getSkillCategories()
    }
  }, [isOpen, skill])

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!skillName.trim()) {
      showToast('Skill name is required', true)
      return
    }
    if (!categoryId) {
      showToast('Category is required', true)
      return
    }
    const payload = {
      skill_name: skillName.trim(),
      skill_type: skillType,
      category_id: Number(categoryId),
      image_url: imageUrl.trim() || null,
    }
    setIsSubmitting(true)
    const ok = isEdit
      ? await updateTrainingSkill(skill.training_skill_id, payload)
      : await createTrainingSkill(payload)
    setIsSubmitting(false)
    if (ok) {
      showToast(isEdit ? 'Course/Lab updated successfully' : 'Course/Lab created successfully')
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Course/Lab' : 'Add Course/Lab'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.field}>
            <label>Skill Name *</label>
            <input
              className={styles.input}
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g. Robotics Lab"
            />
          </div>
          <div className={styles.field}>
            <label>Type *</label>
            <select
              className={styles.select}
              value={skillType}
              onChange={(e) => setSkillType(e.target.value)}
            >
              <option value="PS">PS — Problem Solving</option>
              <option value="PBL">PBL — Project Based Lab</option>
            </select>
          </div>
          <div className={styles.field}>
            <label>Category *</label>
            <select
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— Select category —</option>
              {skillCategories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Image URL</label>
            <input
              className={styles.input}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="e.g. robotics_lab.jpeg"
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={isSubmitting || !skillName.trim() || !categoryId}
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Course/Lab'}
          </button>
        </div>
      </div>
    </div>
  )
}
