// 从粘贴/复制文本中识别支付信息，用于「支付后自动记账」
const CATEGORY_RULES = [
  { id: 'food', test: /餐|饭|食|外卖|奶茶|咖啡|火锅|烧烤|早餐|午餐|晚餐|夜宵|零食|面包|饮料|啤酒|水果/ },
  { id: 'transport', test: /地铁|公交|轻轨|打车|滴滴|出租|高铁|火车|飞机|机票|加油|停车|车费|大巴|单车|哈罗/ },
  { id: 'shopping', test: /淘宝|天猫|京东|拼多多|超市|商场|购物|便利店|日用品|纸巾|服饰|美妆/ },
  { id: 'fun', test: /电影|游戏|健身|KTV|演出|门票|会员|视频|音乐|旅行/ },
  { id: 'comm', test: /话费|流量|宽带|电信|移动|联通/ },
  { id: 'medical', test: /药|医院|门诊|体检|挂号/ },
  { id: 'housing', test: /房租|水电|物业|燃气|电费|水费/ },
  { id: 'study', test: /书|课程|培训|文具|学费/ }
]

const MERCHANT_RE = /(?:向|付款给|收款方[:：]|商户[:：]|商户名称[:：])\s*([^\s，,。；;]{1,20})/

function toCents(value) {
  const num = Number(value)
  if (!isFinite(num) || num <= 0 || num > 1000000) return 0
  return Math.round(num * 100)
}

function pickAmount(text) {
  const cleaned = text.replace(/,/g, '')
  const strong = cleaned.match(/(?:实付|支付金额|付款金额|交易金额|消费金额|支付|付款|消费|扣款)\s*[:：]?\s*[¥￥]?\s*(\d{1,7}(?:\.\d{1,2})?)/)
  if (strong) return toCents(strong[1])
  const symbol = cleaned.match(/[¥￥]\s*(\d{1,7}(?:\.\d{1,2})?)/)
  if (symbol) return toCents(symbol[1])
  const yuan = cleaned.match(/(\d{1,7}(?:\.\d{1,2})?)\s*元/)
  if (yuan) return toCents(yuan[1])
  return 0
}

function guessCategory(text, type) {
  if (type === 'income') return 'other_income'
  for (let i = 0; i < CATEGORY_RULES.length; i++) {
    if (CATEGORY_RULES[i].test.test(text)) return CATEGORY_RULES[i].id
  }
  return 'other'
}

function pickNote(text, type) {
  const merchant = text.match(MERCHANT_RE)
  if (merchant && merchant[1]) return merchant[1].slice(0, 16)
  return type === 'income' ? '自动记账收入' : '自动记账'
}

export function parsePaymentText(text) {
  const raw = String(text || '').trim()
  if (!raw || raw.length > 300) return null
  if (!/支付|付款|消费|扣款|转账|收款|退款|实付|账单/.test(raw)) return null
  const amount = pickAmount(raw)
  if (!amount) return null
  const type = /退款|收款|收入|转入|到账/.test(raw) ? 'income' : 'expense'
  return {
    amount,
    type,
    categoryId: guessCategory(raw, type),
    note: pickNote(raw, type),
    source: raw.slice(0, 60)
  }
}

export default { parsePaymentText }
