const store = require('../../utils/store')
const money = require('../../utils/money')

Page({
  data: {
    list: [],
    hideAmount: false,
    showForm: false,
    formId: '',
    formName: '',
    formType: 'expense',
    formAmount: '',
    formCategoryId: '',
    formAccountId: '',
    formNote: '',
    categoryOptions: [],
    categoryIndex: 0,
    categoryName: '请选择分类',
    accountOptions: [],
    accountIndex: 0,
    accountName: '请选择账户'
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const settings = store.getSettings()
    const categories = store.getCategories()
    const accounts = store.getAccounts()
    const list = store.getTemplates().map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId)
      const acc = accounts.find((a) => a.id === t.accountId)
      return Object.assign({}, t, {
        icon: t.type === 'transfer' ? '⇄' : (cat ? cat.icon : '⚡'),
        typeLabel: t.type === 'income' ? '收入' : (t.type === 'transfer' ? '转账' : '支出'),
        amountText: settings.hideAmount ? '****' : money.formatCents(t.amount),
        categoryText: t.type === 'transfer' ? '转账' : (cat ? store.categoryDisplayName(t.categoryId) : '分类已删除'),
        accountText: acc ? acc.name : '当前账户'
      })
    })
    this.setData({ list, hideAmount: !!settings.hideAmount })
  },

  openForm() {
    const accounts = store.getAccounts()
    const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }))
    this.setData({
      showForm: true,
      formId: '',
      formName: '',
      formType: 'expense',
      formAmount: '',
      formCategoryId: '',
      formAccountId: accounts[0] ? accounts[0].id : '',
      formNote: '',
      accountOptions,
      accountIndex: 0,
      accountName: accounts[0] ? accounts[0].name : '暂无账户'
    })
    this.buildCategoryOptions('expense', '')
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  editTemplate(e) {
    const id = e.currentTarget.dataset.id
    const tpl = store.getTemplates().find((t) => t.id === id)
    if (!tpl) return
    const accounts = store.getAccounts()
    const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }))
    const foundIndex = accountOptions.findIndex((a) => a.id === tpl.accountId)
    const accountIndex = foundIndex >= 0 ? foundIndex : 0
    const formAccountId = accountOptions[accountIndex] ? accountOptions[accountIndex].id : ''
    this.setData({
      showForm: true,
      formId: tpl.id,
      formName: tpl.name,
      formType: tpl.type,
      formAmount: money.centToInput(tpl.amount),
      formNote: tpl.note || '',
      formAccountId,
      accountOptions,
      accountIndex,
      accountName: accountOptions[accountIndex] ? accountOptions[accountIndex].name : '暂无账户'
    })
    if (tpl.type === 'transfer') {
      this.setData({ formCategoryId: '', categoryOptions: [], categoryIndex: 0, categoryName: '转账无需分类' })
    } else {
      this.buildCategoryOptions(tpl.type, tpl.categoryId)
    }
  },

  buildCategoryOptions(type, categoryId) {
    const all = store.getCategories()
    const categories = all
      .filter((c) => c.type === type)
      .sort((a, b) => {
        if ((a.parentId || '') === (b.parentId || '')) return (a.sort || 0) - (b.sort || 0)
        const pa = a.parentId || a.id
        const pb = b.parentId || b.id
        if (pa !== pb) {
          const topA = all.find((c) => c.id === pa)
          const topB = all.find((c) => c.id === pb)
          return ((topA && topA.sort) || 0) - ((topB && topB.sort) || 0)
        }
        return a.parentId ? 1 : -1
      })
    const options = [{ id: '', name: '请选择分类' }].concat(
      categories.map((c) => ({ id: c.id, name: store.categoryDisplayName(c.id) }))
    )
    const index = Math.max(0, options.findIndex((o) => o.id === categoryId))
    this.setData({
      categoryOptions: options,
      categoryIndex: index,
      categoryName: options[index].name,
      formCategoryId: options[index].id
    })
  },

  selectFormType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.formType) return
    this.setData({ formType: type })
    if (type === 'transfer') {
      this.setData({ categoryOptions: [], categoryIndex: 0, categoryName: '转账无需分类', formCategoryId: '' })
    } else {
      this.buildCategoryOptions(type, '')
    }
  },

  onFormName(e) {
    this.setData({ formName: e.detail.value })
  },

  onFormAmount(e) {
    this.setData({ formAmount: e.detail.value })
  },

  onFormCategory(e) {
    const index = Number(e.detail.value)
    const option = this.data.categoryOptions[index]
    if (!option) return
    this.setData({ categoryIndex: index, categoryName: option.name, formCategoryId: option.id })
  },

  onFormAccount(e) {
    const index = Number(e.detail.value)
    const option = this.data.accountOptions[index]
    if (!option) return
    this.setData({ accountIndex: index, accountName: option.name, formAccountId: option.id })
  },

  onFormNote(e) {
    this.setData({ formNote: e.detail.value })
  },

  saveForm() {
    const type = this.data.formType
    const amount = money.parseToCents(this.data.formAmount)
    if (amount === null || amount <= 0) {
      wx.showToast({ title: '请输入模板金额', icon: 'none' })
      return
    }
    if (type !== 'transfer' && !this.data.formCategoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    const name = String(this.data.formName || '').trim() || '常用模板'
    store.saveTemplate({
      id: this.data.formId || undefined,
      name,
      type,
      amount,
      categoryId: type === 'transfer' ? '' : this.data.formCategoryId,
      accountId: this.data.formAccountId,
      note: this.data.formNote
    })
    this.setData({ showForm: false })
    this.refresh()
    wx.showToast({ title: '模板已保存', icon: 'success' })
  },

  removeTemplate(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除模板',
      content: '模板删除后不影响已记录的账单。',
      confirmText: '删除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        store.deleteTemplate(id)
        this.setData({ showForm: false })
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  },

  noop() {}
})
