<template>
<view class="about-page">
  <view class="about-hero">
    <image class="app-logo" src="/static/icons/icon-192.png" mode="aspectFit" />
    <view class="app-name">星记</view>
    <view class="app-desc">打开就能记，不用注册，数据只在自己手机里</view>
    <view class="version-chip">v{{version}}</view>
    <text class="created" v-if="createdText">{{createdText}}</text>
  </view>

  <view class="stat-grid">
    <view class="stat-cell">
      <text class="stat-val num">{{billCount}}</text>
      <text class="stat-cap">账单笔数</text>
    </view>
    <view class="stat-cell">
      <text class="stat-val num">{{monthCount}}</text>
      <text class="stat-cap">记账月份</text>
    </view>
    <view class="stat-cell">
      <text class="stat-val num">{{accountCount}}</text>
      <text class="stat-cap">账户数</text>
    </view>
    <view class="stat-cell">
      <text class="stat-val num small-num">{{storageText}}</text>
      <text class="stat-cap">本地存储</text>
    </view>
  </view>

  <view class="section-label">怎么用</view>
  <view class="step-card">
    <view class="step-row" v-for="(item, index) in steps" :key="item.title">
      <view class="step-icon">{{item.icon}}</view>
      <view class="step-main">
        <text class="step-title">{{item.title}}</text>
        <text class="step-desc">{{item.desc}}</text>
      </view>
    </view>
  </view>

  <view class="section-label">数据与隐私</view>
  <view class="note-card">
    <view class="note-row">
      <text class="note-title">数据存在哪里</text>
      <text class="note-desc">全部保存在当前设备的应用本地存储中，按月分片存放。不登录、不联网、不上传，也没有服务端。</text>
    </view>
    <view class="note-row">
      <text class="note-title">什么情况会丢数据</text>
      <text class="note-desc">清理应用缓存、卸载应用或更换手机都会导致本地数据丢失。请定期在「数据与备份」中导出 CSV 或生成备份内容并另存。</text>
    </view>
    <view class="note-row">
      <text class="note-title">换机怎么迁移</text>
      <text class="note-desc">在旧手机生成备份内容并复制保存，在新手机的「数据与备份」中粘贴恢复即可。</text>
    </view>
    <view class="note-row">
      <text class="note-title">没有做什么</text>
      <text class="note-desc">不做账号登录、云端同步、多人共享、发票 OCR、投资资产与 AA 分账。</text>
    </view>
    <view class="note-row">
      <text class="note-title">记账提醒</text>
      <text class="note-desc">提醒依赖系统推送与后台定时服务，当前纯本地版本未启用，不影响记账与统计。</text>
    </view>
  </view>

  <view class="section-label">其他</view>
  <view class="menu-card">
    <view class="menu-row" @tap="goData">
      <text class="menu-title">数据与备份</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="showPrivacy">
      <text class="menu-title">隐私说明</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="checkUpdate">
      <text class="menu-title">检查更新</text>
      <text class="menu-arrow">›</text>
    </view>
    <view class="menu-row" @tap="copyInfo">
      <text class="menu-title">复制版本与数据信息</text>
      <text class="menu-arrow">›</text>
    </view>
  </view>

  <view class="feedback-card">
    <text class="fb-title">意见反馈</text>
    <text class="fb-desc">遇到问题或想要新功能，点击上方「复制版本与数据信息」，把内容发给开发者即可。也可以通过应用内的反馈入口联系我们。</text>
    <view class="btn-ghost fb-btn" @tap="copyInfo">复制反馈信息</view>
  </view>

  <view class="footer">星记 · 免登录本地账本 · v{{version}}</view>
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
export default {
  data() {
    return {
      version: store.VERSION,
      billCount: 0,
      monthCount: 0,
      accountCount: 0,
      storageText: '',
      storagePercent: 0,
      createdText: '',
      steps: [{
        icon: '✏️',
        title: '记一笔',
        desc: '记账页输入金额，选分类和账户，点保存。金额支持 12+8 这类算式。'
      }, {
        icon: '🗂️',
        title: '看明细',
        desc: '按日分组的账单列表，支持筛选、搜索备注、日历视图与左右切月。'
      }, {
        icon: '📊',
        title: '看统计',
        desc: '月度收支总览、分类占比环形图、每日趋势，点分类可下钻查看记录。'
      }, {
        icon: '💾',
        title: '做备份',
        desc: '在「数据与备份」中导出 CSV 或生成备份内容，换机前记得备份。'
      }]
    };
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const storage = store.storageInfo();
      const months = store.getBillMonths();
      const meta = store.getMeta();
      let billCount = 0;
      try {
        billCount = store.allBills().length;
      } catch (e) {
        billCount = 0;
      }
      const percent = storage.limitSize ? Math.round(storage.currentSize / storage.limitSize * 100) : 0;
      let createdText = '';
      if (meta && meta.createdAt) {
        const dt = new Date(meta.createdAt);
        createdText = '自 ' + dateUtil.todayStr(dt) + ' 开始使用';
      }
      this.setData({
        billCount,
        monthCount: months.length,
        accountCount: store.getAccounts().length,
        storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
        storagePercent: Math.min(100, percent),
        createdText
      });
    },
    checkUpdate() {
      uni.showModal({
        title: '检查更新',
        content: '当前已是最新版本 ' + this.version + '。更新由应用商店或平台自动完成，重新打开应用即可生效。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#00B578'
      });
    },
    showPrivacy() {
      uni.showModal({
        title: '隐私与数据',
        content: '星记不需要登录，也不会上传任何数据。所有账单、账户与设置都保存在你设备的本地存储中，我们无法读取，也无法帮你找回。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#00B578'
      });
    },
    copyInfo() {
      const text = ['星记 v' + this.version, '账单 ' + this.billCount + ' 笔 · 月份 ' + this.monthCount + ' 个', '账户 ' + this.accountCount + ' 个', '本地存储 ' + this.storageText].join('\n');
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({
          title: '信息已复制',
          icon: 'success'
        })
      });
    },
    goData() {
      uni.navigateTo({
        url: '/pages/data/data'
      });
    }
  }
};</script>

<style scoped>
.about-page {
  min-height: 100vh;
  padding: 18rpx 26rpx 70rpx;
  background: #F6F7F9;
}

.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26rpx 0 12rpx;
}

.app-logo {
  width: 128rpx;
  height: 128rpx;
  border-radius: 32rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  box-shadow: 0 12rpx 30rpx rgba(31,35,41, 0.08);
}

.app-name {
  margin-top: 18rpx;
  font-size: 38rpx;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.app-desc {
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #86909C;
}

.version-chip {
  margin-top: 14rpx;
  padding: 4rpx 18rpx;
  border-radius: 999rpx;
  background: #E4F8F0;
  color: #00B578;
  font-size: 21rpx;
}

.created {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #C9CDD4;
}

.stat-grid {
  display: flex;
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-top: 22rpx;
  padding: 22rpx 0;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.stat-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1rpx solid #EEF1F5;
}

.stat-cell:last-child {
  border-right: none;
}

.stat-val {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2329;
}

.stat-val.small-num {
  font-size: 22rpx;
  line-height: 1.6;
}

.stat-cap {
  margin-top: 4rpx;
  font-size: 19rpx;
  color: #86909C;
}

.step-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 6rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.step-row {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.step-row:last-child {
  border-bottom: none;
}

.step-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  background: #F2F3F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.step-main {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.step-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #1F2329;
}

.step-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.65;
  color: #86909C;
}

.note-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 6rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.note-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.note-row:last-child {
  border-bottom: none;
}

.note-title {
  display: block;
  font-size: 25rpx;
  font-weight: 600;
  color: #4E5969;
}

.note-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #86909C;
}

.menu-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.menu-row:last-child {
  border-bottom: none;
}

.menu-title {
  font-size: 27rpx;
  color: #1F2329;
}

.menu-arrow {
  color: #C9CDD4;
  font-size: 26rpx;
}

.feedback-card {
  margin-top: 28rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 22rpx;
  padding: 26rpx;
}

.fb-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: #4E5969;
}

.fb-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #86909C;
}

.fb-btn {
  margin-top: 18rpx;
  height: 76rpx;
  line-height: 76rpx;
  font-size: 26rpx;
}

.footer {
  text-align: center;
  font-size: 20rpx;
  color: #C9CDD4;
  padding: 34rpx 0 10rpx;
}
</style>
