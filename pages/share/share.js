const store = require('../../utils/store')
const dateUtil = require('../../utils/date')
const money = require('../../utils/money')

function font(size, bold) {
  return (bold ? 'bold ' : '') + Math.round(size) + 'px -apple-system, "PingFang SC", "Helvetica Neue", sans-serif'
}

function fitText(ctx, text, maxWidth) {
  let value = String(text || '')
  if (ctx.measureText(value).width <= maxWidth) return value
  while (value.length > 1 && ctx.measureText(value + '…').width > maxWidth) {
    value = value.slice(0, -1)
  }
  return value + '…'
}

Page({
  data: {
    ym: '',
    ymLabel: '',
    hideAmount: false,
    expenseText: '',
    incomeText: '',
    balanceText: '',
    count: 0,
    days: 0,
    hasData: false
  },

  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr())
    const ym = query && /^\d{4}-\d{2}$/.test(query.ym || '') ? query.ym : currentYm
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
  },

  onReady() {
    this.ready = true
    this.refresh(() => this.drawPoster())
  },

  onShow() {
    if (this.ready) this.refresh(() => this.drawPoster())
  },

  refresh(callback) {
    const hide = !!store.getSettings().hideAmount
    const ym = this.data.ym
    const bills = store.getMonthBills(ym)
    const totals = store.monthTotals(ym)

    const categories = store.getCategories()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const map = {}
    bills.forEach((b) => {
      if (b.type !== 'expense') return
      const cat = catMap[b.categoryId]
      const key = cat ? (cat.parentId || cat.id) : '__other__'
      const top = cat ? (cat.parentId ? catMap[cat.parentId] : cat) : null
      if (!map[key]) {
        map[key] = {
          name: top ? top.name : '未分类',
          color: top ? top.color : '#9A948C',
          amount: 0
        }
      }
      map[key].amount += Number(b.amount) || 0
    })
    const rankList = Object.keys(map)
      .map((k) => map[k])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)

    const days = Object.keys(
      bills.reduce((acc, b) => { acc[b.date] = true; return acc }, {})
    ).length

    this.posterData = {
      hide,
      totals,
      ranks: rankList.map((r) => ({
        name: r.name,
        color: r.color,
        amountText: hide ? '****' : '¥' + money.formatCents(r.amount),
        percent: totals.expense ? (r.amount / totals.expense) * 100 : 0
      })),
      count: bills.length,
      days
    }

    this.setData({
      hideAmount: hide,
      expenseText: money.money(totals.expense, hide),
      incomeText: money.money(totals.income, hide),
      balanceText: money.money(totals.balance, hide),
      count: bills.length,
      days,
      hasData: bills.length > 0
    }, callback)
  },

  shift(e) {
    const dir = Number(e.currentTarget.dataset.dir)
    const ym = dateUtil.addMonths(this.data.ym, dir)
    this.setData({ ym, ymLabel: dateUtil.monthLabel(ym) })
    this.refresh(() => this.drawPoster())
  },

  initPoster() {
    wx.createSelectorQuery()
      .in(this)
      .select('#poster')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node || !res[0].width) return
        const canvas = res[0].node
        let pixelRatio = 2
        try {
          const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
          pixelRatio = info.pixelRatio || 2
        } catch (e) {
          pixelRatio = 2
        }
        const width = res[0].width
        const height = res[0].height
        canvas.width = Math.floor(width * pixelRatio)
        canvas.height = Math.floor(height * pixelRatio)
        const ctx = canvas.getContext('2d')
        ctx.scale(pixelRatio, pixelRatio)
        this.posterCanvas = canvas
        this.posterCtx = ctx
        this.posterWidth = width
        this.posterHeight = height
        this.posterRatio = pixelRatio
        this.paintPoster(ctx, width, height)
      })
  },

  drawPoster() {
    if (!this.ready) return
    if (!this.posterCanvas) {
      this.initPoster()
      return
    }
    const ctx = this.posterCtx
    ctx.clearRect(0, 0, this.posterWidth, this.posterHeight)
    this.paintPoster(ctx, this.posterWidth, this.posterHeight)
  },

  paintPoster(ctx, w, h) {
    const data = this.posterData || {}
    const totals = data.totals || { expense: 0, income: 0, balance: 0 }
    const hide = !!data.hide
    const pad = w * 0.08

    ctx.fillStyle = '#FFFDF9'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#C99A45'
    ctx.fillRect(0, 0, w, 4)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#A59D91'
    ctx.font = font(w * 0.028)
    ctx.fillText('生活记账 · 月度账单', pad, h * 0.092)

    ctx.fillStyle = '#2E2A25'
    ctx.font = font(w * 0.072, true)
    ctx.fillText(this.data.ymLabel, pad, h * 0.172)

    ctx.fillStyle = '#C99A45'
    ctx.fillRect(pad, h * 0.215, w * 0.11, 3)

    ctx.fillStyle = '#8C857B'
    ctx.font = font(w * 0.03)
    ctx.fillText('本月支出', pad, h * 0.278)

    const expenseText = hide ? '****' : (totals.expense === 0 ? '¥0.00' : '¥' + money.formatCents(totals.expense))
    let amountSize = w * 0.128
    if (expenseText.length > 9) amountSize = w * 0.104
    if (expenseText.length > 12) amountSize = w * 0.086
    ctx.fillStyle = '#DE6B47'
    ctx.font = font(amountSize, true)
    ctx.fillText(expenseText, pad, h * 0.375)

    const colY = h * 0.447
    ctx.fillStyle = '#8C857B'
    ctx.font = font(w * 0.028)
    ctx.fillText('本月收入', pad, colY)
    ctx.fillText('本月结余', pad + (w - pad * 2) * 0.5, colY)

    ctx.fillStyle = '#2E8B6F'
    ctx.font = font(w * 0.046, true)
    ctx.fillText(hide ? '****' : '¥' + money.formatCents(totals.income), pad, colY + h * 0.048)

    ctx.fillStyle = totals.balance >= 0 ? '#2F6F5E' : '#C4512E'
    ctx.font = font(w * 0.046, true)
    ctx.fillText(hide ? '****' : '¥' + money.formatCents(totals.balance), pad + (w - pad * 2) * 0.5, colY + h * 0.048)

    ctx.fillStyle = '#EDE7DD'
    ctx.fillRect(pad, h * 0.545, w - pad * 2, 1)

    ctx.fillStyle = '#2E2A25'
    ctx.font = font(w * 0.034, true)
    ctx.fillText('支出构成', pad, h * 0.6)

    const ranks = data.ranks || []
    if (!ranks.length) {
      ctx.fillStyle = '#B3ABA0'
      ctx.font = font(w * 0.032)
      ctx.fillText('这个月还没有支出记录', pad, h * 0.665)
    } else {
      const startY = h * 0.645
      const rowH = h * 0.068
      const barWidth = w - pad * 2
      ranks.forEach((rank, i) => {
        const y = startY + i * rowH
        ctx.textAlign = 'left'
        ctx.fillStyle = '#4A453E'
        ctx.font = font(w * 0.03)
        const nameMax = barWidth * 0.5
        ctx.fillText(fitText(ctx, rank.name, nameMax), pad, y)

        ctx.textAlign = 'right'
        ctx.fillStyle = '#2E2A25'
        ctx.font = font(w * 0.029, true)
        ctx.fillText(rank.amountText, w - pad, y)

        ctx.fillStyle = '#F2EDE5'
        ctx.fillRect(pad, y + h * 0.016, barWidth, 5)
        ctx.fillStyle = rank.color || '#2F6F5E'
        ctx.fillRect(pad, y + h * 0.016, Math.max(3, barWidth * Math.min(1, rank.percent / 100)), 5)
      })
    }

    ctx.fillStyle = '#EDE7DD'
    ctx.fillRect(pad, h * 0.895, w - pad * 2, 1)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#A59D91'
    ctx.font = font(w * 0.026)
    ctx.fillText('共 ' + (data.count || 0) + ' 笔 · 记账 ' + (data.days || 0) + ' 天', pad, h * 0.935)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#C4BDB1'
    ctx.font = font(w * 0.024)
    ctx.fillText('数据只存在本机', w - pad, h * 0.935)
  },

  saveToAlbum() {
    if (!this.posterCanvas) {
      wx.showToast({ title: '海报还在生成，请稍候', icon: 'none' })
      return
    }
    wx.showLoading({ title: '生成图片' })
    wx.canvasToTempFilePath({
      canvas: this.posterCanvas,
      x: 0,
      y: 0,
      width: this.posterWidth,
      height: this.posterHeight,
      destWidth: this.posterWidth * (this.posterRatio || 2),
      destHeight: this.posterHeight * (this.posterRatio || 2),
      success: (res) => {
        wx.hideLoading()
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: (err) => {
            if (String(err.errMsg || '').indexOf('auth') >= 0 || String(err.errMsg || '').indexOf('deny') >= 0) {
              wx.showModal({
                title: '需要相册权限',
                content: '保存图片需要允许访问相册，请在设置中开启后重试。',
                confirmText: '去设置',
                confirmColor: '#2F6F5E',
                success: (r) => {
                  if (r.confirm) wx.openSetting()
                }
              })
            } else {
              wx.showToast({ title: '保存失败，请重试', icon: 'none' })
            }
          }
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '生成图片失败', icon: 'none' })
      }
    }, this)
  },

  copyText() {
    const d = this.data
    const lines = [
      '【' + d.ymLabel + '账单】',
      '支出：' + d.expenseText,
      '收入：' + d.incomeText,
      '结余：' + d.balanceText,
      '共 ' + d.count + ' 笔 · 记账 ' + d.days + ' 天',
      '—— 生活记账 · 数据只存在本机'
    ]
    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '账单文字已复制', icon: 'success' })
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.ymLabel + '账单 · 支出 ' + this.data.expenseText,
      path: '/pages/share/share?ym=' + this.data.ym
    }
  }
})
