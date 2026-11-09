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
    currentYm: '',
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    cells: [],
    selectedDate: '',
    selectedLabel: '',
    selectedWeek: '',
    dayBills: [],
    daySummary: { expenseText: '', incomeText: '' },
    monthExpenseText: '',
    monthIncomeText: '',
    monthCount: 0,
    monthDays: 0,
    hideAmount: false
  },

  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr())
    const ym = query && /^\d{4}-\d{2}$/.test(query.ym || '') ? query.ym : currentYm
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym), currentYm })
    this.pickDefaultDay()
    this.refresh()
  },

  onShow() {
    if (this.data.ym) this.refresh()
  },

  pickDefaultDay() {
    const ym = this.data.ym
    let selectedDate = ym + '-01'
    if (ym === this.data.currentYm) {
      selectedDate = dateUtil.todayStr()
    } else {
      const bills = store.getMonthBills(ym)
      const days = bills.map((b) => b.date).filter((d) => d && d.slice(0, 7) === ym).sort()
      if (days.length) selectedDate = days[0]
    }
    this.setData({ selectedDate })
  },

  refresh() {
    const hide = !!store.getSettings().hideAmount
    this.setData({ hideAmount: hide })
    this.buildCalendar(hide)
    this.loadDay(hide)
  },

  buildCalendar(hide) {
    const useHide = typeof hide === 'boolean' ? hide : this.data.hideAmount
    const ym = this.data.ym
    const bills = store.getMonthBills(ym)
    this.monthBills = bills

    const dateMap = {}
    bills.forEach((b) => {
      if (!b.date) return
      if (!dateMap[b.date]) dateMap[b.date] = { hasExpense: false, hasIncome: false }
      if (b.type === 'expense') dateMap[b.date].hasExpense = true
      if (b.type === 'income') dateMap[b.date].hasIncome = true
    })

    const y = Number(ym.slice(0, 4))
    const m = Number(ym.slice(5, 7))
    const firstWeekday = new Date(y, m - 1, 1).getDay()
    const n = dateUtil.daysInMonth(ym)
    const today = dateUtil.todayStr()
    const cells = []

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ key: 'blank-' + i, day: 0, date: '', hasBill: false, dotClass: '' })
    }
    for (let d = 1; d <= n; d++) {
      const date = ym + '-' + dateUtil.pad2(d)
      const info = dateMap[date]
      cells.push({
        key: date,
        day: d,
        date,
        hasBill: !!info,
        dotClass: info ? (info.hasExpense ? 'expense' : 'income') : '',
        isToday: date === today,
        isSelected: date === this.data.selectedDate
      })
    }
    const rest = (7 - (cells.length % 7)) % 7
    for (let i = 0; i < rest; i++) {
      cells.push({ key: 'tail-' + i, day: 0, date: '', hasBill: false, dotClass: '' })
    }

    const totals = store.monthTotals(ym)
    this.setData({
      cells,
      monthExpenseText: money.money(totals.expense, useHide),
      monthIncomeText: money.money(totals.income, useHide),
      monthCount: bills.length,
      monthDays: Object.keys(dateMap).length
    })
  },

  loadDay(hide) {
    const date = this.data.selectedDate
    if (!date) return
    const useHide = typeof hide === 'boolean' ? hide : this.data.hideAmount
    const bills = (this.monthBills || []).filter((b) => b.date === date)
    const categories = store.getCategories()
    const accounts = store.getAccounts()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const accMap = {}
    accounts.forEach((a) => { accMap[a.id] = a })

    let expense = 0
    let income = 0
    const items = bills.map((bill) => {
      const isTransfer = bill.type === 'transfer'
      const cat = catMap[bill.categoryId]
      const icon = isTransfer ? '⇄' : (cat ? cat.icon : '🏷️')
      const color = isTransfer ? '#6F7C78' : (cat ? cat.color : '#9A948C')
      const name = isTransfer ? '账户转账' : (cat ? cat.name : '未分类')
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
      if (bill.type === 'expense') expense += bill.amount
      if (bill.type === 'income') income += bill.amount
      const sign = bill.type === 'expense' ? '-' : (bill.type === 'income' ? '+' : '')
      return {
        id: bill.id,
        icon,
        tint: hexToRgba(color, 0.13),
        name,
        sub,
        time: bill.time || '',
        amountText: useHide ? '****' : sign + money.formatCents(bill.amount),
        amountClass: bill.type,
        hasImages: !!(bill.images && bill.images.length)
      }
    })

    this.setData({
      dayBills: items,
      selectedLabel: dateUtil.dateLabel(date),
      selectedWeek: dateUtil.weekOf(date),
      daySummary: {
        expenseText: expense ? money.money(expense, useHide) : '',
        incomeText: income ? money.money(income, useHide) : ''
      }
    })
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    this.setData({ selectedDate: date })
    this.buildCalendar()
    this.loadDay()
  },

  shift(e) {
    const dir = Number(e.currentTarget.dataset.dir)
    const ym = dateUtil.addMonths(this.data.ym, dir)
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
    this.pickDefaultDay()
    this.refresh()
  },

  goToday() {
    this.setData({ ym: this.data.currentYm, ymLabel: dateUtil.monthLabel(this.data.currentYm) })
    this.setData({ selectedDate: dateUtil.todayStr() })
    this.refresh()
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
        if (store.deleteBill(id).ok) {
          wx.showToast({ title: '已删除', icon: 'none' })
          this.refresh()
        }
      }
    })
  },

  goRecord() {
    wx.switchTab({ url: '/pages/record/record' })
  }
})
