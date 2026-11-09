const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')

function hexToRgba(hex, alpha) {
  const value = String(hex || '#8C857B').replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

const RECORD_LIMIT = 300

Page({
  data: {
    period: 'month',
    anchor: '',
    label: '',
    type: 'expense',
    catId: '',
    title: '',
    icon: '',
    color: '#8C857B',
    tint: 'rgba(140,133,123,0.12)',
    totalText: '',
    count: 0,
    percentText: '0%',
    avgText: '',
    rows: [],
    hasRows: false,
    records: [],
    recordCount: 0,
    limitTip: '',
    hideAmount: false
  },

  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr())
    const period = query && query.period === 'year' ? 'year' : 'month'
    const anchor = (query && query.anchor) || (period === 'month' ? currentYm : currentYm.slice(0, 4))
    this.setData({
      period,
      anchor,
      label: period === 'month' ? dateUtil.monthLabel(anchor) : anchor + '年',
      type: query && query.type === 'income' ? 'income' : 'expense',
      catId: (query && query.cat) || ''
    })
    this.refresh()
  },

  onShow() {
    if (this.data.catId) this.refresh()
  },

  billsOfPeriod() {
    if (this.data.period === 'month') return store.getMonthBills(this.data.anchor)
    return store.allBills().filter((b) => (b.date || '').slice(0, 4) === this.data.anchor)
  },

  refresh() {
    const hide = !!store.getSettings().hideAmount
    const type = this.data.type
    const catId = this.data.catId
    const categories = store.getCategories()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const accounts = store.getAccounts()
    const accMap = {}
    accounts.forEach((a) => { accMap[a.id] = a })

    const typed = this.billsOfPeriod().filter((b) => b.type === type)
    const typeTotal = typed.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    let top = null
    let title = '未分类'
    let icon = '🏷️'
    let color = '#9A948C'
    if (catId !== '__other__') {
      top = catMap[catId] || null
      if (top) {
        title = top.name
        icon = top.icon
        color = top.color
      } else {
        title = '分类已删除'
      }
    }

    const matched = typed.filter((b) => {
      if (catId === '__other__') return !catMap[b.categoryId]
      if (!top) return false
      if (b.categoryId === catId) return true
      const child = catMap[b.categoryId]
      return !!(child && child.parentId === catId)
    })

    const matchedTotal = matched.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
    const count = matched.length

    const childMap = {}
    if (top) {
      matched.forEach((b) => {
        const key = b.categoryId === catId ? '__self__' : b.categoryId
        const child = b.categoryId === catId ? null : catMap[b.categoryId]
        if (!childMap[key]) {
          childMap[key] = {
            id: key,
            name: child ? child.name : '直接记在 ' + top.name,
            icon: child ? child.icon : top.icon,
            amount: 0,
            count: 0
          }
        }
        childMap[key].amount += Number(b.amount) || 0
        childMap[key].count += 1
      })
    }
    const rows = Object.keys(childMap)
      .map((k) => childMap[k])
      .sort((a, b) => b.amount - a.amount)
      .map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        amountText: money.money(r.amount, hide),
        percentText: money.percentText(r.amount, matchedTotal),
        width: matchedTotal ? Math.max(2, (r.amount / matchedTotal) * 100) : 0,
        count: r.count
      }))

    const records = matched.slice(0, RECORD_LIMIT).map((b) => {
      const child = catMap[b.categoryId]
      const isSelf = b.categoryId === catId
      const recordIcon = child ? child.icon : (top ? top.icon : '🏷️')
      const recordColor = child ? (top ? top.color : child.color) : color
      const acc = accMap[b.accountId]
      let noteText = b.note || ''
      if (!noteText) noteText = acc ? acc.name : '无备注'
      return {
        id: b.id,
        icon: recordIcon,
        tint: hexToRgba(recordColor, 0.13),
        name: child && !isSelf ? top.name + ' · ' + child.name : (top ? top.name : '未分类'),
        dateText: dateUtil.dateLabel(b.date) + ' ' + dateUtil.weekOf(b.date),
        time: b.time || '',
        note: noteText,
        amountText: hide ? '****' : money.formatCents(b.amount),
        hasImages: !!(b.images && b.images.length)
      }
    })

    this.setData({
      title,
      icon,
      color,
      tint: hexToRgba(color, 0.13),
      totalText: money.money(matchedTotal, hide),
      count,
      percentText: typeTotal ? money.percentText(matchedTotal, typeTotal) : '0%',
      avgText: count ? money.money(Math.round(matchedTotal / count), hide) : '—',
      rows,
      hasRows: rows.length > 1,
      records,
      recordCount: count,
      limitTip: count > RECORD_LIMIT ? '仅展示最近 ' + RECORD_LIMIT + ' 笔，共 ' + count + ' 笔' : '',
      hideAmount: hide
    })
  },

  editBill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/edit/edit?id=' + id })
  },

  goList() {
    wx.switchTab({ url: '/pages/list/list' })
  }
})
