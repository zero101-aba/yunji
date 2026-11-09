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

const PAGE_SIZE = 30

Page({
  data: {
    ym: '',
    ymLabel: '',
    hideAmount: false,
    summary: {},
    groups: [],
    loaded: PAGE_SIZE,
    totalFiltered: 0,
    hasMore: false,
    monthEmpty: true,
    filterChips: [],
    hasFilter: false,
    filterResultText: '',
    sheet: '',
    draftType: 'all',
    draftCategoryId: '',
    draftAccountId: '',
    draftMin: '',
    draftMax: '',
    filterCatOptions: [],
    filterCatIndex: 0,
    filterCatName: '全部分类',
    filterAccountOptions: [],
    filterAccountIndex: 0,
    filterAccountName: '全部账户'
  },

  onLoad() {
    const ym = dateUtil.ymOf(dateUtil.todayStr())
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
    this.monthBills = []
    this.activeFilter = { type: 'all', categoryId: '', accountId: '', minCents: null, maxCents: null }
    this.setData({ loaded: PAGE_SIZE })
  },

  onShow() {
    const settings = store.getSettings()
    this.setData({ hideAmount: !!settings.hideAmount })
    this.refresh(true)
  },

  refresh(resetPage) {
    this.monthBills = store.getMonthBills(this.data.ym)
    if (resetPage) this.setData({ loaded: PAGE_SIZE })
    this.apply()
  },

  apply() {
    const hide = this.data.hideAmount
    const totals = store.monthTotals(this.data.ym)
    const filtered = this.filterBills(this.monthBills)
    const loaded = Math.min(filtered.length, this.data.loaded)
    const categories = store.getCategories()
    const accounts = store.getAccounts()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const accMap = {}
    accounts.forEach((a) => { accMap[a.id] = a })

    const groupsMap = {}
    const groupOrder = []
    filtered.slice(0, loaded).forEach((bill) => {
      const c = catMap[bill.categoryId]
      const isTransfer = bill.type === 'transfer'
      const icon = isTransfer ? '⇄' : (c ? c.icon : '🏷️')
      const color = isTransfer ? '#6F7C78' : (c ? c.color : '#9A948C')
      const name = isTransfer ? '账户转账' : (c ? c.name : '未分类')
      let sub = ''
      if (isTransfer) {
        const from = accMap[bill.accountId] ? accMap[bill.accountId].name : '未知账户'
        const to = accMap[bill.toAccountId] ? accMap[bill.toAccountId].name : '未知账户'
        sub = from + ' → ' + to
        if (bill.note) sub += ' · ' + bill.note
      } else {
        const acc = accMap[bill.accountId]
        sub = bill.note || (acc ? acc.name : '')
      }
      const sign = bill.type === 'expense' ? '-' : (bill.type === 'income' ? '+' : '')
      const amountText = hide
        ? '****'
        : sign + money.formatCents(bill.amount)
      const item = {
        id: bill.id,
        icon,
        tint: hexToRgba(color, 0.13),
        color,
        name,
        sub,
        amountText,
        amountClass: bill.type,
        time: bill.time || '',
        hasImages: !!(bill.images && bill.images.length)
      }
      if (!groupsMap[bill.date]) {
        groupsMap[bill.date] = {
          date: bill.date,
          dateText: dateUtil.dateLabel(bill.date),
          week: dateUtil.weekOf(bill.date),
          isToday: bill.date === dateUtil.todayStr(),
          dayExpense: 0,
          dayIncome: 0,
          items: []
        }
        groupOrder.push(bill.date)
      }
      const g = groupsMap[bill.date]
      g.items.push(item)
      if (bill.type === 'expense') g.dayExpense += bill.amount
      if (bill.type === 'income') g.dayIncome += bill.amount
    })

    const groups = groupOrder.map((date) => {
      const g = groupsMap[date]
      return Object.assign({}, g, {
        expenseText: g.dayExpense ? (hide ? '****' : money.formatCents(g.dayExpense)) : '',
        incomeText: g.dayIncome ? (hide ? '****' : money.formatCents(g.dayIncome)) : ''
      })
    })

    let filterResultText = ''
    if (this.data.hasFilter) {
      let exp = 0
      let inc = 0
      let tr = 0
      filtered.forEach((b) => {
        if (b.type === 'expense') exp += b.amount
        else if (b.type === 'income') inc += b.amount
        else tr += b.amount
      })
      if (this.activeFilter.type === 'transfer') {
        filterResultText = '转账合计 ' + money.money(tr, hide)
      } else if (this.activeFilter.type === 'income') {
        filterResultText = '收入合计 ' + money.money(inc, hide)
      } else if (this.activeFilter.type === 'expense') {
        filterResultText = '支出合计 ' + money.money(exp, hide)
      } else {
        filterResultText = '支出 ' + money.money(exp, hide) + ' · 收入 ' + money.money(inc, hide)
      }
    }

    this.setData({
      summary: {
        incomeText: money.money(totals.income, hide),
        expenseText: money.money(totals.expense, hide),
        balanceText: money.money(totals.balance, hide),
        balanceClass: totals.balance >= 0 ? 'pos' : 'neg'
      },
      groups,
      totalFiltered: filtered.length,
      hasMore: loaded < filtered.length,
      monthEmpty: this.monthBills.length === 0,
      filterResultText
    })
  },

  filterBills(list) {
    const f = this.activeFilter
    return list.filter((b) => {
      if (f.type !== 'all' && b.type !== f.type) return false
      if (f.type === 'transfer' && b.type !== 'transfer') return false
      if (f.categoryId) {
        if (b.categoryId !== f.categoryId) {
          const category = store.getCategory(f.categoryId)
          if (!category || category.parentId) return false
          const child = store.getCategory(b.categoryId)
          if (!child || child.parentId !== f.categoryId) return false
        }
      }
      if (f.accountId && (b.accountId !== f.accountId && b.toAccountId !== f.accountId)) return false
      if (f.minCents !== null && b.amount < f.minCents) return false
      if (f.maxCents !== null && b.amount > f.maxCents) return false
      return true
    })
  },

  prevMonth() {
    this.setData({
      ym: dateUtil.addMonths(this.data.ym, -1)
    })
    this.setData({ ymLabel: dateUtil.monthLabel(this.data.ym), loaded: PAGE_SIZE })
    this.refresh(false)
  },

  nextMonth() {
    this.setData({
      ym: dateUtil.addMonths(this.data.ym, 1)
    })
    this.setData({ ymLabel: dateUtil.monthLabel(this.data.ym), loaded: PAGE_SIZE })
    this.refresh(false)
  },

  onTouchStart(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    this.touchStart = { x: touch.clientX, y: touch.clientY }
  },

  onTouchEnd(e) {
    if (!this.touchStart) return
    const touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - this.touchStart.x
    const dy = touch.clientY - this.touchStart.y
    this.touchStart = null
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
      if (dx < 0) this.nextMonth()
      else this.prevMonth()
    }
  },

  onReachBottom() {
    if (!this.data.hasMore) return
    this.setData({ loaded: this.data.loaded + PAGE_SIZE })
    this.apply()
  },

  editBill(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/edit/edit?id=' + id })
  },

  deleteBill(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除这笔记录',
      content: '删除后不可恢复，账户余额与统计会同步更新。',
      confirmText: '删除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteBill(id)
        if (result.ok) {
          wx.showToast({ title: '已删除', icon: 'none' })
          this.refresh(true)
        }
      }
    })
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  goCalendar() {
    wx.navigateTo({ url: '/pages/calendar/calendar?ym=' + this.data.ym })
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' })
  },

  /* ------- 筛选 ------- */
  openFilter() {
    const f = this.activeFilter
    this.setData({
      sheet: 'filter',
      draftType: f.type,
      draftCategoryId: f.categoryId,
      draftAccountId: f.accountId,
      draftMin: f.minCents !== null ? money.centToInput(f.minCents) : '',
      draftMax: f.maxCents !== null ? money.centToInput(f.maxCents) : ''
    })
    this.buildFilterOptions(f.type, f.categoryId, f.accountId)
  },

  buildFilterOptions(type, categoryId, accountId) {
    const categories = store.getCategories()
    let catOptions = [{ id: '', name: '全部分类' }]
    if (type === 'transfer') {
      catOptions = [{ id: '', name: '转账无分类' }]
    } else {
      const filtered = categories
        .filter((c) => (type === 'all' ? true : c.type === type))
        .sort((a, b) => cmpCategory(a, b, categories))
      filtered.forEach((c) => {
        catOptions.push({ id: c.id, name: store.categoryDisplayName(c.id) })
      })
    }
    const accounts = store.getAccounts()
    const accOptions = [{ id: '', name: '全部账户' }].concat(
      accounts.map((a) => ({ id: a.id, name: a.name }))
    )
    const catIndex = Math.max(0, catOptions.findIndex((o) => o.id === categoryId))
    const accIndex = Math.max(0, accOptions.findIndex((o) => o.id === accountId))
    this.setData({
      filterCatOptions: catOptions,
      filterCatIndex: catIndex,
      filterCatName: catOptions[catIndex].name,
      filterAccountOptions: accOptions,
      filterAccountIndex: accIndex,
      filterAccountName: accOptions[accIndex].name
    })
  },

  onFilterType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ draftType: type, draftCategoryId: '' })
    this.buildFilterOptions(type, '', this.data.draftAccountId)
  },

  onFilterCategory(e) {
    const index = Number(e.detail.value)
    const option = this.data.filterCatOptions[index]
    if (!option) return
    this.setData({ filterCatIndex: index, filterCatName: option.name, draftCategoryId: option.id })
  },

  onFilterAccount(e) {
    const index = Number(e.detail.value)
    const option = this.data.filterAccountOptions[index]
    if (!option) return
    this.setData({ filterAccountIndex: index, filterAccountName: option.name, draftAccountId: option.id })
  },

  onFilterMin(e) {
    this.setData({ draftMin: e.detail.value })
  },

  onFilterMax(e) {
    this.setData({ draftMax: e.detail.value })
  },

  applyFilter() {
    const draft = this.data
    let minCents = null
    let maxCents = null
    if (draft.draftMin) {
      minCents = money.parseToCents(draft.draftMin)
      if (minCents === null) {
        wx.showToast({ title: '最低金额格式有误', icon: 'none' })
        return
      }
    }
    if (draft.draftMax) {
      maxCents = money.parseToCents(draft.draftMax)
      if (maxCents === null) {
        wx.showToast({ title: '最高金额格式有误', icon: 'none' })
        return
      }
    }
    if (minCents !== null && maxCents !== null && minCents > maxCents) {
      wx.showToast({ title: '最低金额不能大于最高金额', icon: 'none' })
      return
    }
    this.activeFilter = {
      type: draft.draftType,
      categoryId: draft.draftType === 'transfer' ? '' : draft.draftCategoryId,
      accountId: draft.draftAccountId,
      minCents,
      maxCents
    }
    const chips = []
    if (draft.draftType !== 'all') {
      chips.push({ key: 'type', label: { expense: '支出', income: '收入', transfer: '转账' }[draft.draftType] })
    }
    if (this.activeFilter.categoryId) {
      chips.push({ key: 'category', label: store.categoryDisplayName(this.activeFilter.categoryId) })
    }
    if (this.activeFilter.accountId) {
      chips.push({ key: 'account', label: store.accountName(this.activeFilter.accountId) })
    }
    if (minCents !== null || maxCents !== null) {
      chips.push({
        key: 'amount',
        label: (minCents !== null ? '≥' + money.centToInput(minCents) : '') +
          (minCents !== null && maxCents !== null ? ' ~ ' : '') +
          (maxCents !== null ? '≤' + money.centToInput(maxCents) : '')
      })
    }
    this.setData({
      hasFilter: chips.length > 0,
      filterChips: chips,
      sheet: '',
      loaded: PAGE_SIZE
    })
    this.apply()
  },

  resetFilter() {
    this.activeFilter = { type: 'all', categoryId: '', accountId: '', minCents: null, maxCents: null }
    this.setData({
      hasFilter: false,
      filterChips: [],
      filterResultText: '',
      sheet: '',
      loaded: PAGE_SIZE
    })
    this.apply()
  },

  removeChip(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'type') this.activeFilter.type = 'all'
    if (key === 'category') this.activeFilter.categoryId = ''
    if (key === 'account') this.activeFilter.accountId = ''
    if (key === 'amount') {
      this.activeFilter.minCents = null
      this.activeFilter.maxCents = null
    }
    const chips = this.data.filterChips.filter((c) => c.key !== key)
    this.setData({ filterChips: chips, hasFilter: chips.length > 0, loaded: PAGE_SIZE })
    this.apply()
  },

  closeSheet() {
    this.setData({ sheet: '' })
  },

  noop() {}
})

function cmpCategory(a, b, all) {
  if (a.type !== b.type) return a.type === 'expense' ? -1 : 1
  const pa = a.parentId || a.id
  const pb = b.parentId || b.id
  if (pa !== pb) {
    const topA = all.find((c) => c.id === pa)
    const topB = all.find((c) => c.id === pb)
    return ((topA && topA.sort) || 0) - ((topB && topB.sort) || 0)
  }
  if ((a.parentId || '') === (b.parentId || '')) return (a.sort || 0) - (b.sort || 0)
  return a.parentId ? 1 : -1
}
