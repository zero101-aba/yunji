const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')

const RESULT_LIMIT = 300

function hexToRgba(hex, alpha) {
  const value = String(hex || '#8C857B').replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

function highlightParts(text, keyword) {
  const source = String(text || '')
  const key = String(keyword || '')
  if (!key) return [{ t: source, hit: false }]
  const lowerSource = source.toLowerCase()
  const lowerKey = key.toLowerCase()
  const parts = []
  let pos = 0
  let index = lowerSource.indexOf(lowerKey)
  while (index >= 0) {
    if (index > pos) parts.push({ t: source.slice(pos, index), hit: false })
    parts.push({ t: source.slice(index, index + lowerKey.length), hit: true })
    pos = index + lowerKey.length
    index = lowerSource.indexOf(lowerKey, pos)
  }
  if (pos < source.length) parts.push({ t: source.slice(pos), hit: false })
  return parts.length ? parts : [{ t: source, hit: false }]
}

Page({
  data: {
    keyword: '',
    results: [],
    totalMatched: 0,
    limitTip: '',
    hasSearched: false,
    expenseText: '',
    incomeText: '',
    hideAmount: false
  },

  onShow() {
    const hide = !!store.getSettings().hideAmount
    if (hide !== this.data.hideAmount) this.setData({ hideAmount: hide })
    if (this.data.keyword.trim()) this.search(true)
  },

  onUnload() {
    if (this.timer) clearTimeout(this.timer)
  },

  onInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.search(true), 260)
  },

  onConfirm(e) {
    if (this.timer) clearTimeout(this.timer)
    this.setData({ keyword: e.detail.value || this.data.keyword })
    this.search(true)
  },

  clearKeyword() {
    if (this.timer) clearTimeout(this.timer)
    this.setData({ keyword: '', results: [], totalMatched: 0, hasSearched: false, limitTip: '', expenseText: '', incomeText: '' })
  },

  search() {
    const keyword = String(this.data.keyword || '').trim()
    if (!keyword) {
      this.setData({ results: [], totalMatched: 0, hasSearched: false, limitTip: '', expenseText: '', incomeText: '' })
      return
    }
    const hide = this.data.hideAmount
    const lowerKey = keyword.toLowerCase()
    const bills = store.allBills().filter((b) => String(b.note || '').toLowerCase().indexOf(lowerKey) >= 0)
    const categories = store.getCategories()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const accounts = store.getAccounts()
    const accMap = {}
    accounts.forEach((a) => { accMap[a.id] = a })

    let expense = 0
    let income = 0
    bills.forEach((b) => {
      if (b.type === 'expense') expense += Number(b.amount) || 0
      if (b.type === 'income') income += Number(b.amount) || 0
    })

    const results = bills.slice(0, RESULT_LIMIT).map((b) => {
      const isTransfer = b.type === 'transfer'
      const cat = catMap[b.categoryId]
      const icon = isTransfer ? '⇄' : (cat ? cat.icon : '🏷️')
      const color = isTransfer ? '#6F7C78' : (cat ? cat.color : '#9A948C')
      const acc = accMap[b.accountId]
      let name = isTransfer ? '账户转账' : (cat ? store.categoryDisplayName(b.categoryId) : '未分类')
      const sign = b.type === 'expense' ? '-' : (b.type === 'income' ? '+' : '')
      return {
        id: b.id,
        icon,
        tint: hexToRgba(color, 0.13),
        name,
        dateText: dateUtil.dateLabel(b.date),
        time: b.time || '',
        noteParts: highlightParts(b.note, keyword),
        accountText: acc ? acc.name : '',
        amountText: hide ? '****' : sign + money.formatCents(b.amount),
        amountClass: b.type,
        hasImages: !!(b.images && b.images.length)
      }
    })

    this.setData({
      results,
      totalMatched: bills.length,
      hasSearched: true,
      expenseText: expense ? money.money(expense, hide) : '',
      incomeText: income ? money.money(income, hide) : '',
      limitTip: bills.length > RESULT_LIMIT ? '仅展示前 ' + RESULT_LIMIT + ' 笔，换个更精确的关键词试试' : ''
    })
  },

  editBill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/edit/edit?id=' + id })
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' })
  }
})
