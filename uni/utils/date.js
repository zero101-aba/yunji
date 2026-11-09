const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function todayStr(dt) {
  const d = dt || new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function nowTime() {
  const d = new Date()
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

function ymOf(dateStr) {
  return String(dateStr || todayStr()).slice(0, 7)
}

function addMonths(ym, delta) {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7)) - 1 + delta
  const dt = new Date(y, m, 1)
  return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1)
}

function monthLabel(ym) {
  return ym.slice(0, 4) + '年' + Number(ym.slice(5, 7)) + '月'
}

function weekOf(dateStr) {
  const d = new Date(dateStr.replace(/-/g, '/'))
  return WEEK[d.getDay()]
}

function daysInMonth(ym) {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return new Date(y, m, 0).getDate()
}

function dateLabel(dateStr) {
  return Number(dateStr.slice(5, 7)) + '月' + dateStr.slice(8, 10) + '日'
}

function quickDate(offset) {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return todayStr(d)
}

function daysElapsed(ym) {
  const today = todayStr()
  const currentYm = ymOf(today)
  if (ym === currentYm) return Number(today.slice(8, 10))
  if (ym < currentYm) return daysInMonth(ym)
  return 0
}

function dayOfMonth(dateStr) {
  return Number(dateStr.slice(8, 10))
}

export default {
  WEEK,
  pad2,
  todayStr,
  nowTime,
  ymOf,
  addMonths,
  monthLabel,
  weekOf,
  daysInMonth,
  dateLabel,
  quickDate,
  daysElapsed,
  dayOfMonth
}

