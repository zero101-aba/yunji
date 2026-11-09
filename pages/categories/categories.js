const store = require('../../utils/store')

function hexToRgba(hex, alpha) {
  const value = String(hex || '#8C857B').replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

Page({
  data: {
    type: 'expense',
    groups: [],
    totalCount: 0
  },

  onLoad(options) {
    if (options.type === 'income') this.setData({ type: 'income' })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const all = store.getCategories()
    const tops = all
      .filter((c) => c.type === this.data.type && !c.parentId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const groups = tops.map((top) => {
      const children = all
        .filter((c) => c.parentId === top.id)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon, hidden: !!c.hidden }))
      return {
        id: top.id,
        name: top.name,
        icon: top.icon,
        color: top.color,
        tint: hexToRgba(top.color, 0.12),
        hidden: !!top.hidden,
        children
      }
    })
    this.setData({
      groups,
      totalCount: all.filter((c) => c.type === this.data.type).length
    })
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.type) return
    this.setData({ type })
    this.refresh()
  },

  addTop() {
    wx.navigateTo({ url: '/pages/category-edit/category-edit?type=' + this.data.type })
  },

  addChild(e) {
    const parentId = e.currentTarget.dataset.parent
    wx.navigateTo({
      url: '/pages/category-edit/category-edit?type=' + this.data.type + '&parentId=' + parentId
    })
  },

  edit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/category-edit/category-edit?id=' + id })
  },

  move(e) {
    const id = e.currentTarget.dataset.id
    const dir = Number(e.currentTarget.dataset.dir)
    store.reorderCategory(id, dir)
    this.refresh()
  },

  toggleHide(e) {
    const id = e.currentTarget.dataset.id
    const hidden = e.currentTarget.dataset.hidden === 'true' || e.currentTarget.dataset.hidden === true
    store.toggleCategoryHidden(id, !hidden)
    this.refresh()
  }
})
