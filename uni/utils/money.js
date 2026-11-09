function groupYuan(yuan) {
  return String(yuan).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// cents: 整数分。返回带千分位的两位小数字符串，不含符号
function formatCents(cents) {
  const value = Math.round(Number(cents) || 0)
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const yuan = Math.floor(abs / 100)
  const fen = abs % 100
  return sign + groupYuan(yuan) + '.' + (fen < 10 ? '0' + fen : '' + fen)
}

// 显示金额，hide 为真时返回 ****
function money(cents, hide) {
  if (hide) return '****'
  return '¥' + formatCents(cents)
}

function signedMoney(cents, type, hide) {
  if (hide) return '****'
  if (type === 'income') return '+' + formatCents(Math.abs(cents))
  if (type === 'expense') return '-' + formatCents(Math.abs(cents))
  return formatCents(Math.abs(cents))
}

// 输入框里的元 -> 分；非法返回 null
function parseToCents(input) {
  if (typeof input === 'number') {
    if (!isFinite(input)) return null
    return Math.round(input * 100)
  }
  const text = String(input === undefined || input === null ? '' : input).trim()
  if (!text) return null
  if (!/^-?\d+(\.\d{0,2})?$/.test(text)) return null
  return Math.round(parseFloat(text) * 100)
}

function centToInput(cents) {
  if (cents === undefined || cents === null) return ''
  return formatCents(cents).replace(/,/g, '')
}

function percentText(part, total) {
  if (!total) return '0%'
  const p = (part / total) * 100
  if (p >= 99.95) return '100%'
  if (p < 0.1) return '0.1%'
  return p.toFixed(1) + '%'
}

export default {
  formatCents,
  money,
  signedMoney,
  parseToCents,
  centToInput,
  percentText
}

