<script>
import store from './utils/store.js'
import payment from './utils/payment.js'

let clipboardTimer = null
let notifyTimer = null
let lastAuto = null

// 读取原生通知监听服务写入的日志文件，读完即清空
function readNotifyLines() {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const File = plus.android.importClass('java.io.File')
    const FileInputStream = plus.android.importClass('java.io.FileInputStream')
    const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
    const BufferedReader = plus.android.importClass('java.io.BufferedReader')
    const dir = main.getExternalFilesDir(null)
    if (!dir) return []
    const file = new File(dir, 'notify.log')
    if (!file.exists()) return []
    const reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), 'UTF-8'))
    const lines = []
    let line = reader.readLine()
    while (line !== null && line !== undefined) {
      lines.push(String(line))
      line = reader.readLine()
    }
    reader.close()
    file.delete()
    return lines
  } catch (e) {
    return []
  }
  // #endif
  return []
}

// 解析通知日志并自动入账
function recordFromNotifications() {
  let settings = {}
  try {
    settings = store.getSettings()
  } catch (e) {
    return
  }
  if (!settings.autoClipboard) return
  const lines = readNotifyLines()
  if (!lines.length) return
  const accounts = store.getAccounts()
  const account = accounts.find((a) => a.id === settings.lastAccountId) || accounts[0]
  if (!account) return
  let added = 0
  lines.forEach((raw) => {
    const parts = String(raw).split('\t')
    const text = parts.slice(1).join(' ')
    const parsed = payment.parsePaymentText(text)
    if (!parsed) return
    const now = Date.now()
    if (
      lastAuto &&
      now - lastAuto.time < 120000 &&
      lastAuto.amount === parsed.amount &&
      lastAuto.note === parsed.note
    ) {
      return
    }
    const result = store.addBill({
      type: parsed.type,
      amount: parsed.amount,
      categoryId: parsed.categoryId,
      accountId: account.id,
      note: parsed.note
    })
    if (!result.ok) return
    lastAuto = { amount: parsed.amount, note: parsed.note, time: now }
    added++
  })
  if (added > 0) {
    uni.showToast({ title: '已自动记 ' + added + ' 笔', icon: 'none' })
  }
}

// 用户授权后，回到前台时尝试从剪贴板识别刚发生的支付/收款
function checkClipboard() {
  let settings = {}
  try {
    settings = store.getSettings()
  } catch (e) {
    return
  }
  if (!settings.autoClipboard) return
  if (typeof uni.getClipboardData !== 'function') return
  uni.getClipboardData({
    success(res) {
      const text = res && res.data
      if (!text || text === settings.clipboardSeen) return
      const parsed = payment.parsePaymentText(text)
      if (!parsed) return
      store.saveSettings({ clipboardSeen: text })
      const current = store.getSettings()
      const accounts = store.getAccounts()
      const account = accounts.find((a) => a.id === current.lastAccountId) || accounts[0]
      if (!account) return
      // 同一笔支付短时间内可能被重复识别，2 分钟内金额与备注相同则跳过
      const now = Date.now()
      if (
        lastAuto &&
        now - lastAuto.time < 120000 &&
        lastAuto.amount === parsed.amount &&
        lastAuto.note === parsed.note
      ) {
        return
      }
      const result = store.addBill({
        type: parsed.type,
        amount: parsed.amount,
        categoryId: parsed.categoryId,
        accountId: account.id,
        note: parsed.note
      })
      if (!result.ok) return
      lastAuto = { amount: parsed.amount, note: parsed.note, time: now }
      uni.showToast({
        title: (parsed.type === 'income' ? '已自动记收入 ¥' : '已自动记支出 ¥') + (parsed.amount / 100).toFixed(2),
        icon: 'none',
        duration: 2000
      })
    },
    fail() {}
  })
}

export default {
  onLaunch() {
    try {
      store.init()
    } catch (e) {
      console.error('初始化失败', e)
    }
    let settings = {}
    try {
      settings = store.getSettings()
    } catch (e) {
      settings = {}
    }
    this.globalData = {
      defaultPage: settings.defaultPage || 'record',
      justLaunched: true
    }
    if (notifyTimer) clearInterval(notifyTimer)
    notifyTimer = setInterval(recordFromNotifications, 20000)
  },

  onShow() {
    if (clipboardTimer) clearTimeout(clipboardTimer)
    clipboardTimer = setTimeout(checkClipboard, 800)
    setTimeout(recordFromNotifications, 1500)
  },

  onError(err) {
    console.error('运行错误', err)
  }
}
</script>

<style>
page,
uni-page-body {
  --bg: #F6F7F9;
  --card: #FFFFFF;
  --ink: #1F2329;
  --ink-2: #4E5969;
  --muted: #86909C;
  --muted-2: #C9CDD4;
  --line: #F2F3F5;
  --border: #E5E6EB;
  --primary: #00B578;
  --primary-2: #00A76B;
  --primary-soft: #E4F8F0;
  --expense: #FA5151;
  --income: #FF8F1F;
  --income-soft: #FFF3E3;
  --danger-soft: #FDEBEB;
  --gold: #FF8F1F;
  --blue: #3D7FFF;
  --blue-soft: #E8F1FF;
  --purple: #8F6BFF;
  --purple-soft: #F3EDFF;
  --seg: #E9EDF2;
  --cat-bg: #EEF1F5;
  --shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);

  background: #F6F7F9;
  color: #1F2329;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

view,
text,
input,
textarea,
button,
scroll-view,
picker {
  box-sizing: border-box;
}

button {
  padding: 0;
  margin: 0;
  font-size: inherit;
  line-height: inherit;
  background: transparent;
  border-radius: 0;
}

button::after {
  border: none;
}

.num {
  font-family: "DIN Alternate", "Bahnschrift", "SF Pro Display", -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.page-pad {
  padding: 24rpx 32rpx 48rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 28rpx;
  box-shadow: var(--shadow);
}

.row {
  display: flex;
  align-items: center;
}

.between {
  justify-content: space-between;
}

.center {
  justify-content: center;
}

.flex1 {
  flex: 1;
  min-width: 0;
}

.muted {
  color: #86909C;
}

.ink {
  color: #1F2329;
}

.primary {
  color: #00B578;
}

.expense {
  color: #FA5151;
}

.income {
  color: #00A76B;
}

.bold {
  font-weight: 600;
}

.h1 {
  font-size: 40rpx;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.h2 {
  font-size: 32rpx;
  font-weight: 600;
}

.small {
  font-size: 24rpx;
}

.tiny {
  font-size: 22rpx;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.divider {
  height: 1rpx;
  background: #E5E6EB;
}

.page-title {
  padding: 8rpx 4rpx 24rpx;
}

.page-title .title {
  font-size: 44rpx;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.page-title .sub {
  margin-top: 6rpx;
  color: #86909C;
  font-size: 24rpx;
}

/* 分段控件 */
.seg {
  display: flex;
  background: #E9EDF2;
  border-radius: 24rpx;
  padding: 6rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 27rpx;
  color: #4E5969;
  border-radius: 18rpx;
  transition: all 0.18s ease;
}

.seg-item.on {
  background: #FFFFFF;
  color: #1F2329;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.08);
}

.seg-item.on.expense-text {
  color: #00B578;
}

.seg-item.on.income-text {
  color: #FF8F1F;
}

/* 按钮 */
.btn-primary {
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #00C97E 0%, #00A76B 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 20rpx rgba(0,181,120, 0.24);
}

.btn-primary:active {
  opacity: 0.86;
}

.btn-primary.disabled {
  background: #A6E8D4;
  color: #FFFFFF;
  box-shadow: none;
}

.btn-ghost {
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 24rpx;
  border: 1rpx solid #E5E6EB;
  background: #FFFFFF;
  color: #4E5969;
  font-size: 28rpx;
}

.btn-danger {
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 24rpx;
  border: 1rpx solid #FFD6D6;
  background: #FFF1F0;
  color: #FA5151;
  font-size: 28rpx;
}

.btn-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 16rpx;
  background: #F2F3F5;
  color: #4E5969;
  font-size: 24rpx;
}

.btn-mini.primary-bg {
  background: #00B578;
  color: #FFF;
}

/* 表单 */
.form-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.form-row {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #F2F3F5;
  min-height: 100rpx;
}

.form-row:last-child {
  border-bottom: none;
}

.form-label {
  width: 180rpx;
  flex-shrink: 0;
  color: #86909C;
  font-size: 28rpx;
}

.form-input {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 29rpx;
  color: #1F2329;
}

.form-input.left {
  text-align: left;
}

.form-value {
  flex: 1;
  text-align: right;
  color: #1F2329;
  font-size: 29rpx;
}

.arrow-right {
  margin-left: 12rpx;
  color: #C9CDD4;
  font-size: 28rpx;
}

.placeholder {
  color: #C9CDD4;
}

.section-label {
  padding: 30rpx 10rpx 16rpx;
  color: #86909C;
  font-size: 24rpx;
  letter-spacing: 0.04em;
}

/* 底部弹层 */
.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(31,35,41, 0.42);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  animation: sheet-up 0.24s ease;
  max-height: 86vh;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: 600;
}

.sheet-close {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #EEF1F5;
  color: #86909C;
  text-align: center;
  line-height: 64rpx;
  font-size: 30rpx;
}

/* 列表通用 */
.list-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F3F5;
}

.list-item:last-child {
  border-bottom: none;
}

.icon-circle {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  flex-shrink: 0;
}

.empty {
  padding: 100rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-icon {
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  background: #EEF1F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 76rpx;
  margin-bottom: 28rpx;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #4E5969;
}

.empty-desc {
  margin-top: 10rpx;
  color: #86909C;
  font-size: 25rpx;
  line-height: 1.7;
}

.chip {
  display: inline-flex;
  align-items: center;
  height: 56rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  background: #FFFFFF;
  color: #4E5969;
  font-size: 24rpx;
  margin-right: 12rpx;
  box-shadow: var(--shadow);
}

.chip.on {
  background: #00B578;
  color: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(0,181,120, 0.22);
}

.safe-bottom {
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.fade-in {
  animation: fade 0.25s ease;
}

@keyframes fade {
  from {
    opacity: 0;
    transform: translateY(12rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toggle {
  width: 92rpx;
  height: 52rpx;
  border-radius: 999rpx;
  background: #E5E6EB;
  padding: 4rpx;
  transition: background 0.2s ease;
}

.toggle.on {
  background: #00B578;
}

.toggle-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #FFF;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.16);
  transition: transform 0.2s ease;
}

.toggle.on .toggle-dot {
  transform: translateX(40rpx);
}

/* 底部 tab 切换：页面淡入 + 轻缩放（底栏不动，无横向位移） */
page {
  background: #F6F7F9;
}

.pg-body {
  width: 100%;
}

.pg-in-next,
.pg-in-prev {
  will-change: opacity, transform;
  transform-origin: 50% 50%;
  animation: pg-in-fade 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes pg-in-fade {
  0% {
    opacity: 0.3;
    transform: scale(0.98);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

