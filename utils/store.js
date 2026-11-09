const dateUtil = require('./date')

const VERSION = '1.0.0'
const KEYS = {
  accounts: 'app_accounts',
  categories: 'app_categories',
  billsIndex: 'app_bills_index',
  bills: (ym) => 'app_bills_' + ym.replace('-', '_'),
  budgets: 'app_budgets',
  settings: 'app_settings',
  meta: 'app_meta',
  templates: 'app_templates'
}

const DEFAULT_SETTINGS = {
  defaultPage: 'record',
  hideAmount: false,
  lastAccountId: '',
  recentCategory: { expense: [], income: [] },
  budgetAlert: {},
  reminder: false
}

const SEED_ACCOUNTS = [
  { id: 'acc_cash', name: '现金', type: 'cash', icon: '💵', initBalance: 0, balance: 0, sort: 1 },
  { id: 'acc_wechat', name: '微信零钱', type: 'wechat', icon: '💚', initBalance: 0, balance: 0, sort: 2 },
  { id: 'acc_alipay', name: '支付宝', type: 'alipay', icon: '💙', initBalance: 0, balance: 0, sort: 3 },
  { id: 'acc_bank', name: '银行卡', type: 'bank', icon: '🏦', initBalance: 0, balance: 0, sort: 4 }
]

const EXPENSE_TREE = [
  {
    id: 'food', name: '餐饮', icon: '🍜', color: '#DE6B47',
    children: [
      { id: 'food_breakfast', name: '早餐', icon: '🥟' },
      { id: 'food_lunch', name: '午餐', icon: '🍛' },
      { id: 'food_dinner', name: '晚餐', icon: '🍲' },
      { id: 'food_snack', name: '零食', icon: '🍪' },
      { id: 'food_takeout', name: '外卖', icon: '🥡' }
    ]
  },
  {
    id: 'transport', name: '交通', icon: '🚌', color: '#4A7EBB',
    children: [
      { id: 'transport_metro', name: '公交地铁', icon: '🚇' },
      { id: 'transport_taxi', name: '打车', icon: '🚕' },
      { id: 'transport_oil', name: '加油', icon: '⛽' },
      { id: 'transport_park', name: '停车', icon: '🅿️' }
    ]
  },
  {
    id: 'shopping', name: '购物', icon: '🛍️', color: '#A968A8',
    children: [
      { id: 'shopping_daily', name: '日用品', icon: '🧴' },
      { id: 'shopping_clothes', name: '服饰', icon: '👕' },
      { id: 'shopping_digital', name: '数码', icon: '💻' },
      { id: 'shopping_beauty', name: '美妆', icon: '💄' }
    ]
  },
  {
    id: 'housing', name: '居住', icon: '🏠', color: '#8B6B47',
    children: [
      { id: 'housing_rent', name: '房租', icon: '🔑' },
      { id: 'housing_utility', name: '水电', icon: '💡' },
      { id: 'housing_property', name: '物业', icon: '🏢' },
      { id: 'housing_repair', name: '维修', icon: '🔧' }
    ]
  },
  {
    id: 'fun', name: '娱乐', icon: '🎬', color: '#C99A45',
    children: [
      { id: 'fun_movie', name: '电影', icon: '🍿' },
      { id: 'fun_game', name: '游戏', icon: '🎮' },
      { id: 'fun_travel', name: '旅行', icon: '✈️' },
      { id: 'fun_sport', name: '运动', icon: '🏃' }
    ]
  },
  {
    id: 'medical', name: '医疗', icon: '💊', color: '#CE5C5C',
    children: [
      { id: 'medical_medicine', name: '药品', icon: '💊' },
      { id: 'medical_clinic', name: '门诊', icon: '🏥' },
      { id: 'medical_check', name: '体检', icon: '🩺' }
    ]
  },
  {
    id: 'study', name: '学习', icon: '📚', color: '#3F8C80',
    children: [
      { id: 'study_book', name: '书籍', icon: '📖' },
      { id: 'study_course', name: '课程', icon: '🎓' },
      { id: 'study_stationery', name: '文具', icon: '✏️' }
    ]
  },
  { id: 'comm', name: '通讯', icon: '📱', color: '#5B8DEF', children: [] },
  {
    id: 'social', name: '人情', icon: '🎁', color: '#D9879F',
    children: [
      { id: 'social_gift', name: '礼物', icon: '🎁' },
      { id: 'social_red', name: '红包', icon: '🧧' },
      { id: 'social_treat', name: '请客', icon: '🍽️' }
    ]
  },
  { id: 'other', name: '其他', icon: '📦', color: '#9A948C', children: [] }
]

const INCOME_TREE = [
  { id: 'salary', name: '工资', icon: '💰', color: '#2E8B6F', children: [] },
  { id: 'bonus', name: '奖金', icon: '🏆', color: '#C99A45', children: [] },
  { id: 'invest', name: '理财', icon: '📈', color: '#4A7EBB', children: [] },
  { id: 'parttime', name: '兼职', icon: '🧰', color: '#8B6B47', children: [] },
  { id: 'redpacket', name: '红包', icon: '🧧', color: '#CE5C5C', children: [] },
  { id: 'other_income', name: '其他', icon: '✨', color: '#8C857B', children: [] }
]

function buildSeedCategories() {
  const list = []
  EXPENSE_TREE.forEach((top, i) => {
    list.push({
      id: top.id,
      name: top.name,
      type: 'expense',
      parentId: '',
      icon: top.icon,
      color: top.color,
      hidden: false,
      sort: i + 1,
      builtin: true
    })
    ;(top.children || []).forEach((child, j) => {
      list.push({
        id: child.id,
        name: child.name,
        type: 'expense',
        parentId: top.id,
        icon: child.icon,
        color: top.color,
        hidden: false,
        sort: j + 1,
        builtin: true
      })
    })
  })
  INCOME_TREE.forEach((top, i) => {
    list.push({
      id: top.id,
      name: top.name,
      type: 'income',
      parentId: '',
      icon: top.icon,
      color: top.color,
      hidden: false,
      sort: i + 1,
      builtin: true
    })
    ;(top.children || []).forEach((child, j) => {
      list.push({
        id: child.id,
        name: child.name,
        type: 'income',
        parentId: top.id,
        icon: child.icon,
        color: top.color,
        hidden: false,
        sort: j + 1,
        builtin: true
      })
    })
  })
  return list
}

function hasKey(key) {
  try {
    return wx.getStorageInfoSync().keys.indexOf(key) >= 0
  } catch (e) {
    return false
  }
}

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    if (value === '' || value === undefined || value === null) return fallback
    return value
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.error('写入本地存储失败', key, e)
    return false
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (e) {
    return false
  }
}

/* ---------------- 初始化 ---------------- */
function init() {
  const hadMeta = hasKey(KEYS.meta)
  const meta = read(KEYS.meta, null)
  if (!hadMeta) {
    write(KEYS.categories, buildSeedCategories())
    write(KEYS.accounts, SEED_ACCOUNTS)
    write(KEYS.billsIndex, [])
    write(KEYS.budgets, {})
    write(KEYS.settings, DEFAULT_SETTINGS)
    write(KEYS.templates, [])
    write(KEYS.meta, {
      version: VERSION,
      initialized: true,
      createdAt: Date.now(),
      guideSeen: false,
      lastBackupAt: 0
    })
    return
  }
  if (!meta || !meta.initialized) {
    write(KEYS.meta, {
      version: VERSION,
      initialized: true,
      createdAt: Date.now(),
      guideSeen: false,
      lastBackupAt: 0
    })
  }
  if (!hasKey(KEYS.categories)) write(KEYS.categories, buildSeedCategories())
  if (!hasKey(KEYS.accounts)) write(KEYS.accounts, SEED_ACCOUNTS)
  if (!hasKey(KEYS.billsIndex)) write(KEYS.billsIndex, [])
  if (!hasKey(KEYS.budgets)) write(KEYS.budgets, {})
  if (!hasKey(KEYS.settings)) write(KEYS.settings, DEFAULT_SETTINGS)
  if (!hasKey(KEYS.templates)) write(KEYS.templates, [])
}

function getMeta() {
  return read(KEYS.meta, {})
}

function saveMeta(patch) {
  const meta = Object.assign({}, getMeta(), patch)
  write(KEYS.meta, meta)
  return meta
}

/* ---------------- 设置 ---------------- */
function getSettings() {
  const saved = read(KEYS.settings, {}) || {}
  const merged = Object.assign({}, DEFAULT_SETTINGS, saved)
  merged.recentCategory = Object.assign(
    { expense: [], income: [] },
    saved.recentCategory || {}
  )
  merged.budgetAlert = Object.assign({}, saved.budgetAlert || {})
  return merged
}

function saveSettings(patch) {
  const next = Object.assign({}, getSettings(), patch)
  write(KEYS.settings, next)
  return next
}

function getRecentCategory(type) {
  const settings = getSettings()
  const ids = (settings.recentCategory[type] || []).slice(0, 8)
  const categories = getCategories()
  return ids.filter((id) => categories.some((c) => c.id === id && !c.parentId))
}

function touchRecentCategory(categoryId, type) {
  const categories = getCategories()
  const category = categories.find((c) => c.id === categoryId)
  if (!category) return
  const topId = category.parentId || category.id
  const settings = getSettings()
  const recent = Object.assign({ expense: [], income: [] }, settings.recentCategory)
  const list = (recent[type] || []).filter((id) => id !== topId)
  list.unshift(topId)
  recent[type] = list.slice(0, 8)
  saveSettings({ recentCategory: recent })
}

/* ---------------- 账户 ---------------- */
function getAccounts() {
  const list = read(KEYS.accounts, [])
  return (Array.isArray(list) ? list : []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

function getAccount(id) {
  return getAccounts().find((a) => a.id === id) || null
}

function accountName(id) {
  const account = getAccount(id)
  return account ? account.name : '未知账户'
}

function saveAccount(payload) {
  const accounts = getAccounts()
  const index = accounts.findIndex((a) => a.id === payload.id)
  if (index >= 0) {
    const old = accounts[index]
    const newInit = Number(payload.initBalance) || 0
    const updated = Object.assign({}, old, payload, {
      initBalance: newInit,
      balance: (Number(old.balance) || 0) + (newInit - (Number(old.initBalance) || 0))
    })
    accounts[index] = updated
    write(KEYS.accounts, accounts)
    return updated
  }
  const sort = accounts.reduce((max, a) => Math.max(max, a.sort || 0), 0) + 1
  const initBalance = Number(payload.initBalance) || 0
  const created = Object.assign({}, payload, {
    id: payload.id || 'acc_' + Date.now().toString(36) + Math.floor(Math.random() * 100),
    initBalance,
    balance: initBalance,
    sort
  })
  accounts.push(created)
  write(KEYS.accounts, accounts)
  return created
}

function accountUsed(id) {
  return allBills().some((b) => b.accountId === id || b.toAccountId === id)
}

function deleteAccount(id) {
  if (accountUsed(id)) return { ok: false, reason: 'referenced' }
  const accounts = getAccounts().filter((a) => a.id !== id)
  write(KEYS.accounts, accounts)
  const settings = getSettings()
  if (settings.lastAccountId === id) {
    saveSettings({ lastAccountId: accounts.length ? accounts[0].id : '' })
  }
  return { ok: true }
}

function applyAccountDelta(bill, direction) {
  if (!bill || !bill.amount) return
  const accounts = getAccounts()
  let changed = false
  const amount = Number(bill.amount) || 0
  const update = (id, delta) => {
    if (!id) return
    const target = accounts.find((a) => a.id === id)
    if (!target) return
    target.balance = (Number(target.balance) || 0) + delta
    changed = true
  }
  if (bill.type === 'expense') update(bill.accountId, -amount * direction)
  else if (bill.type === 'income') update(bill.accountId, amount * direction)
  else if (bill.type === 'transfer') {
    update(bill.accountId, -amount * direction)
    update(bill.toAccountId, amount * direction)
  }
  if (changed) write(KEYS.accounts, accounts)
}

/* ---------------- 分类 ---------------- */
function getCategories() {
  const list = read(KEYS.categories, [])
  return (Array.isArray(list) ? list : []).slice()
}

function getCategoriesByType(type) {
  return getCategories()
    .filter((c) => c.type === type)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
}

function getCategory(id) {
  return getCategories().find((c) => c.id === id) || null
}

function categoryDisplayName(id) {
  const categories = getCategories()
  const category = categories.find((c) => c.id === id)
  if (!category) return '未分类'
  if (category.parentId) {
    const parent = categories.find((c) => c.id === category.parentId)
    return parent ? parent.name + ' · ' + category.name : category.name
  }
  return category.name
}

function saveCategory(payload) {
  const categories = getCategories()
  const index = categories.findIndex((c) => c.id === payload.id)
  if (index >= 0) {
    let next = Object.assign({}, categories[index], payload)
    if (next.parentId) {
      const parent = categories.find((c) => c.id === next.parentId)
      if (parent) next.color = parent.color
    }
    categories[index] = next
    write(KEYS.categories, categories)
    return next
  }
  const parentId = payload.parentId || ''
  let color = payload.color
  if (parentId) {
    const parent = categories.find((c) => c.id === parentId)
    if (parent) color = parent.color
  }
  const siblings = categories.filter((c) => c.type === payload.type && (c.parentId || '') === parentId)
  const sort = siblings.reduce((max, c) => Math.max(max, c.sort || 0), 0) + 1
  const created = {
    id: payload.id || 'cat_' + Date.now().toString(36) + Math.floor(Math.random() * 100),
    name: payload.name,
    type: payload.type,
    parentId,
    icon: payload.icon || '🏷️',
    color: color || '#8C857B',
    hidden: !!payload.hidden,
    sort,
    builtin: false
  }
  categories.push(created)
  write(KEYS.categories, categories)
  return created
}

function categoryUsed(id) {
  return allBills().some((b) => b.categoryId === id)
}

function deleteCategory(id) {
  const categories = getCategories()
  const target = categories.find((c) => c.id === id)
  if (!target) return { ok: false, reason: 'missing' }
  if (categories.some((c) => c.parentId === id)) return { ok: false, reason: 'children' }
  if (categoryUsed(id)) return { ok: false, reason: 'referenced' }
  write(KEYS.categories, categories.filter((c) => c.id !== id))
  const budgets = getBudgets()
  Object.keys(budgets).forEach((ym) => {
    const budget = budgets[ym]
    if (budget && budget.byCategory && budget.byCategory[id]) {
      delete budget.byCategory[id]
    }
  })
  write(KEYS.budgets, budgets)
  const settings = getSettings()
  const recent = Object.assign({ expense: [], income: [] }, settings.recentCategory)
  recent.expense = (recent.expense || []).filter((x) => x !== id)
  recent.income = (recent.income || []).filter((x) => x !== id)
  saveSettings({ recentCategory: recent })
  return { ok: true }
}

function reorderCategory(id, direction) {
  const categories = getCategories()
  const target = categories.find((c) => c.id === id)
  if (!target) return false
  const siblings = categories
    .filter((c) => c.type === target.type && (c.parentId || '') === (target.parentId || ''))
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
  const index = siblings.findIndex((c) => c.id === id)
  const otherIndex = index + direction
  if (otherIndex < 0 || otherIndex >= siblings.length) return false
  const other = siblings[otherIndex]
  const targetSort = target.sort
  target.sort = other.sort
  other.sort = targetSort
  write(KEYS.categories, categories)
  return true
}

function toggleCategoryHidden(id, hidden) {
  const categories = getCategories()
  const target = categories.find((c) => c.id === id)
  if (!target) return
  target.hidden = !!hidden
  write(KEYS.categories, categories)
}

/* ---------------- 账单 ---------------- */
function getBillMonths() {
  const list = read(KEYS.billsIndex, [])
  if (!Array.isArray(list)) return []
  return list.slice().sort().reverse()
}

function readMonth(ym) {
  const list = read(KEYS.bills(ym), [])
  return Array.isArray(list) ? list : []
}

function writeMonth(ym, list) {
  const months = getBillMonths()
  if (!list || list.length === 0) {
    remove(KEYS.bills(ym))
    write(KEYS.billsIndex, months.filter((m) => m !== ym))
    return
  }
  write(KEYS.bills(ym), list)
  if (months.indexOf(ym) === -1) {
    months.push(ym)
    months.sort().reverse()
    write(KEYS.billsIndex, months)
  }
}

function sortBills(list) {
  return list.slice().sort((a, b) => {
    const ka = (a.date || '') + ' ' + (a.time || '')
    const kb = (b.date || '') + ' ' + (b.time || '')
    if (ka !== kb) return kb.localeCompare(ka)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

function getMonthBills(ym) {
  return sortBills(readMonth(ym))
}

function allBills() {
  const result = []
  getBillMonths().forEach((ym) => {
    readMonth(ym).forEach((bill) => {
      result.push(Object.assign({ _ym: ym }, bill))
    })
  })
  return sortBills(result)
}

function monthTotals(ym) {
  const bills = readMonth(ym)
  let income = 0
  let expense = 0
  bills.forEach((b) => {
    if (b.type === 'income') income += Number(b.amount) || 0
    else if (b.type === 'expense') expense += Number(b.amount) || 0
  })
  return { income, expense, balance: income - expense }
}

function findBill(id) {
  const months = getBillMonths()
  for (let i = 0; i < months.length; i++) {
    const ym = months[i]
    const list = readMonth(ym)
    const bill = list.find((b) => b.id === id)
    if (bill) return { bill, ym }
  }
  return null
}

function makeBillId(dateStr) {
  return 'bl_' + String(dateStr || '').replace(/-/g, '') + '_' +
    Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 100)
}

function normalizeBill(payload, base) {
  const bill = Object.assign({}, base || {}, payload)
  bill.type = bill.type || 'expense'
  bill.amount = Math.round(Number(bill.amount) || 0)
  bill.date = bill.date || dateUtil.todayStr()
  bill.time = bill.time || dateUtil.nowTime()
  bill.note = String(bill.note || '').slice(0, 50)
  bill.images = Array.isArray(bill.images) ? bill.images.slice(0, 3) : []
  bill.categoryId = bill.type === 'transfer' ? '' : (bill.categoryId || '')
  bill.toAccountId = bill.type === 'transfer' ? (bill.toAccountId || '') : ''
  bill.createdAt = base ? (base.createdAt || Date.now()) : Date.now()
  bill.id = base ? base.id : makeBillId(bill.date)
  return bill
}

function addBill(payload) {
  const bill = normalizeBill(payload, null)
  if (bill.amount <= 0) return { ok: false, reason: 'amount' }
  if (bill.type !== 'transfer' && !bill.categoryId) return { ok: false, reason: 'category' }
  if (!bill.accountId) return { ok: false, reason: 'account' }
  if (bill.type === 'transfer' && (!bill.toAccountId || bill.toAccountId === bill.accountId)) {
    return { ok: false, reason: 'transfer' }
  }
  const ym = dateUtil.ymOf(bill.date)
  const list = readMonth(ym)
  list.push(bill)
  writeMonth(ym, list)
  applyAccountDelta(bill, 1)
  if (bill.type !== 'transfer') touchRecentCategory(bill.categoryId, bill.type)
  if (bill.accountId) saveSettings({ lastAccountId: bill.accountId })
  return { ok: true, bill }
}

function updateBill(id, payload) {
  const found = findBill(id)
  if (!found) return { ok: false, reason: 'missing' }
  const oldBill = found.bill
  const newBill = normalizeBill(payload, oldBill)
  if (newBill.amount <= 0) return { ok: false, reason: 'amount' }
  if (newBill.type !== 'transfer' && !newBill.categoryId) return { ok: false, reason: 'category' }
  if (newBill.type === 'transfer' && (!newBill.toAccountId || newBill.toAccountId === newBill.accountId)) {
    return { ok: false, reason: 'transfer' }
  }
  const oldYm = found.ym
  const newYm = dateUtil.ymOf(newBill.date)
  if (oldYm === newYm) {
    const list = readMonth(oldYm).map((b) => (b.id === id ? newBill : b))
    writeMonth(oldYm, list)
  } else {
    writeMonth(oldYm, readMonth(oldYm).filter((b) => b.id !== id))
    const target = readMonth(newYm)
    target.push(newBill)
    writeMonth(newYm, target)
  }
  applyAccountDelta(oldBill, -1)
  applyAccountDelta(newBill, 1)
  if (newBill.type !== 'transfer') touchRecentCategory(newBill.categoryId, newBill.type)
  return { ok: true, bill: newBill }
}

function deleteBill(id) {
  const found = findBill(id)
  if (!found) return { ok: false }
  writeMonth(found.ym, readMonth(found.ym).filter((b) => b.id !== id))
  applyAccountDelta(found.bill, -1)
  return { ok: true, bill: found.bill }
}

function clearBills() {
  try {
    const keys = wx.getStorageInfoSync().keys || []
    keys.forEach((key) => {
      if (key.indexOf('app_bills_') === 0) remove(key)
    })
  } catch (e) {
    getBillMonths().forEach((ym) => remove(KEYS.bills(ym)))
  }
  write(KEYS.billsIndex, [])
  const accounts = getAccounts().map((a) => Object.assign({}, a, { balance: Number(a.initBalance) || 0 }))
  write(KEYS.accounts, accounts)
  const settings = getSettings()
  settings.budgetAlert = {}
  saveSettings({ budgetAlert: {} })
  return true
}

/* ---------------- 预算 ---------------- */
function getBudgets() {
  const data = read(KEYS.budgets, {})
  return data && typeof data === 'object' ? data : {}
}

function getBudget(ym) {
  const budgets = getBudgets()
  return budgets[ym] || { total: 0, byCategory: {} }
}

function saveBudget(ym, data) {
  const budgets = getBudgets()
  budgets[ym] = {
    total: Math.max(0, Math.round(Number(data.total) || 0)),
    byCategory: data.byCategory || {}
  }
  write(KEYS.budgets, budgets)
}

function getBudgetSummary(ym) {
  const budget = getBudget(ym)
  const totals = monthTotals(ym)
  const total = Number(budget.total) || 0
  const used = totals.expense
  const percent = total > 0 ? (used / total) * 100 : 0
  return {
    total,
    used,
    remain: total - used,
    percent,
    over: total > 0 && used > total,
    hasBudget: total > 0
  }
}

function checkBudgetAlert(ym) {
  const budget = getBudget(ym)
  if (!budget.total) return null
  const used = monthTotals(ym).expense
  const percent = (used / budget.total) * 100
  const settings = getSettings()
  const flags = Object.assign({}, (settings.budgetAlert || {})[ym] || {})
  let threshold = null
  if (percent >= 100 && !flags[100]) threshold = 100
  else if (percent >= 80 && !flags[80]) threshold = 80
  if (!threshold) return null
  flags[80] = true
  if (threshold === 100) flags[100] = true
  const alert = Object.assign({}, settings.budgetAlert || {})
  alert[ym] = flags
  saveSettings({ budgetAlert: alert })
  return { threshold, percent, used, total: budget.total }
}

/* ---------------- 快捷模板 ---------------- */
function getTemplates() {
  const list = read(KEYS.templates, [])
  return Array.isArray(list) ? list : []
}

function saveTemplate(payload) {
  const list = getTemplates()
  const index = list.findIndex((t) => t.id === payload.id)
  const item = {
    id: payload.id || 'tpl_' + Date.now().toString(36),
    name: String(payload.name || '').slice(0, 12) || '常用模板',
    type: payload.type || 'expense',
    amount: Math.round(Number(payload.amount) || 0),
    categoryId: payload.categoryId || '',
    accountId: payload.accountId || '',
    note: String(payload.note || '').slice(0, 50)
  }
  if (index >= 0) list[index] = item
  else list.unshift(item)
  write(KEYS.templates, list)
  return item
}

function deleteTemplate(id) {
  write(KEYS.templates, getTemplates().filter((t) => t.id !== id))
}

/* ---------------- 备份 / 恢复 / 容量 ---------------- */
function exportBackup() {
  const bills = {}
  getBillMonths().forEach((ym) => {
    bills[ym] = readMonth(ym)
  })
  return {
    app: 'life-ledger',
    version: VERSION,
    exportedAt: Date.now(),
    accounts: getAccounts(),
    categories: getCategories(),
    bills,
    budgets: getBudgets(),
    settings: getSettings(),
    templates: getTemplates(),
    meta: getMeta()
  }
}

function importBackup(data) {
  if (!data || data.app !== 'life-ledger' || !data.bills || !Array.isArray(data.accounts) || !Array.isArray(data.categories)) {
    return { ok: false, reason: 'format' }
  }
  try {
    const keys = wx.getStorageInfoSync().keys || []
    keys.forEach((key) => {
      if (key.indexOf('app_bills_') === 0) remove(key)
    })
    const months = Object.keys(data.bills || {}).filter((ym) => Array.isArray(data.bills[ym]))
    months.forEach((ym) => {
      if (data.bills[ym].length) write(KEYS.bills(ym), data.bills[ym])
    })
    write(KEYS.billsIndex, months.slice().sort().reverse())
    write(KEYS.accounts, data.accounts)
    write(KEYS.categories, data.categories)
    write(KEYS.budgets, data.budgets || {})
    write(KEYS.templates, data.templates || [])
    write(KEYS.settings, Object.assign({}, DEFAULT_SETTINGS, data.settings || {}))
    write(KEYS.meta, Object.assign({}, data.meta || {}, {
      initialized: true,
      guideSeen: true,
      version: VERSION,
      restoredAt: Date.now()
    }))
    return { ok: true, count: months.reduce((sum, ym) => sum + data.bills[ym].length, 0) }
  } catch (e) {
    return { ok: false, reason: 'error' }
  }
}

function storageInfo() {
  try {
    const info = wx.getStorageInfoSync()
    return {
      currentSize: info.currentSize || 0,
      limitSize: info.limitSize || 10240,
      keys: info.keys || []
    }
  } catch (e) {
    return { currentSize: 0, limitSize: 10240, keys: [] }
  }
}

module.exports = {
  VERSION,
  KEYS,
  init,
  getMeta,
  saveMeta,
  getSettings,
  saveSettings,
  getRecentCategory,
  touchRecentCategory,

  getAccounts,
  getAccount,
  accountName,
  saveAccount,
  deleteAccount,
  accountUsed,

  getCategories,
  getCategoriesByType,
  getCategory,
  categoryDisplayName,
  saveCategory,
  deleteCategory,
  categoryUsed,
  reorderCategory,
  toggleCategoryHidden,

  getBillMonths,
  readMonth,
  getMonthBills,
  allBills,
  monthTotals,
  findBill,
  addBill,
  updateBill,
  deleteBill,
  clearBills,

  getBudget,
  getBudgets,
  saveBudget,
  getBudgetSummary,
  checkBudgetAlert,

  getTemplates,
  saveTemplate,
  deleteTemplate,

  exportBackup,
  importBackup,
  storageInfo
}
