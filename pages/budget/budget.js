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

Page({
  data: {
    ym: '',
    ymLabel: '',
    hideAmount: false,
    totalInput: '',
    rows: [],
    summary: {
      hasBudget: false,
      totalText: '¥0.00',
      usedText: '¥0.00',
      remainText: '¥0.00',
      percent: 0,
      barWidth: 0,
      over: false
    }
  },

  onLoad(options) {
    const ym = options.ym || dateUtil.ymOf(dateUtil.todayStr())
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const settings = store.getSettings()
    const hide = !!settings.hideAmount
    const ym = this.data.ym
    const budget = store.getBudget(ym)
    const bills = store.getMonthBills(ym)
    const categories = store.getCategories().filter((c) => c.type === 'expense' && !c.parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const catMap = {}
    store.getCategories().forEach((c) => { catMap[c.id] = c })
    const usedMap = {}
    bills.forEach((b) => {
      if (b.type !== 'expense') return
      const cat = catMap[b.categoryId]
      const key = cat ? (cat.parentId || cat.id) : '__other__'
      usedMap[key] = (usedMap[key] || 0) + b.amount
    })
    const rows = categories.map((c) => {
      const used = usedMap[c.id] || 0
      const budgetCents = Number((budget.byCategory || {})[c.id]) || 0
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        tint: hexToRgba(c.color, 0.12),
        input: budgetCents ? money.centToInput(budgetCents) : '',
        used,
        usedText: money.money(used, hide),
        budgetText: budgetCents ? money.money(budgetCents, hide) : '未设',
        barWidth: budgetCents ? Math.min(100, Math.round((used / budgetCents) * 100)) : 0,
        over: budgetCents > 0 && used > budgetCents
      }
    })
    const summary = store.getBudgetSummary(ym)
    this.setData({
      hideAmount: hide,
      totalInput: budget.total ? money.centToInput(budget.total) : '',
      rows,
      summary: {
        hasBudget: summary.hasBudget,
        totalText: money.money(summary.total, hide),
        usedText: money.money(summary.used, hide),
        remainText: money.money(Math.abs(summary.remain), hide),
        percent: summary.percent,
        barWidth: Math.min(100, Math.round(summary.percent)),
        over: summary.over
      }
    })
  },

  shift(e) {
    const dir = Number(e.currentTarget.dataset.dir)
    const ym = dateUtil.addMonths(this.data.ym, dir)
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
    this.refresh()
  },

  onTotal(e) {
    this.setData({ totalInput: e.detail.value })
  },

  onRowInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ ['rows[' + index + '].input']: e.detail.value })
  },

  save() {
    let total = 0
    if (this.data.totalInput) {
      const parsed = money.parseToCents(this.data.totalInput)
      if (parsed === null || parsed < 0) {
        wx.showToast({ title: '预算总额格式有误', icon: 'none' })
        return
      }
      total = parsed
    }
    const byCategory = {}
    for (let i = 0; i < this.data.rows.length; i++) {
      const row = this.data.rows[i]
      if (!row.input) continue
      const parsed = money.parseToCents(row.input)
      if (parsed === null || parsed < 0) {
        wx.showToast({ title: row.name + ' 的预算格式有误', icon: 'none' })
        return
      }
      if (parsed > 0) byCategory[row.id] = parsed
    }
    const sumCategory = Object.keys(byCategory).reduce((s, k) => s + byCategory[k], 0)
    if (total === 0 && sumCategory === 0) {
      store.saveBudget(this.data.ym, { total: 0, byCategory: {} })
      this.refresh()
      wx.showToast({ title: '已清除预算', icon: 'none' })
      return
    }
    if (total === 0 && sumCategory > 0) {
      total = sumCategory
    }
    if (total > 0 && sumCategory > total) {
      wx.showToast({ title: '分类预算合计不能超过总预算', icon: 'none' })
      return
    }
    store.saveBudget(this.data.ym, { total, byCategory })
    this.refresh()
    wx.showToast({ title: '预算已保存', icon: 'success' })
  },

  clearBudget() {
    wx.showModal({
      title: '清除本月预算',
      content: '本月总预算与分类预算都会清空，账单不受影响。',
      confirmText: '清除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        store.saveBudget(this.data.ym, { total: 0, byCategory: {} })
        this.refresh()
        wx.showToast({ title: '已清除', icon: 'none' })
      }
    })
  }
})
