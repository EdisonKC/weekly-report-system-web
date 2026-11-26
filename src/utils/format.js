export function formatDate(value) {
  if (!value) return '—'
  return String(value).slice(0, 10)
}

export function formatDateTime(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

export function formatMonthDay(value) {
  if (!value) return ''
  const text = String(value).slice(0, 10)
  return text.slice(5).replace('-', '/')
}

export function weekday(value) {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

export function todayString() {
  const date = new Date()
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function dateTimeString(date) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function addDays(value, days) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date
}

export function toDateString(value) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function initialOf(name) {
  return name ? name.trim().slice(0, 1) : '?'
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export const roleMeta = {
  SUPER_ADMIN: { label: '超级管理员', tone: 'super' },
  ADMIN: { label: '管理员', tone: 'admin' },
  EMPLOYEE: { label: '员工', tone: 'employee' }
}

export const phaseMeta = {
  FILLING: { label: '填报中', className: 'is-filling' },
  UPCOMING: { label: '未开始', className: 'is-upcoming' },
  CLOSED: { label: '已截止', className: 'is-closed' }
}

export const reportStatusMeta = {
  SUBMITTED: { label: '已提交', className: 'is-submitted' },
  DRAFT: { label: '草稿', className: 'is-draft' },
  NOT_STARTED: { label: '未填写', className: 'is-empty' }
}

export function phaseOf(period) {
  return phaseMeta[period?.phase] || { label: '未知', className: 'is-empty' }
}

export function reportStatusOf(status) {
  return reportStatusMeta[status] || reportStatusMeta.NOT_STARTED
}

export function percent(value, total) {
  if (!total) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export function isOverdue(fillEnd) {
  if (!fillEnd) return false
  return new Date(String(fillEnd).replace(' ', 'T')).getTime() < Date.now()
}

export function countdownText(fillEnd) {
  if (!fillEnd) return ''
  const end = new Date(String(fillEnd).replace(' ', 'T')).getTime()
  const diff = end - Date.now()
  if (diff <= 0) return '已截止'
  const hours = Math.floor(diff / 3600000)
  if (hours >= 24) return `剩余 ${Math.floor(hours / 24)} 天`
  if (hours >= 1) return `剩余 ${hours} 小时`
  return `剩余 ${Math.max(1, Math.floor(diff / 60000))} 分钟`
}
