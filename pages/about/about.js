const store = require('../../utils/store')
const dateUtil = require('../../utils/date')

Page({
  data: {
    version: store.VERSION,
    billCount: 0,
    monthCount: 0,
    accountCount: 0,
    storageText: '',
    storagePercent: 0,
    createdText: '',
    steps: [
      { icon: '✏️', title: '记一笔', desc: '记账页输入金额，选分类和账户，点保存。金额支持 12+8 这类算式。' },
      { icon: '🗂️', title: '看明细', desc: '按日分组的账单列表，支持筛选、搜索备注、日历视图与左右切月。' },
      { icon: '📊', title: '看统计', desc: '月度收支总览、分类占比环形图、每日趋势，点分类可下钻查看记录。' },
      { icon: '💾', title: '做备份', desc: '在「数据与备份」中导出 CSV 或生成备份内容，换机前记得备份。' }
    ]
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const storage = store.storageInfo()
    const months = store.getBillMonths()
    const meta = store.getMeta()
    let billCount = 0
    try {
      billCount = store.allBills().length
    } catch (e) {
      billCount = 0
    }
    const percent = storage.limitSize ? Math.round((storage.currentSize / storage.limitSize) * 100) : 0
    let createdText = ''
    if (meta && meta.createdAt) {
      const dt = new Date(meta.createdAt)
      createdText = '自 ' + dateUtil.todayStr(dt) + ' 开始使用'
    }
    this.setData({
      billCount,
      monthCount: months.length,
      accountCount: store.getAccounts().length,
      storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
      storagePercent: Math.min(100, percent),
      createdText
    })
  },

  checkUpdate() {
    wx.showModal({
      title: '检查更新',
      content: '当前已是最新版本 ' + this.data.version + '。小程序更新由微信自动完成，重新进入小程序即可生效。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2F6F5E'
    })
  },

  showPrivacy() {
    wx.showModal({
      title: '隐私与数据',
      content: '生活记账不需要登录，也不会上传任何数据。所有账单、账户与设置都保存在你手机的小程序本地存储中，我们无法读取，也无法帮你找回。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2F6F5E'
    })
  },

  copyInfo() {
    const text = [
      '生活记账 v' + this.data.version,
      '账单 ' + this.data.billCount + ' 笔 · 月份 ' + this.data.monthCount + ' 个',
      '账户 ' + this.data.accountCount + ' 个',
      '本地存储 ' + this.data.storageText
    ].join('\n')
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '信息已复制', icon: 'success' })
    })
  },

  goData() {
    wx.navigateTo({ url: '/pages/data/data' })
  }
})
