const store = require('../../utils/store')
const money = require('../../utils/money')

const TYPE_LABEL = {
  cash: '现金',
  wechat: '微信零钱',
  alipay: '支付宝',
  bank: '银行卡',
  credit: '信用卡'
}

Page({
  data: {
    accounts: [],
    totalAssetsText: '¥0.00',
    hideAmount: false
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const settings = store.getSettings()
    const hide = !!settings.hideAmount
    const accounts = store.getAccounts().map((a) => {
      const isCredit = a.type === 'credit'
      const balance = Number(a.balance) || 0
      let amountText = money.money(balance, hide)
      let extra = ''
      if (isCredit) {
        const quota = Number(a.quota) || 0
        const available = quota + balance
        const used = Math.max(0, -balance)
        amountText = money.money(-used, hide)
        extra = '可用 ' + money.money(Math.max(0, available), hide) + ' / 额度 ' + money.money(quota, hide)
      }
      return Object.assign({}, a, {
        typeLabel: TYPE_LABEL[a.type] || '账户',
        amountText,
        extra,
        isCredit,
        negative: !isCredit && balance < 0
      })
    })
    const total = store.getAccounts().reduce((sum, a) => {
      if (a.type === 'credit') return sum
      return sum + (Number(a.balance) || 0)
    }, 0)
    this.setData({
      accounts,
      hideAmount: hide,
      totalAssetsText: money.money(total, hide)
    })
  },

  addAccount() {
    wx.navigateTo({ url: '/pages/account-edit/account-edit' })
  },

  editAccount(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/account-edit/account-edit?id=' + id })
  }
})
