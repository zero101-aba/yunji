const store = require('../../utils/store')
const money = require('../../utils/money')

const TYPES = [
  { key: 'cash', label: '现金', icon: '💵' },
  { key: 'wechat', label: '微信零钱', icon: '💚' },
  { key: 'alipay', label: '支付宝', icon: '💙' },
  { key: 'bank', label: '银行卡', icon: '🏦' },
  { key: 'credit', label: '信用卡', icon: '💳' }
]

const ICONS = ['💵', '💚', '💙', '🏦', '💳', '👛', '📱', '💰', '🧧', '🏧', '🪪', '🎫']

Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    type: 'cash',
    icon: '💵',
    initInput: '',
    quotaInput: '',
    billDay: '10',
    repayDay: '20',
    types: TYPES,
    icons: ICONS,
    balanceText: '',
    hideAmount: false
  },

  onLoad(options) {
    const settings = store.getSettings()
    this.setData({ hideAmount: !!settings.hideAmount })
    if (!options.id) return
    const account = store.getAccount(options.id)
    if (!account) return
    this.setData({
      id: account.id,
      isEdit: true,
      name: account.name,
      type: account.type,
      icon: account.icon,
      initInput: money.centToInput(account.initBalance),
      quotaInput: account.quota ? money.centToInput(account.quota) : '',
      billDay: account.billDay ? String(account.billDay) : '10',
      repayDay: account.repayDay ? String(account.repayDay) : '20',
      balanceText: money.money(account.balance, settings.hideAmount)
    })
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type
    const matched = TYPES.find((t) => t.key === type)
    const update = { type }
    if (!this.data.isEdit && matched) update.icon = matched.icon
    this.setData(update)
  },

  selectIcon(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },

  onInit(e) {
    this.setData({ initInput: e.detail.value })
  },

  onQuota(e) {
    this.setData({ quotaInput: e.detail.value })
  },

  onBillDay(e) {
    this.setData({ billDay: e.detail.value })
  },

  onRepayDay(e) {
    this.setData({ repayDay: e.detail.value })
  },

  save() {
    const name = String(this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入账户名称', icon: 'none' })
      return
    }
    if (name.length > 12) {
      wx.showToast({ title: '账户名称最多 12 个字', icon: 'none' })
      return
    }
    let initBalance = 0
    if (this.data.initInput) {
      const parsed = money.parseToCents(this.data.initInput)
      if (parsed === null) {
        wx.showToast({ title: '初始余额格式有误', icon: 'none' })
        return
      }
      initBalance = parsed
    }
    let quota = 0
    if (this.data.type === 'credit' && this.data.quotaInput) {
      const parsedQuota = money.parseToCents(this.data.quotaInput)
      if (parsedQuota === null || parsedQuota < 0) {
        wx.showToast({ title: '额度格式有误', icon: 'none' })
        return
      }
      quota = parsedQuota
    }
    const billDay = Math.min(28, Math.max(1, Number(this.data.billDay) || 10))
    const repayDay = Math.min(28, Math.max(1, Number(this.data.repayDay) || 20))
    store.saveAccount({
      id: this.data.id || undefined,
      name,
      type: this.data.type,
      icon: this.data.icon,
      initBalance,
      quota,
      billDay,
      repayDay
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 450)
  },

  remove() {
    wx.showModal({
      title: '删除账户',
      content: '删除后该账户将不再显示，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteAccount(this.data.id)
        if (!result.ok) {
          if (result.reason === 'referenced') {
            wx.showModal({
              title: '无法删除',
              content: '该账户下还有账单记录。请先在明细中把相关账单改到其他账户，再删除。',
              showCancel: false,
              confirmColor: '#2F6F5E'
            })
          }
          return
        }
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 450)
      }
    })
  }
})
