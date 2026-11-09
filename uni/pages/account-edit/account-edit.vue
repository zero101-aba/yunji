<template>
<view class="acc-edit-page">
  <view class="avatar-preview">
    <view class="big-icon">{{icon}}</view>
    <view class="preview-name">{{name || '新账户'}}</view>
    <view class="preview-balance num" v-if="isEdit">当前余额 {{balanceText}}</view>
  </view>

  <view class="section-label">账户类型</view>
  <view class="type-grid">
    <view :class="'type-cell ' + (type === item.key ? 'on' : '')" v-for="(item, index) in types" :key="item.key" :data-type="(item.key)" @tap="selectType">
      <text class="type-icon">{{item.icon}}</text>
      <text class="type-label">{{item.label}}</text>
    </view>
  </view>

  <view class="section-label">账户信息</view>
  <view class="form-card">
    <view class="form-row">
      <text class="form-label">名称</text>
      <input class="form-input" :value="(name)" maxlength="12" placeholder="例如：工资卡" placeholder-class="placeholder" @input="onName" />
    </view>
    <view class="form-row">
      <text class="form-label">初始余额</text>
      <input class="form-input" type="digit" :value="(initInput)" placeholder="0.00" placeholder-class="placeholder" @input="onInit" />
    </view>
    <template v-if="type === 'credit'">
      <view class="form-row">
        <text class="form-label">信用额度</text>
        <input class="form-input" type="digit" :value="(quotaInput)" placeholder="0.00" placeholder-class="placeholder" @input="onQuota" />
      </view>
      <view class="form-row">
        <text class="form-label">账单日</text>
        <input class="form-input" type="number" :value="(billDay)" placeholder="10" placeholder-class="placeholder" @input="onBillDay" />
      </view>
      <view class="form-row">
        <text class="form-label">还款日</text>
        <input class="form-input" type="number" :value="(repayDay)" placeholder="20" placeholder-class="placeholder" @input="onRepayDay" />
      </view>
    </template>
  </view>

  <view class="hint-card" v-if="type === 'credit'">
    信用卡消费会累计已用额度，可用额度 = 额度 − 已用额度。信用卡余额不计入总资产。
  </view>

  <view class="section-label">图标</view>
  <view class="icon-grid">
    <view :class="'icon-cell ' + (icon === item ? 'on' : '')" v-for="(item, index) in icons" :key="index" :data-icon="(item)" @tap="selectIcon">{{item}}</view>
  </view>

  <view class="actions safe-bottom">
    <view class="btn-primary" @tap="save">保存</view>
    <view class="btn-danger remove-btn" v-if="isEdit" @tap="remove">删除账户</view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import money from '../../utils/money.js';
const TYPES = [{
  key: 'cash',
  label: '现金',
  icon: '💵'
}, {
  key: 'wechat',
  label: '微信零钱',
  icon: '💚'
}, {
  key: 'alipay',
  label: '支付宝',
  icon: '💙'
}, {
  key: 'bank',
  label: '银行卡',
  icon: '🏦'
}, {
  key: 'credit',
  label: '信用卡',
  icon: '💳'
}];
const ICONS = ['💵', '💚', '💙', '🏦', '💳', '👛', '📱', '💰', '🧧', '🏧', '🪪', '🎫'];
export default {
  data() {
    return {
      id: '',
      isEdit: false,
      name: '',
      type: 'cash',
      icon: '💵',
      initInput: '',
      quotaInput: '',
      billDay: '10',
      repayDay: '20',
      types: TYPES,
      icons: ICONS,
      balanceText: '',
      hideAmount: false
    };
  },
  onLoad(options) {
    const settings = store.getSettings();
    this.setData({
      hideAmount: !!settings.hideAmount
    });
    if (!options.id) return;
    const account = store.getAccount(options.id);
    if (!account) return;
    this.setData({
      id: account.id,
      isEdit: true,
      name: account.name,
      type: account.type,
      icon: account.icon,
      initInput: money.centToInput(account.initBalance),
      quotaInput: account.quota ? money.centToInput(account.quota) : '',
      billDay: account.billDay ? String(account.billDay) : '10',
      repayDay: account.repayDay ? String(account.repayDay) : '20',
      balanceText: money.money(account.balance, settings.hideAmount)
    });
  },
  methods: {
    onName(e) {
      this.setData({
        name: e.detail.value
      });
    },
    selectType(e) {
      const type = e.currentTarget.dataset.type;
      const matched = TYPES.find(t => t.key === type);
      const update = {
        type
      };
      if (!this.isEdit && matched) update.icon = matched.icon;
      this.setData(update);
    },
    selectIcon(e) {
      this.setData({
        icon: e.currentTarget.dataset.icon
      });
    },
    onInit(e) {
      this.setData({
        initInput: e.detail.value
      });
    },
    onQuota(e) {
      this.setData({
        quotaInput: e.detail.value
      });
    },
    onBillDay(e) {
      this.setData({
        billDay: e.detail.value
      });
    },
    onRepayDay(e) {
      this.setData({
        repayDay: e.detail.value
      });
    },
    save() {
      const name = String(this.name || '').trim();
      if (!name) {
        uni.showToast({
          title: '请输入账户名称',
          icon: 'none'
        });
        return;
      }
      if (name.length > 12) {
        uni.showToast({
          title: '账户名称最多 12 个字',
          icon: 'none'
        });
        return;
      }
      let initBalance = 0;
      if (this.initInput) {
        const parsed = money.parseToCents(this.initInput);
        if (parsed === null) {
          uni.showToast({
            title: '初始余额格式有误',
            icon: 'none'
          });
          return;
        }
        initBalance = parsed;
      }
      let quota = 0;
      if (this.type === 'credit' && this.quotaInput) {
        const parsedQuota = money.parseToCents(this.quotaInput);
        if (parsedQuota === null || parsedQuota < 0) {
          uni.showToast({
            title: '额度格式有误',
            icon: 'none'
          });
          return;
        }
        quota = parsedQuota;
      }
      const billDay = Math.min(28, Math.max(1, Number(this.billDay) || 10));
      const repayDay = Math.min(28, Math.max(1, Number(this.repayDay) || 20));
      store.saveAccount({
        id: this.id || undefined,
        name,
        type: this.type,
        icon: this.icon,
        initBalance,
        quota,
        billDay,
        repayDay
      });
      uni.showToast({
        title: '已保存',
        icon: 'success'
      });
      setTimeout(() => uni.navigateBack(), 450);
    },
    remove() {
      uni.showModal({
        title: '删除账户',
        content: '删除后该账户将不再显示，且无法恢复。',
        confirmText: '删除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          const result = store.deleteAccount(this.id);
          if (!result.ok) {
            if (result.reason === 'referenced') {
              uni.showModal({
                title: '无法删除',
                content: '该账户下还有账单记录。请先在明细中把相关账单改到其他账户，再删除。',
                showCancel: false,
                confirmColor: '#00B578'
              });
            }
            return;
          }
          uni.showToast({
            title: '已删除',
            icon: 'none'
          });
          setTimeout(() => uni.navigateBack(), 450);
        }
      });
    }
  }
};</script>

<style scoped>
.acc-edit-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0 12rpx;
}

.big-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 32rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60rpx;
  box-shadow: 0 10rpx 26rpx rgba(31,35,41, 0.08);
}

.preview-name {
  font-size: 32rpx;
  font-weight: 600;
  margin-top: 16rpx;
}

.preview-balance {
  font-size: 23rpx;
  color: #86909C;
  margin-top: 4rpx;
}

.type-grid {
  display: flex;
  flex-wrap: wrap;
}

.type-cell {
  width: calc(33.33% - 12rpx);
  margin: 6rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 18rpx;
  padding: 18rpx 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.type-cell.on {
  background: #E4F8F0;
  border-color: rgba(0,181,120, 0.45);
}

.type-icon {
  font-size: 34rpx;
}

.type-label {
  font-size: 22rpx;
  color: #4E5969;
  margin-top: 6rpx;
}

.type-cell.on .type-label {
  color: #00B578;
  font-weight: 600;
}

.form-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.hint-card {
  margin-top: 18rpx;
  padding: 20rpx 24rpx;
  background: #FFF3E3;
  border: 1rpx solid #FFF3E3;
  border-radius: 16rpx;
  color: #FF8F1F;
  font-size: 22rpx;
  line-height: 1.7;
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 14rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.icon-cell {
  width: calc(16.66% - 12rpx);
  margin: 6rpx;
  aspect-ratio: 1;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  border: 1rpx solid transparent;
}

.icon-cell.on {
  background: #E4F8F0;
  border-color: rgba(0,181,120, 0.4);
}

.actions {
  margin-top: 40rpx;
}

.remove-btn {
  margin-top: 20rpx;
}
</style>
