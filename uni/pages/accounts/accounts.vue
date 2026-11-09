<template>
<view class="accounts-page">
  <view class="assets-card">
    <text class="assets-cap">账户总资产（不含信用卡）</text>
    <text class="assets-val num">{{totalAssetsText}}</text>
    <text class="assets-note">账户余额会随每笔收支自动更新</text>
  </view>

  <view class="section-label">我的账户</view>
  <view class="account-list">
    <view class="account-card" v-for="(item, index) in accounts" :key="item.id" :data-id="(item.id)" @tap="editAccount">
      <view class="ac-icon">{{item.icon}}</view>
      <view class="ac-main">
        <view class="ac-name-row">
          <text class="ac-name">{{item.name}}</text>
          <text class="ac-type">{{item.typeLabel}}</text>
        </view>
        <text class="ac-extra" v-if="item.extra">{{item.extra}}</text>
        <text class="ac-extra" v-else>当前余额</text>
      </view>
      <view class="ac-right">
        <text :class="'ac-amount num ' + (item.negative ? 'neg' : '')">{{item.amountText}}</text>
        <text class="ac-arrow">›</text>
      </view>
    </view>
    <view class="empty" v-if="accounts.length === 0">
      <view class="empty-icon">👛</view>
      <view class="empty-title">还没有账户</view>
      <view class="empty-desc">添加一个账户后就可以开始记账了</view>
    </view>
  </view>

  <view class="btn-primary add-btn" @tap="addAccount">＋ 添加账户</view>

  <view class="tip-card">
    <text class="tip-title">关于信用卡</text>
    <text class="tip-desc">信用卡的消费会累计为已用额度。可用额度 = 额度 − 已用额度。信用卡不计入总资产。</text>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import money from '../../utils/money.js';
const TYPE_LABEL = {
  cash: '现金',
  wechat: '微信零钱',
  alipay: '支付宝',
  bank: '银行卡',
  credit: '信用卡'
};
export default {
  data() {
    return {
      accounts: [],
      totalAssetsText: '¥0.00',
      hideAmount: false
    };
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const settings = store.getSettings();
      const hide = !!settings.hideAmount;
      const accounts = store.getAccounts().map(a => {
        const isCredit = a.type === 'credit';
        const balance = Number(a.balance) || 0;
        let amountText = money.money(balance, hide);
        let extra = '';
        if (isCredit) {
          const quota = Number(a.quota) || 0;
          const available = quota + balance;
          const used = Math.max(0, -balance);
          amountText = money.money(-used, hide);
          extra = '可用 ' + money.money(Math.max(0, available), hide) + ' / 额度 ' + money.money(quota, hide);
        }
        return Object.assign({}, a, {
          typeLabel: TYPE_LABEL[a.type] || '账户',
          amountText,
          extra,
          isCredit,
          negative: !isCredit && balance < 0
        });
      });
      const total = store.getAccounts().reduce((sum, a) => {
        if (a.type === 'credit') return sum;
        return sum + (Number(a.balance) || 0);
      }, 0);
      this.setData({
        accounts,
        hideAmount: hide,
        totalAssetsText: money.money(total, hide)
      });
    },
    addAccount() {
      uni.navigateTo({
        url: '/pages/account-edit/account-edit'
      });
    },
    editAccount(e) {
      const id = e.currentTarget.dataset.id;
      uni.navigateTo({
        url: '/pages/account-edit/account-edit?id=' + id
      });
    }
  }
};</script>

<style scoped>
.accounts-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 70rpx;
  background: #F6F7F9;
}

.assets-card {
  background: linear-gradient(140deg, #00B578 0%, #00A76B 100%);
  border-radius: 30rpx;
  padding: 30rpx 32rpx;
  color: #FFFFFF;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16rpx 34rpx rgba(0,181,120, 0.18);
}

.assets-cap {
  font-size: 23rpx;
  opacity: 0.75;
}

.assets-val {
  font-size: 62rpx;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-top: 6rpx;
}

.assets-note {
  font-size: 21rpx;
  opacity: 0.65;
  margin-top: 12rpx;
}

.account-list {
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 0 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.account-card {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.account-card:last-child {
  border-bottom: none;
}

.ac-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 20rpx;
  background: #F2F3F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  flex-shrink: 0;
}

.ac-main {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
}

.ac-name-row {
  display: flex;
  align-items: center;
}

.ac-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #1F2329;
}

.ac-type {
  font-size: 19rpx;
  color: #86909C;
  background: #F2F3F5;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
  margin-left: 10rpx;
}

.ac-extra {
  display: block;
  font-size: 21rpx;
  color: #86909C;
  margin-top: 4rpx;
}

.ac-right {
  display: flex;
  align-items: center;
}

.ac-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #1F2329;
}

.ac-amount.neg {
  color: #FA5151;
}

.ac-arrow {
  color: #C9CDD4;
  margin-left: 10rpx;
  font-size: 26rpx;
}

.add-btn {
  margin-top: 24rpx;
}

.tip-card {
  margin-top: 26rpx;
  padding: 24rpx 26rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 20rpx;
}

.tip-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #4E5969;
}

.tip-desc {
  display: block;
  font-size: 21rpx;
  line-height: 1.7;
  color: #86909C;
  margin-top: 6rpx;
}
</style>
