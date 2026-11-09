const store = require('../../utils/store')

const ICONS = [
  '🍜', '🥟', '🍛', '🍲', '🍪', '🥡', '☕', '🍎',
  '🚌', '🚇', '🚕', '⛽', '🅿️', '🚲', '✈️', '🏃',
  '🛍️', '🧴', '👕', '💻', '💄', '🧸', '🎁', '🧧',
  '🏠', '🔑', '💡', '🏢', '🔧', '🛋️', '🎬', '🍿',
  '🎮', '🎵', '💊', '🏥', '🩺', '📚', '📖', '🎓',
  '✏️', '📱', '💰', '🏆', '📈', '🧰', '✨', '📦', '🏷️', '🐱'
]

const COLORS = [
  '#DE6B47', '#C99A45', '#2E8B6F', '#4A7EBB', '#A968A8', '#8B6B47',
  '#3F8C80', '#CE5C5C', '#D9879F', '#5B8DEF', '#9A948C', '#2F6F5E'
]

Page({
  data: {
    id: '',
    isEdit: false,
    type: 'expense',
    typeLabel: '支出',
    parentId: '',
    parentIndex: 0,
    parentName: '一级分类',
    parentOptions: [],
    canChooseParent: true,
    name: '',
    icon: '🏷️',
    color: '#8C857B',
    hidden: false,
    icons: ICONS,
    colors: COLORS
  },

  onLoad(options) {
    if (options.id) {
      const category = store.getCategory(options.id)
      if (!category) {
        wx.showToast({ title: '分类不存在', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 500)
        return
      }
      const hasChildren = store.getCategories().some((c) => c.parentId === category.id)
      const type = category.type
      const parentId = category.parentId || ''
      this.setData({
        id: category.id,
        isEdit: true,
        type,
        typeLabel: type === 'income' ? '收入' : '支出',
        parentId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        hidden: !!category.hidden,
        canChooseParent: !parentId && !hasChildren
      })
      this.buildParentOptions(type, parentId, category.id)
      return
    }
    const type = options.type === 'income' ? 'income' : 'expense'
    const parentId = options.parentId || ''
    this.setData({
      type,
      typeLabel: type === 'income' ? '收入' : '支出',
      parentId,
      color: type === 'income' ? '#2E8B6F' : '#DE6B47',
      icon: '🏷️'
    })
    this.buildParentOptions(type, parentId, '')
  },

  buildParentOptions(type, parentId, selfId) {
    const tops = store.getCategories()
      .filter((c) => c.type === type && !c.parentId && c.id !== selfId)
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const options = [{ id: '', name: '作为一级分类' }].concat(
      tops.map((c) => ({ id: c.id, name: c.name }))
    )
    const index = Math.max(0, options.findIndex((o) => o.id === parentId))
    this.setData({
      parentOptions: options,
      parentIndex: index,
      parentName: options[index].name,
      parentId: options[index].id
    })
  },

  onName(e) {
    this.setData({ name: e.detail.value })
  },

  onParent(e) {
    const index = Number(e.detail.value)
    const option = this.data.parentOptions[index]
    if (!option) return
    this.setData({ parentIndex: index, parentName: option.name, parentId: option.id })
  },

  selectIcon(e) {
    this.setData({ icon: e.currentTarget.dataset.icon })
  },

  selectColor(e) {
    this.setData({ color: e.currentTarget.dataset.color })
  },

  toggleHidden() {
    this.setData({ hidden: !this.data.hidden })
  },

  save() {
    const name = String(this.data.name || '').trim()
    if (!name) {
      wx.showToast({ title: '请输入分类名称', icon: 'none' })
      return
    }
    if (name.length > 8) {
      wx.showToast({ title: '分类名称最多 8 个字', icon: 'none' })
      return
    }
    const parentId = this.data.canChooseParent ? this.data.parentId : (this.data.isEdit ? this.data.parentId : '')
    if (this.data.isEdit && parentId === this.data.id) {
      wx.showToast({ title: '不能选择自己作为上级', icon: 'none' })
      return
    }
    store.saveCategory({
      id: this.data.id || undefined,
      name,
      type: this.data.type,
      parentId: parentId === this.data.id ? '' : parentId,
      icon: this.data.icon,
      color: this.data.color,
      hidden: this.data.hidden
    })
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 450)
  },

  remove() {
    wx.showModal({
      title: '删除分类',
      content: '删除后不可恢复。已使用该分类的账单需要先改到其他分类。',
      confirmText: '删除',
      confirmColor: '#C4512E',
      success: (res) => {
        if (!res.confirm) return
        const result = store.deleteCategory(this.data.id)
        if (!result.ok) {
          let content = '无法删除该分类'
          if (result.reason === 'children') content = '该分类下还有二级分类，请先删除二级分类。'
          if (result.reason === 'referenced') content = '已有账单使用该分类，请先在明细中修改这些账单的分类。'
          wx.showModal({
            title: '无法删除',
            content,
            showCancel: false,
            confirmColor: '#2F6F5E'
          })
          return
        }
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 450)
      }
    })
  }
})
