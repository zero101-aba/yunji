const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value)
  return '"' + text.replace(/"/g, '""') + '"'
}

const TYPE_LABEL = { expense: '支出', income: '收入', transfer: '转账' }

Page({
  data: {
    storageText: '',
    storagePercent: 0,
    storageWarn: false,
    billCount: 0,
    monthCount: 0,
    exportOptions: [],
    exportIndex: 0,
    exportName: '全部账单',
    busy: false,
    backupInfo: '',
    restoreText: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const storage = store.storageInfo()
    const months = store.getBillMonths()
    const options = [{ id: 'all', name: '全部账单' }].concat(
      months.map((ym) => ({ id: ym, name: dateUtil.monthLabel(ym) }))
    )
    let count = 0
    try {
      count = store.allBills().length
    } catch (e) {
      count = 0
    }
    let backupInfo = this.data.backupInfo
    if (this.backupText) {
      backupInfo = '已生成 ' + Math.round(this.backupText.length / 1024) + ' KB 备份内容'
    }
    this.setData({
      storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
      storagePercent: Math.min(100, Math.round((storage.currentSize / (storage.limitSize || 10240)) * 100)),
      storageWarn: storage.currentSize > storage.limitSize * 0.7,
      billCount: count,
      monthCount: months.length,
      exportOptions: options,
      backupInfo
    })
  },

  onExportScope(e) {
    const index = Number(e.detail.value)
    const option = this.data.exportOptions[index]
    if (!option) return
    this.setData({ exportIndex: index, exportName: option.name })
  },

  exportCsv() {
    if (this.data.busy) return
    const scope = this.data.exportOptions[this.data.exportIndex].id
    const list = scope === 'all' ? store.allBills() : store.getMonthBills(scope)
    if (!list.length) {
      wx.showToast({ title: '没有可导出的账单', icon: 'none' })
      return
    }
    const catMap = {}
    store.getCategories().forEach((c) => { catMap[c.id] = c })
    const accMap = {}
    store.getAccounts().forEach((a) => { accMap[a.id] = a })
    const header = ['日期', '时间', '类型', '分类', '账户', '金额(元)', '备注']
    const lines = [header.map(csvCell).join(',')]
    list.slice().reverse().forEach((b) => {
      const cat = catMap[b.categoryId]
      const acc = accMap[b.accountId]
      let accountText = acc ? acc.name : ''
      if (b.type === 'transfer') {
        const to = accMap[b.toAccountId]
        accountText = accountText + ' → ' + (to ? to.name : '')
      }
      lines.push([
        csvCell(b.date),
        csvCell(b.time),
        csvCell(TYPE_LABEL[b.type] || b.type),
        csvCell(b.type === 'transfer' ? '转账' : (cat ? store.categoryDisplayName(b.categoryId) : '未分类')),
        csvCell(accountText),
        csvCell(money.centToInput(b.amount)),
        csvCell(b.note || '')
      ].join(','))
    })
    const csv = '\ufeff' + lines.join('\r\n')
    const fileName = '生活记账_' + (scope === 'all' ? '全部账单' : scope) + '.csv'
    this.setData({ busy: true })
    try {
      const fs = wx.getFileSystemManager()
      const filePath = wx.env.USER_DATA_PATH + '/' + fileName
      fs.writeFile({
        filePath,
        data: csv,
        encoding: 'utf8',
        success: () => {
          this.setData({ busy: false })
          this.shareFile(filePath, '账单 CSV 已生成，可转发到微信或电脑保存。')
        },
        fail: () => {
          this.setData({ busy: false })
          wx.setClipboardData({
            data: csv.replace(/\ufeff/g, ''),
            success: () => wx.showToast({ title: '文件写入失败，内容已复制', icon: 'none' })
          })
        }
      })
    } catch (e) {
      this.setData({ busy: false })
      wx.setClipboardData({
        data: csv,
        success: () => wx.showToast({ title: '已复制 CSV 内容', icon: 'none' })
      })
    }
  },

  shareFile(filePath, successText) {
    if (wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath,
        success: () => wx.showToast({ title: successText, icon: 'none' }),
        fail: () => {
          wx.showModal({
            title: '文件已生成',
            content: '当前微信版本无法直接转发文件，可复制内容后手动保存。',
            showCancel: false,
            confirmColor: '#2F6F5E'
          })
        }
      })
      return
    }
    wx.showModal({
      title: '文件已生成',
      content: '当前微信版本不支持文件转发，请升级微信后重试。',
      showCancel: false,
      confirmColor: '#2F6F5E'
    })
  },

  generateBackup() {
    try {
      const data = store.exportBackup()
      this.backupText = JSON.stringify(data)
      const now = new Date()
      const label = dateUtil.todayStr(now) + ' ' + dateUtil.nowTime()
      store.saveMeta({ lastBackupAt: Date.now() })
      this.setData({
        backupInfo: '已生成 ' + Math.round(this.backupText.length / 1024) + ' KB · ' + label
      })
      wx.setClipboardData({
        data: this.backupText,
        success: () => wx.showToast({ title: '备份内容已复制', icon: 'success' })
      })
    } catch (e) {
      wx.showToast({ title: '备份生成失败', icon: 'none' })
    }
  },

  saveBackupFile() {
    if (!this.backupText) this.generateBackup()
    if (!this.backupText) return
    try {
      const filePath = wx.env.USER_DATA_PATH + '/生活记账_备份_' + dateUtil.todayStr() + '.json'
      wx.getFileSystemManager().writeFile({
        filePath,
        data: this.backupText,
        encoding: 'utf8',
        success: () => this.shareFile(filePath, '备份文件已生成'),
        fail: () => wx.showToast({ title: '生成文件失败', icon: 'none' })
      })
    } catch (e) {
      wx.showToast({ title: '生成文件失败', icon: 'none' })
    }
  },

  onRestoreInput(e) {
    this.setData({ restoreText: e.detail.value })
  },

  restoreBackup() {
    const text = String(this.data.restoreText || '').trim()
    if (!text) {
      wx.showToast({ title: '请先粘贴备份内容', icon: 'none' })
      return
    }
    let data = null
    try {
      data = JSON.parse(text)
    } catch (e) {
      wx.showToast({ title: '备份内容格式有误', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认恢复备份',
      content: '恢复会覆盖当前账户、分类、账单与设置，且不可撤销。',
      confirmText: '覆盖恢复',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        const result = store.importBackup(data)
        if (!result.ok) {
          wx.showModal({
            title: '恢复失败',
            content: result.reason === 'format' ? '这不是有效的「生活记账」备份内容。' : '写入失败，可能是存储空间不足。',
            showCancel: false,
            confirmColor: '#2F6F5E'
          })
          return
        }
        this.backupText = ''
        this.setData({ restoreText: '', backupInfo: '' })
        this.refresh()
        wx.showToast({ title: '已恢复 ' + result.count + ' 笔账单', icon: 'none' })
      }
    })
  },

  clearBills() {
    wx.showModal({
      title: '清空全部账单',
      content: '将删除所有账单并把账户余额重置为初始余额。分类、账户、预算设置会保留。',
      editable: true,
      placeholderText: '请输入「清空」确认',
      confirmText: '清空',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        if (String(res.content || '').trim() !== '清空') {
          wx.showToast({ title: '确认文字不正确', icon: 'none' })
          return
        }
        store.clearBills()
        this.refresh()
        wx.showToast({ title: '账单已清空', icon: 'none' })
      }
    })
  }
})
