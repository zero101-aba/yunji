<template>
<view class="mine-page">
  <view class="pg-body" :class="navDir === 1 ? 'pg-in-next' : navDir === -1 ? 'pg-in-prev' : ''">
  <view class="mine-hero">
    <view class="hero-top">
      <view class="avatar">🧾</view>
      <view class="hello-box">
        <view class="hello">星记</view>
        <view class="hello-sub">不需要登录的私人账本</view>
      </view>
      <view class="privacy-badge">仅存本机</view>
    </view>
    <view class="asset-block">
      <text class="asset-cap">总资产</text>
      <text class="asset-val num">{{totalAssetsText}}</text>
    </view>
    <view class="hero-stats">
      <view class="hero-stat">
        <text class="hs-cap">本月支出</text>
        <text class="hs-val num">{{monthExpenseText}}</text>
      </view>
      <view class="hero-stat">
        <text class="hs-cap">本月收入</text>
        <text class="hs-val num">{{monthIncomeText}}</text>
      </view>
      <view class="hero-stat">
        <text class="hs-cap">账户</text>
        <text class="hs-val num">{{accountsCount}} 个</text>
      </view>
    </view>
  </view>

  <view class="section-label">记账管理</view>
  <view class="menu-card">
    <view class="menu-row" @tap="goAccounts">
      <view class="menu-icon" style="background: #E4F8F0">💳</view>
      <view class="menu-main">
        <text class="menu-title">账户管理</text>
        <text class="menu-sub">{{accountsCount}} 个账户</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="goCategories">
      <view class="menu-icon" style="background: #FDEBEB">🏷️</view>
      <view class="menu-main">
        <text class="menu-title">分类管理</text>
        <text class="menu-sub">自定义图标、排序与隐藏</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="goBudget">
      <view class="menu-icon" style="background: #FFF3E3">🎯</view>
      <view class="menu-main">
        <text class="menu-title">预算设置</text>
        <text class="menu-sub">{{budgetText}}</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="goTemplates">
      <view class="menu-icon" style="background: #E8F1FF">⚡</view>
      <view class="menu-main">
        <text class="menu-title">快捷模板</text>
        <text class="menu-sub">{{templatesCount}} 个模板，一键带出金额与分类</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
  </view>

  <view class="section-label">数据</view>
  <view class="menu-card">
    <view class="menu-row" @tap="goData">
      <view class="menu-icon" style="background: #F2F3F5">🗂️</view>
      <view class="menu-main">
        <text class="menu-title">数据与备份</text>
        <text class="menu-sub">导出 CSV · 备份恢复 · 清空账单</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
    <view class="storage-row">
      <view class="row between">
        <text class="storage-cap">本地存储占用</text>
        <text class="storage-val">{{storageText}}</text>
      </view>
      <view class="storage-track">
        <view :class="'storage-fill ' + (storageWarn ? 'warn' : '')" :style="'width: ' + (storagePercent) + '%'"></view>
      </view>
    </view>
  </view>

  <view class="section-label">偏好设置</view>
  <view class="menu-card">
    <view class="menu-row" @tap="chooseDefaultPage">
      <view class="menu-icon" style="background: #E4F8F0">🏠</view>
      <view class="menu-main">
        <text class="menu-title">默认首页</text>
        <text class="menu-sub">{{defaultPageLabel}}</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row">
      <view class="menu-icon" style="background: #F2F3F5">🫣</view>
      <view class="menu-main">
        <text class="menu-title">金额隐私模式</text>
        <text class="menu-sub">全站金额显示为 ****</text>
      </view>
      <view :class="'toggle ' + (hideAmount ? 'on' : '')" @tap.stop="toggleHide">
        <view class="toggle-dot"></view>
      </view>
    </view>
    <view class="menu-row">
      <view class="menu-icon" style="background: #E8F1FF">💳</view>
      <view class="menu-main">
        <text class="menu-title">支付后自动记账</text>
        <text class="menu-sub">识别剪切板里的付款信息，回来提醒入账</text>
      </view>
      <view :class="'toggle ' + (autoClipboard ? 'on' : '')" @tap.stop="toggleAutoClipboard">
        <view class="toggle-dot"></view>
      </view>
    </view>
    <view class="menu-row" @tap="showReminder">
      <view class="menu-icon" style="background: #FFF3E3">⏰</view>
      <view class="menu-main">
        <text class="menu-title">记账提醒</text>
        <text class="menu-sub">需配置订阅消息（当前未启用）</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
  </view>

  <view class="section-label">其他</view>
  <view class="menu-card">
    <view class="menu-row" @tap="goAbout">
      <view class="menu-icon" style="background: #F2F3F5">📖</view>
      <view class="menu-main">
        <text class="menu-title">关于星记</text>
        <text class="menu-sub">版本 1.0.0 · 使用说明与反馈</text>
      </view>
      <text class="menu-arrow">›</text>
    </view>
  </view>

  <view class="notice">
    <text class="notice-title">数据只属于你</text>
    <text class="notice-desc">所有账单保存在当前设备的应用本地存储中，不上传服务器。清理应用缓存、卸载应用或更换设备会丢失数据，请定期在「数据与备份」中备份。</text>
  </view>

  </view>
  <x-tabbar current="mine" />
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
import tabnav from '../../utils/tabnav.js';
export default {
  data() {
    return {
      navDir: 0,
      totalAssetsText: '¥0.00',
      monthExpenseText: '¥0.00',
      monthIncomeText: '¥0.00',
      accountsCount: 0,
      categoriesCount: 0,
      templatesCount: 0,
      hideAmount: false,
      autoClipboard: false,
      defaultPage: 'record',
      defaultPageLabel: '打开即记账',
      storageText: '',
      storagePercent: 0,
      storageWarn: false,
      budgetText: ''
    };
  },
  onShow() {
    const nav = tabnav.take();
    if (nav && nav.key === 'mine') {
      this.navDir = nav.dir;
      setTimeout(() => {
        this.navDir = 0;
      }, 400);
    }
    this.refresh();
  },
  methods: {
    refresh() {
      const settings = store.getSettings();
      const accounts = store.getAccounts();
      const categories = store.getCategories();
      const templates = store.getTemplates();
      const ym = dateUtil.ymOf(dateUtil.todayStr());
      const totals = store.monthTotals(ym);
      const budget = store.getBudgetSummary(ym);
      const storage = store.storageInfo();
      const totalAssets = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
      const percent = storage.limitSize ? Math.round(storage.currentSize / storage.limitSize * 100) : 0;
      this.setData({
        totalAssetsText: money.money(totalAssets, settings.hideAmount),
        monthExpenseText: money.money(totals.expense, settings.hideAmount),
        monthIncomeText: money.money(totals.income, settings.hideAmount),
        accountsCount: accounts.length,
        categoriesCount: categories.length,
        templatesCount: templates.length,
        hideAmount: !!settings.hideAmount,
        autoClipboard: !!settings.autoClipboard,
        defaultPage: settings.defaultPage,
        defaultPageLabel: settings.defaultPage === 'list' ? '打开即看明细' : '打开即记账',
        storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
        storagePercent: Math.min(100, percent),
        storageWarn: storage.currentSize > storage.limitSize * 0.7,
        budgetText: budget.hasBudget ? settings.hideAmount ? '已设置' : '预算 ' + money.money(budget.total, false) : '未设置'
      });
    },
    goAccounts() {
      uni.navigateTo({
        url: '/pages/accounts/accounts'
      });
    },
    goCategories() {
      uni.navigateTo({
        url: '/pages/categories/categories?type=expense'
      });
    },
    goBudget() {
      uni.navigateTo({
        url: '/pages/budget/budget'
      });
    },
    goTemplates() {
      uni.navigateTo({
        url: '/pages/templates/templates'
      });
    },
    goData() {
      uni.navigateTo({
        url: '/pages/data/data'
      });
    },
    goAbout() {
      uni.navigateTo({
        url: '/pages/about/about'
      });
    },
    toggleHide() {
      const hide = !this.hideAmount;
      store.saveSettings({
        hideAmount: hide
      });
      this.refresh();
      uni.showToast({
        title: hide ? '金额已隐藏' : '金额已显示',
        icon: 'none'
      });
    },
    toggleAutoClipboard() {
      const next = !this.autoClipboard;
      store.saveSettings({ autoClipboard: next });
      this.refresh();
      uni.showToast({ title: next ? '已开启自动记账' : '已关闭自动记账', icon: 'none' });
    },
    chooseDefaultPage() {
      uni.showActionSheet({
        itemList: ['打开应用即记账', '打开应用即看明细'],
        success: res => {
          const defaultPage = res.tapIndex === 1 ? 'list' : 'record';
          store.saveSettings({
            defaultPage
          });
          this.refresh();
          uni.showToast({
            title: '下次启动生效',
            icon: 'none'
          });
        }
      });
    },
    showReminder() {
      uni.showModal({
        title: '记账提醒',
        content: '提醒依赖系统推送（微信端为订阅消息），需要配置模板与定时服务后才能推送。当前为纯本机版本，暂不发送提醒，不影响记账与统计。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#00B578'
      });
    },
    clearDataTip() {
      uni.navigateTo({
        url: '/pages/data/data'
      });
    }
  }
};</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  padding: 8rpx 28rpx 70rpx;
  background: #F6F7F9;
}

.mine-hero {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 30rpx;
  color: #1F2329;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
}

.hero-top {
  display: flex;
  align-items: center;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: linear-gradient(160deg, #00C97E 0%, #00A76B 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  box-shadow: 0 6rpx 16rpx rgba(0,181,120, 0.22);
}

.hello-box {
  flex: 1;
  margin-left: 18rpx;
}

.hello {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2329;
}

.hello-sub {
  font-size: 21rpx;
  color: #86909C;
  margin-top: 4rpx;
}

.privacy-badge {
  font-size: 19rpx;
  padding: 8rpx 14rpx;
  border-radius: 12rpx;
  background: #E4F8F0;
  color: #00A76B;
}

.asset-block {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
}

.asset-cap {
  font-size: 23rpx;
  color: #86909C;
  letter-spacing: 0.05em;
}

.asset-val {
  font-size: 56rpx;
  font-weight: 600;
  color: #1F2329;
  letter-spacing: -0.03em;
  margin-top: 6rpx;
}

.hero-stats {
  display: flex;
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid #F2F3F5;
}

.hero-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hs-cap {
  font-size: 20rpx;
  color: #86909C;
}

.hs-val {
  font-size: 26rpx;
  margin-top: 4rpx;
  font-weight: 600;
  color: #4E5969;
}

.section-label {
  padding: 30rpx 8rpx 14rpx;
  color: #86909C;
  font-size: 23rpx;
  letter-spacing: 0.04em;
}

.menu-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 0 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
}

.menu-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #F2F3F5;
}

.menu-row:last-child {
  border-bottom: none;
}

.menu-icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.menu-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
}

.menu-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2329;
}

.menu-sub {
  font-size: 21rpx;
  color: #86909C;
  margin-top: 3rpx;
}

.menu-arrow {
  color: #C9CDD4;
  font-size: 28rpx;
  margin-left: 10rpx;
}

.storage-row {
  padding: 20rpx 0 24rpx;
}

.storage-cap {
  font-size: 22rpx;
  color: #86909C;
}

.storage-val {
  font-size: 22rpx;
  color: #86909C;
  font-family: "DIN Alternate", sans-serif;
}

.storage-track {
  height: 8rpx;
  border-radius: 99rpx;
  background: #F2F3F5;
  margin-top: 12rpx;
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  border-radius: 99rpx;
  background: #86909C;
  transition: width 0.25s ease;
}

.storage-fill.warn {
  background: #FA5151;
}

.notice {
  margin-top: 30rpx;
  padding: 26rpx 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 20rpx;
}

.notice-title {
  display: block;
  font-size: 25rpx;
  font-weight: 600;
  color: #4E5969;
}

.notice-desc {
  display: block;
  font-size: 21rpx;
  line-height: 1.75;
  color: #86909C;
  margin-top: 8rpx;
}
</style>
