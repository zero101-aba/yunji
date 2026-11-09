const store = require('../../utils/store')
const money = require('../../utils/money')
const dateUtil = require('../../utils/date')

Page({
  data: {
    id: '',
    type: 'expense',
    amountInput: '',
    categoryId: '',
    categoryOptions: [],
    categoryIndex: 0,
    categoryName: '请选择分类',
    accounts: [],
    accountId: '',
    accountIndex: 0,
    toAccountId: '',
    toAccountIndex: 0,
    date: '',
    time: '',
    note: '',
    images: [],
    hideAmount: false,
    missing: false
  },

  onLoad(options) {
    const id = options.id
    const found = store.findBill(id)
    if (!found) {
      this.setData({ missing: true })
      return
    }
    const bill = found.bill
    const settings = store.getSettings()
    const accounts = store.getAccounts()
    const accountOptions = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      balanceText: money.money(a.balance, settings.hideAmount)
    }))
    const accountIndex = Math.max(0, accountOptions.findIndex((a) => a.id === bill.accountId))
    let toAccountIndex = accountOptions.findIndex((a) => a.id === bill.toAccountId)
    if (toAccountIndex < 0) toAccountIndex = 0
    this.bill = bill
    this.setData({
      id,
      type: bill.type,
      amountInput: money.centToInput(bill.amount),
      accounts: accountOptions,
      accountId: bill.accountId,
      accountIndex,
      toAccountId: bill.toAccountId || (accountOptions[accountOptions.length - 1] || {}).id || '',
      toAccountIndex,
      date: bill.date,
      time: bill.time,
      note: bill.note || '',
      images: (bill.images || []).slice(),
      hideAmount: !!settings.hideAmount
    })
    this.buildCategoryOptions(bill.type, bill.categoryId)
  },

  buildCategoryOptions(type, categoryId) {
    if (type === 'transfer') {
      this.setData({
        categoryOptions: [{ id: '', name: '转账无需分类' }],
        categoryIndex: 0,
        categoryId: '',
        categoryName: '转账无需分类'
      })
      return
    }
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
      categoryId: index > 0 ? options[index].id : '',
      categoryName: options[index].name
    })
  },

  onType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({ type })
    this.buildCategoryOptions(type, '')
  },

  onAmount(e) {
    this.setData({ amountInput: e.detail.value })
  },

  onCategory(e) {
    const index = Number(e.detail.value)
    const option = this.data.categoryOptions[index]
    this.setData({
      categoryIndex: index,
      categoryId: option.id,
      categoryName: option.name
    })
  },

  onAccount(e) {
    const index = Number(e.detail.value)
    const account = this.data.accounts[index]
    if (!account) return
    let toAccountId = this.data.toAccountId
    let toAccountIndex = this.data.toAccountIndex
    if (this.data.type === 'transfer' && toAccountId === account.id) {
      const other = this.data.accounts.find((a) => a.id !== account.id)
      if (other) {
        toAccountId = other.id
        toAccountIndex = Math.max(0, this.data.accounts.findIndex((a) => a.id === other.id))
      }
    }
    this.setData({
      accountIndex: index,
      accountId: account.id,
      toAccountId,
      toAccountIndex
    })
  },

  onToAccount(e) {
    const index = Number(e.detail.value)
    const account = this.data.accounts[index]
    if (!account) return
    if (account.id === this.data.accountId) {
      wx.showToast({ title: '转入账户需与转出不同', icon: 'none' })
      return
    }
    this.setData({ toAccountIndex: index, toAccountId: account.id })
  },

  onDate(e) {
    this.setData({ date: e.detail.value })
  },

  onTime(e) {
    this.setData({ time: e.detail.value })
  },

  onNote(e) {
    this.setData({ note: e.detail.value })
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
                success: (s) => saved.push(s.savedFilePath),
                fail: () => saved.push(compress.tempFilePath),
                complete: () => {
                  pending -= 1
                  if (pending === 0) this.setData({ images: this.data.images.concat(saved).slice(0, 3) })
                }
              })
            },
            fail: () => {
              wx.saveFile({
                tempFilePath: file.tempFilePath,
                success: (s) => saved.push(s.savedFilePath),
                fail: () => saved.push(file.tempFilePath),
                complete: () => {
                  pending -= 1
                  if (pending === 0) this.setData({ images: this.data.images.concat(saved).slice(0, 3) })
                }
              })
            }
          })
        })
      }
    })
  },

  previewImage(e) {
    wx.previewImage({ current: e.currentTarget.dataset.src, urls: this.data.images })
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

  save() {
    const amount = money.parseToCents(this.data.amountInput)
    if (amount === null || amount <= 0) {
      wx.showToast({ title: '请输入正确金额', icon: 'none' })
      return
    }
    if (this.data.type !== 'transfer' && !this.data.categoryId) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    if (this.data.type === 'transfer' && this.data.toAccountId === this.data.accountId) {
      wx.showToast({ title: '请选择不同的转入账户', icon: 'none' })
      return
    }
    const result = store.updateBill(this.data.id, {
      type: this.data.type,
      amount,
      categoryId: this.data.type === 'transfer' ? '' : this.data.categoryId,
      accountId: this.data.accountId,
      toAccountId: this.data.type === 'transfer' ? this.data.toAccountId : '',
      date: this.data.date,
      time: this.data.time,
      note: this.data.note,
      images: this.data.images
    })
    if (!result.ok) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      return
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  removeBill() {
    wx.showModal({
      title: '删除记录',
      content: '删除后不可恢复，账户余额与统计会同步更新。',
      confirmText: '删除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        store.deleteBill(this.data.id)
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 500)
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
