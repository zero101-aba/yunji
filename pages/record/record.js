const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')
const calc = require('../../utils/calc')

function hexToRgba(hex, alpha) {
  const value = String(hex || '#8C857B').replace('#', '')
  const full = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

function amountFont(expr) {
  const len = String(expr || '').length
  if (len <= 7) return 88
  if (len <= 11) return 70
  if (len <= 15) return 54
  return 44
}

function shortDate(dateStr) {
  const today = dateUtil.todayStr()
  if (dateStr === today) return '今天'
  if (dateStr === dateUtil.quickDate(1)) return '昨天'
  if (dateStr === dateUtil.quickDate(2)) return '前天'
  return Number(dateStr.slice(5, 7)) + '月' + dateStr.slice(8, 10) + '日'
}

Page({
  data: {
    type: 'expense',
    expr: '',
    amountFont: 88,
    selectedId: '',
    selectedLabel: '',
    selectedParentName: '',
    categories: [],
    accounts: [],
    accountId: '',
    accountLabel: '账户',
    toAccountId: '',
    toAccountLabel: '选择账户',
    dateStr: '',
    dateShort: '今天',
    time: '',
    note: '',
    noteShort: '',
    images: [],
    hideAmount: false,
    budget: { hasBudget: false },
    templates: [],
    sheet: '',
    accountTarget: 'account',
    subVisible: false,
    subParent: null,
    subCategories: [],
    showUndo: false,
    showGuide: false,
    alertText: '',
    quickDates: []
  },

  onLoad() {
    const today = dateUtil.todayStr()
    this.setData({
      dateStr: today,
      dateShort: shortDate(today),
      time: dateUtil.nowTime()
    })
  },

  onShow() {
    const app = getApp()
    if (app && app.globalData && app.globalData.justLaunched) {
      app.globalData.justLaunched = false
      if (store.getSettings().defaultPage === 'list') {
        wx.switchTab({ url: '/pages/list/list' })
        return
      }
    }

    const meta = store.getMeta()
    const settings = store.getSettings()
    const accounts = store.getAccounts()
    this.allCategories = store.getCategories()

    let accountId = this.data.accountId
    if (!accounts.some((a) => a.id === accountId)) {
      accountId = accounts.some((a) => a.id === settings.lastAccountId)
        ? settings.lastAccountId
        : (accounts[0] ? accounts[0].id : '')
    }
    let toAccountId = this.data.toAccountId
    if (!accounts.some((a) => a.id === toAccountId) || toAccountId === accountId) {
      const other = accounts.find((a) => a.id !== accountId)
      toAccountId = other ? other.id : ''
    }

    const notesShort = this.data.note.length > 7
      ? this.data.note.slice(0, 7) + '…'
      : this.data.note

    this.setData({
      hideAmount: !!settings.hideAmount,
      accounts: accounts.map((a) => Object.assign({}, a, {
        balanceText: money.money(a.balance, settings.hideAmount)
      })),
      accountId,
      accountLabel: accounts.find((a) => a.id === accountId) ? store.accountName(accountId) : '添加账户',
      toAccountId,
      toAccountLabel: accounts.find((a) => a.id === toAccountId) ? store.accountName(toAccountId) : '选择账户',
      dateShort: shortDate(this.data.dateStr),
      noteShort: notesShort,
      templates: store.getTemplates().map((t) => Object.assign({}, t, {
        amountText: settings.hideAmount ? '****' : money.formatCents(t.amount),
        icon: t.type === 'income' ? '+' : (t.type === 'transfer' ? '⇄' : '-')
      })),
      showGuide: !meta.guideSeen
    })

    this.loadCategoryGrid()
    this.refreshBudget()
    this.refreshQuickDates()
    if (!this.data.dateStr) {
      const today = dateUtil.todayStr()
      this.setData({ dateStr: today, dateShort: shortDate(today), time: dateUtil.nowTime() })
    }

    // 每次进入首页检查一次预算阈值（每个阈值每月只提示一次）
    const alert = store.checkBudgetAlert(dateUtil.ymOf(this.data.dateStr))
    if (alert) {
      this.showAlert(alert)
    }
  },

  onUnload() {
    if (this.undoTimer) clearTimeout(this.undoTimer)
    if (this.alertTimer) clearTimeout(this.alertTimer)
  },

  /* ------- 分类 ------- */
  loadCategoryGrid() {
    if (this.data.type === 'transfer') {
      this.setData({ categories: [] })
      return
    }
    const type = this.data.type
    const all = this.allCategories || store.getCategories()
    const recent = store.getRecentCategory(type)
    const tops = all
      .filter((c) => c.type === type && !c.parentId && !c.hidden)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const recentTops = recent
      .map((id) => tops.find((c) => c.id === id))
      .filter(Boolean)
    const rest = tops.filter((c) => recentTops.indexOf(c) === -1)
    const ordered = recentTops.concat(rest)
    let activeTop = ''
    if (this.data.selectedId) {
      const selected = all.find((c) => c.id === this.data.selectedId)
      if (selected) activeTop = selected.parentId || selected.id
    }
    const categories = ordered.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      tint: hexToRgba(c.color, 0.12),
      hasChildren: all.some((ch) => ch.parentId === c.id && !ch.hidden),
      active: c.id === activeTop
    }))
    this.setData({ categories })
  },

  onType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({
      type,
      selectedId: '',
      selectedLabel: '',
      selectedParentName: '',
      sheet: '',
      subVisible: false
    })
    this.loadCategoryGrid()
  },

  onCatTap(e) {
    const id = e.currentTarget.dataset.id
    const all = this.allCategories || store.getCategories()
    const category = all.find((c) => c.id === id)
    if (!category) return
    const children = all
      .filter((c) => c.parentId === id && !c.hidden)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    if (children.length > 0) {
      this.setData({
        subVisible: true,
        subParent: { id: category.id, name: category.name, icon: category.icon, color: category.color },
        subCategories: children.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon
        }))
      })
      return
    }
    this.selectCategory(category.id, '', category.name)
  },

  selectCategory(id, parentName, name) {
    const all = this.allCategories || store.getCategories()
    const category = all.find((c) => c.id === id)
    if (!category) return
    let label = name || category.name
    if (category.parentId) {
      const parent = all.find((c) => c.id === category.parentId)
      label = (parent ? parent.name : '') + ' · ' + category.name
    }
    this.setData({
      selectedId: id,
      selectedLabel: label,
      selectedParentName: parentName || '',
      subVisible: false
    })
    this.loadCategoryGrid()
  },

  pickParentOnly() {
    const parent = this.data.subParent
    if (!parent) return
    this.selectCategory(parent.id, '', parent.name)
  },

  pickSubCategory(e) {
    const id = e.currentTarget.dataset.id
    const parent = this.data.subParent
    const child = this.data.subCategories.find((c) => c.id === id)
    if (!child) return
    this.selectCategory(id, parent ? parent.name : '', child.name)
  },

  closeSub() {
    this.setData({ subVisible: false })
  },

  /* ------- 键盘 ------- */
  onKey(e) {
    const key = e.currentTarget.dataset.key
    let expr = this.data.expr || ''

    if (key === 'del') {
      expr = expr.slice(0, -1)
    } else if (key === 'eq') {
      if (!calc.hasOperator(expr)) return
      const value = calc.evaluate(expr)
      if (value === null || value <= 0) {
        wx.showToast({ title: '算式有误', icon: 'none' })
        return
      }
      expr = String(Math.round(value * 100) / 100)
    } else if (key === '+' || key === '-') {
      if (!expr) return
      if (/[+\-*/]$/.test(expr)) expr = expr.slice(0, -1) + key
      else expr = expr + key
    } else if (key === '.') {
      const operand = calc.currentOperand(expr)
      if (operand.indexOf('.') >= 0) return
      expr = expr ? expr + '.' : '0.'
    } else {
      const operand = calc.currentOperand(expr)
      if (operand.indexOf('.') >= 0) {
        const decimals = operand.split('.')[1] || ''
        if (decimals.length >= 2) return
      }
      if (operand === '0') {
        expr = expr.slice(0, -1) + key
      } else if (!expr && key === '0') {
        expr = '0'
      } else {
        expr = expr + key
      }
    }

    if (expr.length > 20) expr = expr.slice(0, 20)
    this.setData({ expr, amountFont: amountFont(expr) })
  },

  /* ------- 账户 / 日期 / 备注 ------- */
  openAccount(e) {
    const target = (e.currentTarget && e.currentTarget.dataset.target) || 'account'
    if (this.data.accounts.length === 0) {
      wx.navigateTo({ url: '/pages/accounts/accounts' })
      return
    }
    this.setData({
      sheet: 'account',
      accountTarget: target,
      sheetAccountActive: target === 'toAccount' ? this.data.toAccountId : this.data.accountId
    })
  },

  selectAccount(e) {
    const id = e.currentTarget.dataset.id
    const target = this.data.accountTarget
    if (target === 'toAccount') {
      if (id === this.data.accountId) {
        wx.showToast({ title: '转入账户需与转出不同', icon: 'none' })
        return
      }
      this.setData({ toAccountId: id, toAccountLabel: store.accountName(id), sheet: '' })
    } else {
      let toAccountId = this.data.toAccountId
      if (this.data.type === 'transfer' && toAccountId === id) {
        const other = this.data.accounts.find((a) => a.id !== id)
        toAccountId = other ? other.id : ''
      }
      this.setData({
        accountId: id,
        accountLabel: store.accountName(id),
        toAccountId,
        toAccountLabel: toAccountId ? store.accountName(toAccountId) : '选择账户',
        sheet: ''
      })
    }
  },

  openDate() {
    this.refreshQuickDates()
    this.setData({ sheet: 'date' })
  },

  refreshQuickDates() {
    const today = dateUtil.todayStr()
    this.setData({
      quickDates: [
        { offset: 0, label: '今天', date: today },
        { offset: 1, label: '昨天', date: dateUtil.quickDate(1) },
        { offset: 2, label: '前天', date: dateUtil.quickDate(2) }
      ]
    })
  },

  pickQuickDate(e) {
    const date = e.currentTarget.dataset.date
    this.setData({
      dateStr: date,
      dateShort: shortDate(date),
      time: date === dateUtil.todayStr() ? dateUtil.nowTime() : this.data.time,
      sheet: ''
    })
  },

  onDateChange(e) {
    const date = e.detail.value
    this.setData({
      dateStr: date,
      dateShort: shortDate(date),
      sheet: ''
    })
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value })
  },

  openNote() {
    this.setData({ sheet: 'note' })
  },

  onNoteInput(e) {
    const note = e.detail.value
    this.setData({
      note,
      noteShort: note.length > 7 ? note.slice(0, 7) + '…' : note
    })
  },

  closeNote() {
    this.setData({ sheet: '' })
  },

  chooseImage() {
    const remain = 3 - this.data.images.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const files = res.tempFiles || []
        const saved = []
        let pending = files.length
        if (!pending) return
        files.forEach((file) => {
          wx.compressImage({
            src: file.tempFilePath,
            quality: 60,
            success: (compress) => {
              wx.saveFile({
                tempFilePath: compress.tempFilePath,
                success: (save) => saved.push(save.savedFilePath),
                fail: () => saved.push(compress.tempFilePath),
                complete: () => {
                  pending -= 1
                  if (pending === 0) {
                    this.setData({ images: this.data.images.concat(saved).slice(0, 3) })
                  }
                }
              })
            },
            fail: () => {
              wx.saveFile({
                tempFilePath: file.tempFilePath,
                success: (save) => saved.push(save.savedFilePath),
                fail: () => saved.push(file.tempFilePath),
                complete: () => {
                  pending -= 1
                  if (pending === 0) {
                    this.setData({ images: this.data.images.concat(saved).slice(0, 3) })
                  }
                }
              })
            }
          })
        })
      }
    })
  },

  previewImage(e) {
    const src = e.currentTarget.dataset.src
    wx.previewImage({ current: src, urls: this.data.images })
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const images = this.data.images.slice()
    const removed = images.splice(index, 1)
    this.setData({ images })
    if (removed[0]) {
      try {
        wx.getFileSystemManager().unlink({ filePath: removed[0], fail: () => {} })
      } catch (err) {
        // 忽略清理失败
      }
    }
  },

  /* ------- 模板 ------- */
  openTemplates() {
    wx.navigateTo({ url: '/pages/templates/templates' })
  },

  applyTemplate(e) {
    const id = e.currentTarget.dataset.id
    const tpl = this.data.templates.find((t) => t.id === id)
    if (!tpl) return
    const all = this.allCategories || store.getCategories()
    const category = all.find((c) => c.id === tpl.categoryId)
    if (tpl.type !== 'transfer' && !category) {
      wx.showToast({ title: '模板分类已删除', icon: 'none' })
      return
    }
    const accountsExist = this.data.accounts.some((a) => a.id === tpl.accountId)
    const expr = tpl.amount > 0 ? money.centToInput(tpl.amount) : ''
    this.setData({
      type: tpl.type,
      expr,
      amountFont: amountFont(expr),
      selectedId: category ? category.id : '',
      selectedLabel: category
        ? (category.parentId ? store.categoryDisplayName(category.id) : category.name)
        : '',
      note: tpl.note || '',
      noteShort: tpl.note && tpl.note.length > 7 ? tpl.note.slice(0, 7) + '…' : (tpl.note || ''),
      accountId: accountsExist ? tpl.accountId : this.data.accountId,
      accountLabel: accountsExist ? store.accountName(tpl.accountId) : this.data.accountLabel
    })
    this.loadCategoryGrid()
    this.setData({ sheet: '' })
  },

  /* ------- 预算 ------- */
  refreshBudget() {
    const ym = dateUtil.ymOf(this.data.dateStr)
    const summary = store.getBudgetSummary(ym)
    const percent = Math.min(100, Math.round(summary.percent))
    this.setData({
      budget: {
        hasBudget: summary.hasBudget,
        usedText: money.money(summary.used, this.data.hideAmount),
        totalText: money.money(summary.total, this.data.hideAmount),
        remainText: money.money(Math.abs(summary.remain), this.data.hideAmount),
        over: summary.over,
        percent: summary.percent,
        barWidth: percent
      }
    })
  },

  goBudget() {
    wx.navigateTo({ url: '/pages/budget/budget?ym=' + dateUtil.ymOf(this.data.dateStr) })
  },

  showAlert(alert) {
    if (this.alertTimer) clearTimeout(this.alertTimer)
    const text = alert.threshold === 100
      ? '本月预算已超支，记得控制开销'
      : '本月预算已使用 ' + Math.round(alert.percent) + '%'
    this.setData({ alertText: text })
    this.alertTimer = setTimeout(() => {
      this.setData({ alertText: '' })
    }, 4200)
  },

  /* ------- 保存 / 撤销 ------- */
  onSave() {
    const expr = this.data.expr
    let value = null
    if (expr) {
      value = calc.hasOperator(expr) ? calc.evaluate(expr) : Number(expr)
    }
    const amount = value === null || !isFinite(value) ? 0 : Math.round(value * 100)
    if (amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    if (amount > 999999999) {
      wx.showToast({ title: '金额过大', icon: 'none' })
      return
    }
    if (!this.data.accountId) {
      wx.showToast({ title: '请先添加账户', icon: 'none' })
      return
    }
    if (this.data.type === 'transfer') {
      if (!this.data.toAccountId || this.data.toAccountId === this.data.accountId) {
        wx.showToast({ title: '请选择不同的转入账户', icon: 'none' })
        return
      }
    } else if (!this.data.selectedId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }

    const result = store.addBill({
      type: this.data.type,
      amount,
      categoryId: this.data.selectedId,
      accountId: this.data.accountId,
      toAccountId: this.data.toAccountId,
      date: this.data.dateStr,
      time: this.data.time,
      note: this.data.note,
      images: this.data.images
    })

    if (!result.ok) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      return
    }

    this.lastBillId = result.bill.id
    this.setData({
      expr: '',
      amountFont: 88,
      note: '',
      noteShort: '',
      images: [],
      showUndo: true,
      sheet: ''
    })

    store.saveSettings({ lastAccountId: this.data.accountId })
    this.allCategories = store.getCategories()
    this.loadCategoryGrid()
    this.refreshBudget()

    if (this.undoTimer) clearTimeout(this.undoTimer)
    this.undoTimer = setTimeout(() => {
      this.setData({ showUndo: false })
    }, 3000)

    const alert = store.checkBudgetAlert(dateUtil.ymOf(this.data.dateStr))
    if (alert) this.showAlert(alert)

    wx.showToast({ title: '已记一笔', icon: 'success', duration: 1200 })
  },

  undoLast() {
    if (!this.lastBillId) return
    if (this.undoTimer) clearTimeout(this.undoTimer)
    const result = store.deleteBill(this.lastBillId)
    this.lastBillId = ''
    this.setData({ showUndo: false })
    this.refreshBudget()
    if (result.ok) {
      wx.showToast({ title: '已撤销', icon: 'none' })
    }
  },

  /* ------- 引导 ------- */
  closeGuide() {
    store.saveMeta({ guideSeen: true })
    this.setData({ showGuide: false })
  },

  goAccounts() {
    wx.navigateTo({ url: '/pages/accounts/accounts' })
  },

  closeSheet() {
    this.setData({ sheet: '' })
  },

  noop() {}
})
