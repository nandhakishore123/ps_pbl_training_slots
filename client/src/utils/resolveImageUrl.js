const ASSET_ORIGIN = (import.meta.env.VITE_ASSET_BASE_URL || 'https://pcdp.bitsathy.ac.in')
  .trim()
  .replace(/\/$/, '')

const stripProtocol = (value) => value.replace(/^https?:\/\//i, '').replace(/^\/\//, '')

const stripDomain = (value) => {
  const host = stripProtocol(ASSET_ORIGIN)
  if (!host) return value
  const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return value.replace(new RegExp(`^${escaped}\\/?`, 'i'), '')
}

export function resolveImageUrl(imageUrl, type) {
  if (!imageUrl) return ''
  let raw = String(imageUrl).trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw

  raw = stripDomain(stripProtocol(raw))
  if (!raw) return ''

  if (raw.startsWith('/')) return `${ASSET_ORIGIN}${raw}`
  if (raw.startsWith('courses/')) return `${ASSET_ORIGIN}/${raw}`
  if (raw.startsWith('ps_courses/')) return `${ASSET_ORIGIN}/courses/${raw}`
  if (raw.startsWith('pbl_courses/')) return `${ASSET_ORIGIN}/courses/${raw}`

  const folder = String(type || '').toUpperCase() === 'PBL' ? 'pbl_courses' : 'ps_courses'
  return `${ASSET_ORIGIN}/courses/${folder}/${raw}`
}
