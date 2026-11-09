const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')

Page({
  data: {
    totalAssetsText: '¥0.00',
    monthExpenseText: '¥0.00',
    monthIncomeText: '¥0.00',
    accountsCount: 0,
    categoriesCount: 0,
    templatesCount: 0,
    hideAmount: false,
    defaultPage: 'record',
    defaultPageLabel: '打开即记账',
    storageText: '',
    storagePercent: 0,
    storageWarn: false,
    budgetText: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const settings = store.getSettings()
    const accounts = store.getAccounts()
    const categories = store.getCategories()
    const templates = store.getTemplates()
    const ym = dateUtil.ymOf(dateUtil.todayStr())
    const totals = store.monthTotals(ym)
    const budget = store.getBudgetSummary(ym)
    const storage = store.storageInfo()
    const totalAssets = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)
    const percent = storage.limitSize ? Math.round((storage.currentSize / storage.limitSize) * 100) : 0
    this.setData({
      totalAssetsText: money.money(totalAssets, settings.hideAmount),
      monthExpenseText: money.money(totals.expense, settings.hideAmount),
      monthIncomeText: money.money(totals.income, settings.hideAmount),
      accountsCount: accounts.length,
      categoriesCount: categories.length,
      templatesCount: templates.length,
      hideAmount: !!settings.hideAmount,
      defaultPage: settings.defaultPage,
      defaultPageLabel: settings.defaultPage === 'list' ? '打开即看明细' : '打开即记账',
      storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
      storagePercent: Math.min(100, percent),
      storageWarn: storage.currentSize > storage.limitSize * 0.7,
      budgetText: budget.hasBudget
        ? (settings.hideAmount ? '已设置' : '预算 ' + money.money(budget.total, false))
        : '未设置'
    })
  },

  goAccounts() {
    wx.navigateTo({ url: '/pages/accounts/accounts' })
  },

  goCategories() {
    wx.navigateTo({ url: '/pages/categories/categories?type=expense' })
  },

  goBudget() {
    wx.navigateTo({ url: '/pages/budget/budget' })
  },

  goTemplates() {
    wx.navigateTo({ url: '/pages/templates/templates' })
  },

  goData() {
    wx.navigateTo({ url: '/pages/data/data' })
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  toggleHide() {
    const hide = !this.data.hideAmount
    store.saveSettings({ hideAmount: hide })
    this.refresh()
    wx.showToast({ title: hide ? '金额已隐藏' : '金额已显示', icon: 'none' })
  },

  chooseDefaultPage() {
    wx.showActionSheet({
      itemList: ['打开小程序即记账', '打开小程序即看明细'],
      success: (res) => {
        const defaultPage = res.tapIndex === 1 ? 'list' : 'record'
        store.saveSettings({ defaultPage })
        this.refresh()
        wx.showToast({ title: '下次启动生效', icon: 'none' })
      }
    })
  },

  showReminder() {
    wx.showModal({
      title: '记账提醒',
      content: '提醒依赖微信「订阅消息」，需要在小程序后台配置模板 ID 并部署定时服务后才能推送。当前为纯本机版本，暂不发送提醒，不影响记账与统计。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2F6F5E'
    })
  },

  clearDataTip() {
    wx.navigateTo({ url: '/pages/data/data' })
  }
})
