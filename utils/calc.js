// 简易四则运算求值：支持 + - * / 与小数，返回元（number），非法返回 null
function evaluate(expr) {
  if (!expr) return null
  const text = String(expr)
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/＋/g, '+')
    .replace(/－/g, '-')
    .replace(/\s/g, '')
  if (!text || !/^[0-9.+\-*/]+$/.test(text)) return null
  if (/[+\-*/]$/.test(text)) return null

  const tokens = []
  let buffer = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      if (!buffer) return null
      tokens.push(parseFloat(buffer))
      tokens.push(ch)
      buffer = ''
    } else {
      buffer += ch
    }
  }
  if (!buffer) return null
  tokens.push(parseFloat(buffer))

  let pos = 0

  function parseFactor() {
    const value = tokens[pos]
    if (typeof value !== 'number' || !isFinite(value)) return null
    pos++
    return value
  }

  function parseTerm() {
    let value = parseFactor()
    if (value === null) return null
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos]
      pos++
      const next = parseFactor()
      if (next === null) return null
      if (op === '*' ) value = value * next
      else {
        if (next === 0) return null
        value = value / next
      }
    }
    return value
  }

  function parseExpression() {
    let value = parseTerm()
    if (value === null) return null
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos]
      pos++
      const next = parseTerm()
      if (next === null) return null
      value = op === '+' ? value + next : value - next
    }
    return value
  }

  const result = parseExpression()
  if (pos !== tokens.length || result === null || !isFinite(result)) return null
  return result
}

function hasOperator(expr) {
  return /[+\-*/×÷]/.test(String(expr || ''))
}

function currentOperand(expr) {
  const text = String(expr || '')
  const idx = Math.max(
    text.lastIndexOf('+'),
    text.lastIndexOf('-'),
    text.lastIndexOf('*'),
    text.lastIndexOf('/'),
    text.lastIndexOf('×'),
    text.lastIndexOf('÷')
  )
  return text.slice(idx + 1)
}

module.exports = {
  evaluate,
  hasOperator,
  currentOperand
}
