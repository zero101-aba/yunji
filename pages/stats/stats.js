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

function changeState(current, previous) {
  if (!previous) return { text: '—', state: 'flat' }
  const diff = ((current - previous) / previous) * 100
  if (Math.abs(diff) < 0.05) return { text: '持平', state: 'flat' }
  return {
    text: (diff > 0 ? '+' : '') + diff.toFixed(1) + '%',
    state: diff > 0 ? 'up' : 'down'
  }
}

Page({
  data: {
    period: 'month',
    anchorYm: '',
    anchorYear: '',
    label: '',
    type: 'expense',
    hideAmount: false,
    summary: {},
    compare: {},
    showMom: true,
    showYoy: true,
    yoyLabel: '去年同月',
    ranks: [],
    totalAmountText: '',
    totalCount: 0,
    hasData: false,
    trendTitle: '当月每日支出',
    donutTotalText: '',
    donutLabel: '支出'
  },

  onLoad() {
    const ym = dateUtil.ymOf(dateUtil.todayStr())
    this.periodBills = []
    this.donutSlices = []
    this.trendData = null
    this.setData({
      anchorYm: ym,
      anchorYear: ym.slice(0, 4),
      label: dateUtil.monthLabel(ym)
    })
  },

  onReady() {
    this.ready = true
    this.refresh()
  },

  onShow() {
    const settings = store.getSettings()
    if (this.data.hideAmount !== !!settings.hideAmount) {
      this.setData({ hideAmount: !!settings.hideAmount })
    }
    if (this.ready) this.refresh()
  },

  onUnload() {
    if (this.drawTimer) clearTimeout(this.drawTimer)
  },

  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period === this.data.period) return
    if (period === 'year') {
      const currentYm = dateUtil.ymOf(dateUtil.todayStr())
      let year = this.data.anchorYm.slice(0, 4)
      if (year === currentYm.slice(0, 4)) this.setData({ anchorYm: currentYm })
      this.setData({ period, anchorYear: year, label: year + '年' })
    } else {
      const currentYm = dateUtil.ymOf(dateUtil.todayStr())
      let ym = this.data.anchorYm
      if (ym.slice(0, 4) !== this.data.anchorYear) {
        ym = this.data.anchorYear === currentYm.slice(0, 4) ? currentYm : this.data.anchorYear + '-01'
      }
      this.setData({ period, anchorYm: ym, label: dateUtil.monthLabel(ym) })
    }
    this.refresh()
  },

  shift(e) {
    const dir = Number(e.currentTarget.dataset.dir)
    if (this.data.period === 'month') {
      const ym = dateUtil.addMonths(this.data.anchorYm, dir)
      this.setData({ anchorYm: ym, label: dateUtil.monthLabel(ym) })
    } else {
      const year = String(Number(this.data.anchorYear) + dir)
      this.setData({ anchorYear: year, label: year + '年' })
    }
    this.refresh()
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({ type })
    this.refresh()
  },

  loadPeriodBills() {
    if (this.data.period === 'month') {
      return store.getMonthBills(this.data.anchorYm)
    }
    const year = this.data.anchorYear
    return store.allBills().filter((b) => (b.date || '').slice(0, 4) === year)
  },

  totalsOf(list) {
    let income = 0
    let expense = 0
    list.forEach((b) => {
      if (b.type === 'income') income += Number(b.amount) || 0
      else if (b.type === 'expense') expense += Number(b.amount) || 0
    })
    return { income, expense, balance: income - expense }
  },

  refresh() {
    const hide = this.data.hideAmount
    const bills = this.loadPeriodBills()
    this.periodBills = bills
    const totals = this.totalsOf(bills)
    const isMonth = this.data.period === 'month'
    const days = isMonth
      ? dateUtil.daysElapsed(this.data.anchorYm)
      : this.daysOfYear(this.data.anchorYear)
    const avg = days > 0 ? Math.round(totals.expense / days) : 0

    // 对比
    let mom = { text: '—', state: 'flat' }
    let yoy = { text: '—', state: 'flat' }
    if (isMonth) {
      const prevYm = dateUtil.addMonths(this.data.anchorYm, -1)
      const prevTotals = this.totalsOf(store.getMonthBills(prevYm))
      mom = changeState(totals.expense, prevTotals.expense)
      const lastYearYm = (Number(this.data.anchorYm.slice(0, 4)) - 1) + '-' + this.data.anchorYm.slice(5, 7)
      const yoyTotals = this.totalsOf(store.getMonthBills(lastYearYm))
      yoy = changeState(totals.expense, yoyTotals.expense)
    } else {
      const prevYear = String(Number(this.data.anchorYear) - 1)
      const prevTotals = this.totalsOf(store.allBills().filter((b) => (b.date || '').slice(0, 4) === prevYear))
      yoy = changeState(totals.expense, prevTotals.expense)
    }

    // 分类排行
    const categories = store.getCategories()
    const catMap = {}
    categories.forEach((c) => { catMap[c.id] = c })
    const map = {}
    bills.forEach((bill) => {
      if (bill.type !== this.data.type) return
      const cat = catMap[bill.categoryId]
      const key = cat ? (cat.parentId || cat.id) : '__other__'
      const top = cat
        ? (cat.parentId ? catMap[cat.parentId] : cat)
        : null
      if (!map[key]) {
        map[key] = {
          id: key,
          name: top ? top.name : '未分类',
          icon: top ? top.icon : '🏷️',
          color: top ? top.color : '#9A948C',
          amount: 0,
          count: 0,
          clickable: true
        }
      }
      map[key].amount += bill.amount
      map[key].count += 1
    })
    const all = Object.keys(map).map((k) => map[k]).sort((a, b) => b.amount - a.amount)
    let top8 = all.slice(0, 8)
    const rest = all.slice(8)
    if (rest.length) {
      top8 = top8.concat([{
        id: '__other_group__',
        name: '其他 ' + rest.length + ' 类',
        icon: '…',
        color: '#9A948C',
        amount: rest.reduce((sum, r) => sum + r.amount, 0),
        count: rest.reduce((sum, r) => sum + r.count, 0),
        clickable: false
      }])
    }
    const totalTypeAmount = all.reduce((sum, r) => sum + r.amount, 0)
    const ranks = top8.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      tint: hexToRgba(r.color, 0.13),
      amountText: money.money(r.amount, hide),
      percentText: money.percentText(r.amount, totalTypeAmount),
      percent: totalTypeAmount ? (r.amount / totalTypeAmount) * 100 : 0,
      width: totalTypeAmount ? Math.max(2, (r.amount / totalTypeAmount) * 100) : 0,
      count: r.count,
      clickable: r.clickable
    }))
    this.donutSlices = top8.map((r) => ({
      value: r.amount,
      color: r.color,
      percent: totalTypeAmount ? (r.amount / totalTypeAmount) * 100 : 0
    }))

    // 趋势
    const trendData = this.buildTrend(bills)
    this.trendData = trendData

    this.setData({
      summary: {
        expenseText: money.money(totals.expense, hide),
        incomeText: money.money(totals.income, hide),
        balanceText: money.money(totals.balance, hide),
        avgText: days > 0 ? money.money(avg, hide) : '—'
      },
      compare: {
        momText: mom.text,
        momState: mom.state,
        yoyText: yoy.text,
        yoyState: yoy.state,
        yoyLabel: isMonth ? '去年同月' : '上年'
      },
      showMom: isMonth,
      ranks,
      totalAmountText: money.money(totalTypeAmount, hide),
      totalCount: all.reduce((sum, r) => sum + r.count, 0),
      hasData: totalTypeAmount > 0,
      trendTitle: isMonth ? '当月每日支出' : '全年每月支出',
      donutLabel: this.data.type === 'expense' ? '支出' : '收入',
      donutTotalText: hide ? '****' : money.formatCents(totalTypeAmount)
    }, () => {
      this.scheduleDraw()
    })
  },

  daysOfYear(year) {
    const today = dateUtil.todayStr()
    if (today.slice(0, 4) === year) {
      const start = new Date(Number(year), 0, 1)
      const now = new Date(today.replace(/-/g, '/'))
      return Math.max(1, Math.floor((now - start) / 86400000) + 1)
    }
    if (Number(year) < Number(today.slice(0, 4))) {
      return (Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0)) ? 366 : 365
    }
    return 0
  },

  buildTrend(bills) {
    if (this.data.period === 'month') {
      const n = dateUtil.daysInMonth(this.data.anchorYm)
      const values = new Array(n).fill(0)
      bills.forEach((b) => {
        if (b.type !== 'expense') return
        const day = Number((b.date || '').slice(8, 10))
        if (day >= 1 && day <= n) values[day - 1] += b.amount
      })
      return { mode: 'bar', labels: values.map((v, i) => String(i + 1)), values }
    }
    const values = new Array(12).fill(0)
    bills.forEach((b) => {
      if (b.type !== 'expense') return
      const month = Number((b.date || '').slice(5, 7))
      if (month >= 1 && month <= 12) values[month - 1] += b.amount
    })
    return { mode: 'line', labels: values.map((v, i) => String(i + 1)), values }
  },

  scheduleDraw() {
    if (!this.ready) return
    if (this.drawTimer) clearTimeout(this.drawTimer)
    this.drawTimer = setTimeout(() => {
      this.drawDonut()
      this.drawTrend()
    }, 60)
  },

  initCanvas(id, callback) {
    wx.createSelectorQuery()
      .in(this)
      .select('#' + id)
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
        ctx.clearRect(0, 0, width, height)
        callback(ctx, width, height)
      })
  },

  drawDonut() {
    const slices = this.donutSlices || []
    this.initCanvas('donut', (ctx, width, height) => {
      const cx = width / 2
      const cy = height / 2
      const outer = Math.min(width, height) / 2 - 6
      const inner = outer * 0.62
      const radius = (outer + inner) / 2
      const band = outer - inner

      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.lineWidth = band
      ctx.strokeStyle = '#EFE9DF'
      ctx.stroke()

      const sum = slices.reduce((s, item) => s + item.value, 0)
      if (sum > 0) {
        let start = -Math.PI / 2
        slices.forEach((slice) => {
          const angle = (Math.PI * 2 * slice.percent) / 100
          if (angle <= 0) return
          const gap = slices.length > 1 ? 0.02 : 0
          ctx.beginPath()
          ctx.arc(cx, cy, radius, start + gap / 2, start + angle - gap / 2)
          ctx.lineWidth = band
          ctx.strokeStyle = slice.color
          ctx.stroke()
          start += angle
        })
      }

      ctx.textAlign = 'center'
      ctx.fillStyle = '#8C857B'
      ctx.font = '11px sans-serif'
      ctx.fillText(this.data.donutLabel + '合计', cx, cy - 14)
      ctx.fillStyle = '#26231F'
      const text = this.data.donutTotalText || '0.00'
      ctx.font = 'bold ' + (text.length > 8 ? 15 : 19) + 'px sans-serif'
      ctx.fillText(text, cx, cy + 12)
      if (!this.data.hasData) {
        ctx.fillStyle = '#B3ABA0'
        ctx.font = '11px sans-serif'
        ctx.fillText('暂无数据', cx, cy + 34)
      }
    })
  },

  drawTrend() {
    const trend = this.trendData
    if (!trend) return
    this.initCanvas('trend', (ctx, width, height) => {
      const left = 8
      const right = 8
      const top = 26
      const bottom = 22
      const plotW = width - left - right
      const plotH = height - top - bottom
      const values = trend.values
      const max = Math.max.apply(null, values.concat([1]))

      ctx.strokeStyle = '#EFE9DF'
      ctx.lineWidth = 1
      for (let i = 0; i <= 3; i++) {
        const y = top + (plotH / 3) * i
        ctx.beginPath()
        ctx.moveTo(left, y)
        ctx.lineTo(width - right, y)
        ctx.stroke()
      }

      ctx.textAlign = 'left'
      ctx.fillStyle = '#A59D91'
      ctx.font = '9px sans-serif'
      ctx.fillText(this.data.hideAmount ? '****' : money.formatCents(max), left, top - 10)

      if (values.length === 0) return

      if (trend.mode === 'bar') {
        const step = plotW / values.length
        const barW = Math.max(2, step * 0.55)
        values.forEach((value, i) => {
          const h = max > 0 ? (value / max) * plotH : 0
          const x = left + step * i + (step - barW) / 2
          const y = top + plotH - h
          ctx.fillStyle = value > 0 ? '#DE6B47' : '#EFE9DF'
          ctx.fillRect(x, value > 0 ? y : top + plotH - 2, barW, value > 0 ? Math.max(2, h) : 2)
        })
        ctx.textAlign = 'center'
        ctx.fillStyle = '#A59D91'
        ctx.font = '9px sans-serif'
        const n = values.length
        const labelDays = [1, 5, 10, 15, 20, 25, n]
        labelDays.forEach((day) => {
          if (day < 1 || day > n) return
          const x = left + step * (day - 1) + step / 2
          ctx.fillText(String(day), x, height - 8)
        })
      } else {
        const step = values.length > 1 ? plotW / (values.length - 1) : plotW
        ctx.beginPath()
        values.forEach((value, i) => {
          const x = left + step * i
          const y = top + plotH - (value / max) * plotH
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = '#2F6F5E'
        ctx.lineWidth = 2
        ctx.stroke()
        values.forEach((value, i) => {
          const x = left + step * i
          const y = top + plotH - (value / max) * plotH
          ctx.beginPath()
          ctx.arc(x, y, value > 0 ? 2.6 : 1.6, 0, Math.PI * 2)
          ctx.fillStyle = value > 0 ? '#2F6F5E' : '#DAD4C9'
          ctx.fill()
        })
        ctx.textAlign = 'center'
        ctx.fillStyle = '#A59D91'
        ctx.font = '9px sans-serif'
        values.forEach((value, i) => {
          const x = left + step * i
          ctx.fillText((i + 1) + '月', x, height - 8)
        })
      }
    })
  },

  openCategory(e) {
    const id = e.currentTarget.dataset.id
    const clickable = e.currentTarget.dataset.clickable
    if (clickable === false || clickable === 'false') return
    if (!this.data.hasData) return
    const anchor = this.data.period === 'month' ? this.data.anchorYm : this.data.anchorYear
    wx.navigateTo({
      url: '/pages/catstats/catstats?period=' + this.data.period +
        '&anchor=' + anchor +
        '&type=' + this.data.type +
        '&cat=' + id
    })
  },

  openShare() {
    wx.navigateTo({ url: '/pages/share/share?ym=' + this.data.anchorYm })
  }
})
