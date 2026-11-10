<template>
<view class="cs-page">
  <view class="cs-hero">
    <view class="hero-top">
      <view class="hero-icon" :style="'background: ' + (tint) + '; color: ' + (color)">{{icon}}</view>
      <view class="hero-title-box">
        <text class="hero-title">{{title}}</text>
        <text class="hero-sub">{{label}} · {{type === 'income' ? '收入' : '支出'}}</text>
      </view>
    </view>
    <view class="hero-total num">{{totalText}}</view>
    <view class="hero-meta">
      <view class="hm-item">
        <text class="hm-cap">记录</text>
        <text class="hm-val">{{count}} 笔</text>
      </view>
      <view class="hm-item">
        <text class="hm-cap">占同类</text>
        <text class="hm-val">{{percentText}}</text>
      </view>
      <view class="hm-item">
        <text class="hm-cap">笔均</text>
        <text class="hm-val num">{{avgText}}</text>
      </view>
    </view>
  </view>

  <view class="section-label" v-if="hasRows">二级分类构成</view>
  <view class="break-card" v-if="hasRows">
    <view class="br-row" v-for="(item, index) in rows" :key="item.id">
      <view class="br-head">
        <text class="br-icon">{{item.icon}}</text>
        <text class="br-name ellipsis">{{item.name}}</text>
        <text class="br-count">{{item.count}} 笔</text>
        <text class="br-amount num">{{item.amountText}}</text>
      </view>
      <view class="br-bar">
        <view class="br-fill" :style="'width: ' + (item.width) + '%; background: ' + (color)"></view>
      </view>
      <text class="br-percent">{{item.percentText}}</text>
    </view>
  </view>

  <view class="section-label">记录明细</view>
  <view class="rec-card" v-if="records.length">
    <view class="rec-row" v-for="(item, index) in records" :key="item.id" :data-id="(item.id)" @tap="editBill">
      <view class="rec-icon" :style="'background: ' + (item.tint)">{{item.icon}}</view>
      <view class="rec-main">
        <view class="rec-name">
          <text class="ellipsis">{{item.name}}</text>
          <text class="rec-attach" v-if="item.hasImages">📎</text>
        </view>
        <text class="rec-note ellipsis">{{item.note}}</text>
      </view>
      <view class="rec-right">
        <text class="rec-amount num">{{item.amountText}}</text>
        <text class="rec-date">{{item.dateText}} {{item.time}}</text>
      </view>
    </view>
  </view>

  <view class="empty" v-else>
    <view class="empty-icon">🧾</view>
    <view class="empty-title">这段时间没有{{title}}记录</view>
    <view class="empty-desc">换个时间段，或先去记一笔</view>
    <view class="btn-ghost empty-btn" @tap="goList">去明细看看</view>
  </view>

  <view class="limit-tip" v-if="limitTip">{{limitTip}}</view>
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
const RECORD_LIMIT = 300;
export default {
  data() {
    return {
      period: 'month',
      anchor: '',
      label: '',
      type: 'expense',
      catId: '',
      title: '',
      icon: '',
      color: '#86909C',
      tint: 'rgba(140,133,123,0.12)',
      totalText: '',
      count: 0,
      percentText: '0%',
      avgText: '',
      rows: [],
      hasRows: false,
      records: [],
      recordCount: 0,
      limitTip: '',
      hideAmount: false
    };
  },
  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr());
    const period = query && query.period === 'year' ? 'year' : 'month';
    const anchor = query && query.anchor || (period === 'month' ? currentYm : currentYm.slice(0, 4));
    this.setData({
      period,
      anchor,
      label: period === 'month' ? dateUtil.monthLabel(anchor) : anchor + '年',
      type: query && query.type === 'income' ? 'income' : 'expense',
      catId: query && query.cat || ''
    });
    this.refresh();
  },
  onShow() {
    if (this.catId) this.refresh();
  },
  methods: {
    billsOfPeriod() {
      if (this.period === 'month') return store.getMonthBills(this.anchor);
      return store.allBills().filter(b => (b.date || '').slice(0, 4) === this.anchor);
    },
    refresh() {
      const hide = !!store.getSettings().hideAmount;
      const type = this.type;
      const catId = this.catId;
      const categories = store.getCategories();
      const catMap = {};
      categories.forEach(c => {
        catMap[c.id] = c;
      });
      const accounts = store.getAccounts();
      const accMap = {};
      accounts.forEach(a => {
        accMap[a.id] = a;
      });
      const typed = this.billsOfPeriod().filter(b => b.type === type);
      const typeTotal = typed.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      let top = null;
      let title = '未分类';
      let icon = '🏷️';
      let color = '#86909C';
      if (catId !== '__other__') {
        top = catMap[catId] || null;
        if (top) {
          title = top.name;
          icon = top.icon;
          color = top.color;
        } else {
          title = '分类已删除';
        }
      }
      const matched = typed.filter(b => {
        if (catId === '__other__') return !catMap[b.categoryId];
        if (!top) return false;
        if (b.categoryId === catId) return true;
        const child = catMap[b.categoryId];
        return !!(child && child.parentId === catId);
      });
      const matchedTotal = matched.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
      const count = matched.length;
      const childMap = {};
      if (top) {
        matched.forEach(b => {
          const key = b.categoryId === catId ? '__self__' : b.categoryId;
          const child = b.categoryId === catId ? null : catMap[b.categoryId];
          if (!childMap[key]) {
            childMap[key] = {
              id: key,
              name: child ? child.name : '直接记在 ' + top.name,
              icon: child ? child.icon : top.icon,
              amount: 0,
              count: 0
            };
          }
          childMap[key].amount += Number(b.amount) || 0;
          childMap[key].count += 1;
        });
      }
      const rows = Object.keys(childMap).map(k => childMap[k]).sort((a, b) => b.amount - a.amount).map(r => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        amountText: money.money(r.amount, hide),
        percentText: money.percentText(r.amount, matchedTotal),
        width: matchedTotal ? Math.max(2, r.amount / matchedTotal * 100) : 0,
        count: r.count
      }));
      const records = matched.slice(0, RECORD_LIMIT).map(b => {
        const child = catMap[b.categoryId];
        const isSelf = b.categoryId === catId;
        const recordIcon = child ? child.icon : top ? top.icon : '🏷️';
        const recordColor = child ? top ? top.color : child.color : color;
        const acc = accMap[b.accountId];
        let noteText = b.note || '';
        if (!noteText) noteText = acc ? acc.name : '无备注';
        return {
          id: b.id,
          icon: recordIcon,
          tint: hexToRgba(recordColor, 0.13),
          name: child && !isSelf ? top.name + ' · ' + child.name : top ? top.name : '未分类',
          dateText: dateUtil.dateLabel(b.date) + ' ' + dateUtil.weekOf(b.date),
          time: b.time || '',
          note: noteText,
          amountText: hide ? '****' : money.formatCents(b.amount),
          hasImages: !!(b.images && b.images.length)
        };
      });
      this.setData({
        title,
        icon,
        color,
        tint: hexToRgba(color, 0.13),
        totalText: money.money(matchedTotal, hide),
        count,
        percentText: typeTotal ? money.percentText(matchedTotal, typeTotal) : '0%',
        avgText: count ? money.money(Math.round(matchedTotal / count), hide) : '—',
        rows,
        hasRows: rows.length > 1,
        records,
        recordCount: count,
        limitTip: count > RECORD_LIMIT ? '仅展示最近 ' + RECORD_LIMIT + ' 笔，共 ' + count + ' 笔' : '',
        hideAmount: hide
      });
    },
    editBill(e) {
      const id = e.currentTarget.dataset.id;
      uni.navigateTo({
        url: '/pages/edit/edit?id=' + id
      });
    },
    goList() {
      uni.reLaunch({
        url: '/pages/list/list'
      });
    }
  }
};</script>

<style scoped>
.cs-page {
  min-height: 100vh;
  padding: 18rpx 26rpx 60rpx;
  background: #F6F7F9;
}

.cs-hero {
  background: linear-gradient(140deg, #00B578 0%, #00A76B 100%);
  border-radius: 30rpx;
  padding: 28rpx 32rpx 24rpx;
  color: #FFFFFF;
  box-shadow: 0 16rpx 34rpx rgba(0,181,120, 0.18);
}

.hero-top {
  display: flex;
  align-items: center;
}

.hero-icon {
  width: 78rpx;
  height: 78rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  background: rgba(255, 255, 255, 0.92);
  flex-shrink: 0;
}

.hero-title-box {
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
}

.hero-title {
  font-size: 31rpx;
  font-weight: 600;
}

.hero-sub {
  font-size: 21rpx;
  opacity: 0.75;
  margin-top: 2rpx;
}

.hero-total {
  font-size: 62rpx;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-top: 18rpx;
}

.hero-meta {
  display: flex;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.16);
}

.hm-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hm-cap {
  font-size: 20rpx;
  opacity: 0.68;
}

.hm-val {
  font-size: 26rpx;
  margin-top: 4rpx;
}

.break-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 10rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.br-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.br-row:last-child {
  border-bottom: none;
}

.br-head {
  display: flex;
  align-items: center;
}

.br-icon {
  font-size: 28rpx;
  margin-right: 10rpx;
}

.br-name {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #1F2329;
}

.br-count {
  font-size: 20rpx;
  color: #86909C;
  margin-right: 16rpx;
}

.br-amount {
  font-size: 26rpx;
  font-weight: 600;
  color: #1F2329;
}

.br-bar {
  height: 6rpx;
  border-radius: 99rpx;
  background: #F2F3F5;
  margin: 12rpx 0 8rpx;
  overflow: hidden;
}

.br-fill {
  height: 100%;
  border-radius: 99rpx;
  transition: width 0.25s ease;
}

.br-percent {
  font-size: 19rpx;
  color: #86909C;
}

.rec-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.rec-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.rec-row:last-child {
  border-bottom: none;
}

.rec-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.rec-main {
  flex: 1;
  min-width: 0;
  padding: 0 16rpx;
}

.rec-name {
  font-size: 27rpx;
  font-weight: 500;
  color: #1F2329;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.rec-attach {
  font-size: 19rpx;
  margin-left: 8rpx;
  opacity: 0.6;
}

.rec-note {
  display: block;
  font-size: 21rpx;
  color: #86909C;
  margin-top: 4rpx;
  max-width: 100%;
}

.rec-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.rec-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2329;
}

.rec-date {
  font-size: 19rpx;
  color: #C9CDD4;
  margin-top: 4rpx;
}

.empty-btn {
  margin-top: 30rpx;
  width: 280rpx;
  height: 80rpx;
  line-height: 80rpx;
}

.limit-tip {
  text-align: center;
  font-size: 20rpx;
  color: #C9CDD4;
  padding: 22rpx 0 8rpx;
}
</style>
