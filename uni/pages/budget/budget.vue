<template>
<view class="budget-page">
  <view class="month-nav">
    <view class="m-arrow" data-dir="-1" @tap="shift">‹</view>
    <text class="m-label">{{ymLabel}}</text>
    <view class="m-arrow" data-dir="1" @tap="shift">›</view>
  </view>

  <view class="budget-hero">
    <view class="bh-row">
      <text class="bh-cap">本月预算</text>
      <text class="bh-percent" v-if="summary.hasBudget">{{summary.percent}}%</text>
    </view>
    <view class="bh-total num">{{summary.hasBudget ? summary.totalText : '未设置'}}</view>
    <view class="bh-bar" v-if="summary.hasBudget">
      <view :class="'bh-fill ' + (summary.over ? 'over' : '')" :style="'width: ' + (summary.barWidth) + '%'"></view>
    </view>
    <view class="bh-cols" v-if="summary.hasBudget">
      <view class="bh-col">
        <text class="bh-col-cap">已支出</text>
        <text class="bh-col-val num">{{summary.usedText}}</text>
      </view>
      <view class="bh-col">
        <text class="bh-col-cap">{{summary.over ? '已超支' : '剩余'}}</text>
        <text :class="'bh-col-val num ' + (summary.over ? 'over' : '')">{{summary.remainText}}</text>
      </view>
    </view>
    <view class="bh-tip" v-else>设置总预算后，记账页会实时显示进度，达到 80% 和 100% 时提醒你。</view>
  </view>

  <view class="section-label">总预算（元）</view>
  <view class="total-card">
    <text class="total-symbol">¥</text>
    <input class="total-input num" type="digit" :value="(totalInput)" placeholder="0.00" placeholder-class="placeholder" @input="onTotal" />
    <text class="total-hint">每月单独设置</text>
  </view>

  <view class="section-label">分类预算（选填）</view>
  <view class="cat-budget-card">
    <view class="cb-row" v-for="(item, index) in rows" :key="item.id">
      <view class="cb-head">
        <view class="cb-icon" :style="'background: ' + (item.tint) + '; color: ' + (item.color)">{{item.icon}}</view>
        <view class="cb-main">
          <view class="cb-name-line">
            <text class="cb-name">{{item.name}}</text>
            <text class="cb-used">已用 {{item.usedText}}</text>
          </view>
          <view class="cb-bar" v-if="item.input">
            <view :class="'cb-fill ' + (item.over ? 'over' : '')" :style="'width: ' + (item.barWidth) + '%; background: ' + (item.over ? '' : item.color)"></view>
          </view>
        </view>
        <view class="cb-input-wrap">
          <text class="cb-symbol">¥</text>
          <input class="cb-input num" type="digit" :value="(item.input)" placeholder="不限" placeholder-class="placeholder" :data-index="(index)" @input="onRowInput" />
        </view>
      </view>
    </view>
    <view class="empty cb-empty" v-if="rows.length === 0">暂无支出分类，请先到分类管理中添加</view>
  </view>

  <view class="actions safe-bottom">
    <view class="btn-primary" @tap="save">保存预算</view>
    <view class="btn-ghost clear-btn" v-if="summary.hasBudget" @tap="clearBudget">清除本月预算</view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
function hexToRgba(hex, alpha) {
  const value = String(hex || '#86909C').replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
export default {
  data() {
    return {
      ym: '',
      ymLabel: '',
      hideAmount: false,
      totalInput: '',
      rows: [],
      summary: {
        hasBudget: false,
        totalText: '¥0.00',
        usedText: '¥0.00',
        remainText: '¥0.00',
        percent: 0,
        barWidth: 0,
        over: false
      }
    };
  },
  onLoad(options) {
    const ym = options.ym || dateUtil.ymOf(dateUtil.todayStr());
    this.setData({
      ym,
      ymLabel: dateUtil.monthLabel(ym)
    });
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const settings = store.getSettings();
      const hide = !!settings.hideAmount;
      const ym = this.ym;
      const budget = store.getBudget(ym);
      const bills = store.getMonthBills(ym);
      const categories = store.getCategories().filter(c => c.type === 'expense' && !c.parentId).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const catMap = {};
      store.getCategories().forEach(c => {
        catMap[c.id] = c;
      });
      const usedMap = {};
      bills.forEach(b => {
        if (b.type !== 'expense') return;
        const cat = catMap[b.categoryId];
        const key = cat ? cat.parentId || cat.id : '__other__';
        usedMap[key] = (usedMap[key] || 0) + b.amount;
      });
      const rows = categories.map(c => {
        const used = usedMap[c.id] || 0;
        const budgetCents = Number((budget.byCategory || {})[c.id]) || 0;
        return {
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          tint: hexToRgba(c.color, 0.12),
          input: budgetCents ? money.centToInput(budgetCents) : '',
          used,
          usedText: money.money(used, hide),
          budgetText: budgetCents ? money.money(budgetCents, hide) : '未设',
          barWidth: budgetCents ? Math.min(100, Math.round(used / budgetCents * 100)) : 0,
          over: budgetCents > 0 && used > budgetCents
        };
      });
      const summary = store.getBudgetSummary(ym);
      this.setData({
        hideAmount: hide,
        totalInput: budget.total ? money.centToInput(budget.total) : '',
        rows,
        summary: {
          hasBudget: summary.hasBudget,
          totalText: money.money(summary.total, hide),
          usedText: money.money(summary.used, hide),
          remainText: money.money(Math.abs(summary.remain), hide),
          percent: summary.percent,
          barWidth: Math.min(100, Math.round(summary.percent)),
          over: summary.over
        }
      });
    },
    shift(e) {
      const dir = Number(e.currentTarget.dataset.dir);
      const ym = dateUtil.addMonths(this.ym, dir);
      this.setData({
        ym,
        ymLabel: dateUtil.monthLabel(ym)
      });
      this.refresh();
    },
    onTotal(e) {
      this.setData({
        totalInput: e.detail.value
      });
    },
    onRowInput(e) {
      const index = Number(e.currentTarget.dataset.index);
      this.setData({
        ['rows[' + index + '].input']: e.detail.value
      });
    },
    save() {
      let total = 0;
      if (this.totalInput) {
        const parsed = money.parseToCents(this.totalInput);
        if (parsed === null || parsed < 0) {
          uni.showToast({
            title: '预算总额格式有误',
            icon: 'none'
          });
          return;
        }
        total = parsed;
      }
      const byCategory = {};
      for (let i = 0; i < this.rows.length; i++) {
        const row = this.rows[i];
        if (!row.input) continue;
        const parsed = money.parseToCents(row.input);
        if (parsed === null || parsed < 0) {
          uni.showToast({
            title: row.name + ' 的预算格式有误',
            icon: 'none'
          });
          return;
        }
        if (parsed > 0) byCategory[row.id] = parsed;
      }
      const sumCategory = Object.keys(byCategory).reduce((s, k) => s + byCategory[k], 0);
      if (total === 0 && sumCategory === 0) {
        store.saveBudget(this.ym, {
          total: 0,
          byCategory: {}
        });
        this.refresh();
        uni.showToast({
          title: '已清除预算',
          icon: 'none'
        });
        return;
      }
      if (total === 0 && sumCategory > 0) {
        total = sumCategory;
      }
      if (total > 0 && sumCategory > total) {
        uni.showToast({
          title: '分类预算合计不能超过总预算',
          icon: 'none'
        });
        return;
      }
      store.saveBudget(this.ym, {
        total,
        byCategory
      });
      this.refresh();
      uni.showToast({
        title: '预算已保存',
        icon: 'success'
      });
    },
    clearBudget() {
      uni.showModal({
        title: '清除本月预算',
        content: '本月总预算与分类预算都会清空，账单不受影响。',
        confirmText: '清除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          store.saveBudget(this.ym, {
            total: 0,
            byCategory: {}
          });
          this.refresh();
          uni.showToast({
            title: '已清除',
            icon: 'none'
          });
        }
      });
    }
  }
};</script>

<style scoped>
.budget-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 0 20rpx;
}

.m-arrow {
  width: 52rpx;
  height: 52rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  background: #EEF1F5;
  color: #4E5969;
  font-size: 36rpx;
}

.m-label {
  font-size: 32rpx;
  font-weight: 600;
  margin: 0 20rpx;
  min-width: 190rpx;
  text-align: center;
}

.budget-hero {
  background: linear-gradient(140deg, #00B578 0%, #00A76B 100%);
  border-radius: 30rpx;
  padding: 28rpx 32rpx;
  color: #FFFFFF;
  box-shadow: 0 16rpx 34rpx rgba(0,181,120, 0.18);
}

.bh-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bh-cap {
  font-size: 23rpx;
  opacity: 0.75;
}

.bh-percent {
  font-size: 23rpx;
  opacity: 0.85;
}

.bh-total {
  font-size: 56rpx;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-top: 4rpx;
}

.bh-bar {
  height: 10rpx;
  border-radius: 99rpx;
  background: rgba(255, 255, 255, 0.22);
  margin: 18rpx 0 14rpx;
  overflow: hidden;
}

.bh-fill {
  height: 100%;
  border-radius: 99rpx;
  background: #FF8F1F;
  transition: width 0.25s ease;
}

.bh-fill.over {
  background: #FA5151;
}

.bh-cols {
  display: flex;
}

.bh-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bh-col-cap {
  font-size: 20rpx;
  opacity: 0.68;
}

.bh-col-val {
  font-size: 27rpx;
  margin-top: 4rpx;
}

.bh-col-val.over {
  color: #FFF3E3;
}

.bh-tip {
  font-size: 22rpx;
  line-height: 1.7;
  opacity: 0.75;
  margin-top: 14rpx;
}

.total-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 22rpx 26rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.total-symbol {
  font-size: 34rpx;
  font-weight: 600;
  margin-right: 8rpx;
}

.total-input {
  flex: 1;
  font-size: 48rpx;
  font-weight: 600;
  height: 76rpx;
}

.total-hint {
  font-size: 21rpx;
  color: #86909C;
}

.cat-budget-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.cb-row {
  padding: 18rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.cb-row:last-child {
  border-bottom: none;
}

.cb-head {
  display: flex;
  align-items: center;
}

.cb-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.cb-main {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
}

.cb-name-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cb-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #1F2329;
}

.cb-used {
  font-size: 21rpx;
  color: #86909C;
}

.cb-bar {
  height: 6rpx;
  border-radius: 99rpx;
  background: #F2F3F5;
  margin-top: 8rpx;
  overflow: hidden;
}

.cb-fill {
  height: 100%;
  border-radius: 99rpx;
}

.cb-fill.over {
  background: #FA5151;
}

.cb-input-wrap {
  display: flex;
  align-items: center;
  width: 190rpx;
  flex-shrink: 0;
  background: #F2F3F5;
  border-radius: 12rpx;
  padding: 8rpx 14rpx;
  margin-left: 14rpx;
}

.cb-symbol {
  font-size: 22rpx;
  color: #86909C;
  margin-right: 4rpx;
}

.cb-input {
  flex: 1;
  font-size: 26rpx;
  text-align: right;
  height: 52rpx;
}

.cb-empty {
  padding: 40rpx 0;
  font-size: 23rpx;
  color: #86909C;
  text-align: center;
}

.actions {
  margin-top: 34rpx;
}

.clear-btn {
  margin-top: 18rpx;
}
</style>
