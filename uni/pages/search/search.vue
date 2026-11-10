<template>
<view class="search-page">
  <view class="search-head">
    <view class="search-box">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        :value="(keyword)"
        placeholder="搜索备注关键词，如 午饭、打车"
        placeholder-class="placeholder"
        confirm-type="search"
        :focus="(true)"
        @input="onInput"
        @confirm="onConfirm"
      />
      <view class="clear-btn" v-if="keyword" @tap="clearKeyword">×</view>
    </view>
    <view class="search-meta" v-if="hasSearched">
      <text class="sm-count">找到 {{totalMatched}} 笔</text>
      <view class="sm-sums">
        <text class="sm-sum expense" v-if="expenseText">支出 {{expenseText}}</text>
        <text class="sm-sum income" v-if="incomeText">收入 {{incomeText}}</text>
      </view>
    </view>
  </view>

  <view class="result-card" v-if="results.length">
    <view class="result-row" v-for="(item, index) in results" :key="item.id" :data-id="(item.id)" @tap="editBill">
      <view class="r-icon" :style="'background: ' + (item.tint)">{{item.icon}}</view>
      <view class="r-main">
        <view class="r-name-line">
          <text class="r-name ellipsis">{{item.name}}</text>
          <text class="r-date">{{item.dateText}}</text>
        </view>
        <view class="r-note ellipsis">
          <text v-for="(part, index) in item.noteParts" :key="index" :class="(part.hit ? 'hit' : '')">{{part.t}}</text>
          <text class="r-attach" v-if="item.hasImages">📎</text>
        </view>
      </view>
      <view class="r-right">
        <text :class="'r-amount num ' + (item.amountClass)">{{item.amountText}}</text>
        <text class="r-time">{{item.time}}</text>
      </view>
    </view>
  </view>

  <view class="limit-tip" v-if="limitTip">{{limitTip}}</view>

  <view class="empty" v-if="hasSearched && results.length === 0">
    <view class="empty-icon">🔍</view>
    <view class="empty-title">没有找到相关备注</view>
    <view class="empty-desc">备注里没有「{{keyword}}」，换个关键词，或去记一笔带备注的账</view>
    <view class="btn-ghost empty-btn" @tap="goRecord">去记一笔</view>
  </view>

  <view class="empty" v-if="!hasSearched">
    <view class="empty-icon">🔍</view>
    <view class="empty-title">搜索备注</view>
    <view class="empty-desc">支持搜索所有月份的账单备注，试试「午饭」「打车」「超市」</view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
const RESULT_LIMIT = 300;
function hexToRgba(hex, alpha) {
  const value = String(hex || '#86909C').replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function highlightParts(text, keyword) {
  const source = String(text || '');
  const key = String(keyword || '');
  if (!key) return [{
    t: source,
    hit: false
  }];
  const lowerSource = source.toLowerCase();
  const lowerKey = key.toLowerCase();
  const parts = [];
  let pos = 0;
  let index = lowerSource.indexOf(lowerKey);
  while (index >= 0) {
    if (index > pos) parts.push({
      t: source.slice(pos, index),
      hit: false
    });
    parts.push({
      t: source.slice(index, index + lowerKey.length),
      hit: true
    });
    pos = index + lowerKey.length;
    index = lowerSource.indexOf(lowerKey, pos);
  }
  if (pos < source.length) parts.push({
    t: source.slice(pos),
    hit: false
  });
  return parts.length ? parts : [{
    t: source,
    hit: false
  }];
}
export default {
  data() {
    return {
      keyword: '',
      results: [],
      totalMatched: 0,
      limitTip: '',
      hasSearched: false,
      expenseText: '',
      incomeText: '',
      hideAmount: false
    };
  },
  onShow() {
    const hide = !!store.getSettings().hideAmount;
    if (hide !== this.hideAmount) this.setData({
      hideAmount: hide
    });
    if (this.keyword.trim()) this.search(true);
  },
  onUnload() {
    if (this.timer) clearTimeout(this.timer);
  },
  methods: {
    onInput(e) {
      const keyword = e.detail.value;
      this.setData({
        keyword
      });
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.search(true), 260);
    },
    onConfirm(e) {
      if (this.timer) clearTimeout(this.timer);
      this.setData({
        keyword: e.detail.value || this.keyword
      });
      this.search(true);
    },
    clearKeyword() {
      if (this.timer) clearTimeout(this.timer);
      this.setData({
        keyword: '',
        results: [],
        totalMatched: 0,
        hasSearched: false,
        limitTip: '',
        expenseText: '',
        incomeText: ''
      });
    },
    search() {
      const keyword = String(this.keyword || '').trim();
      if (!keyword) {
        this.setData({
          results: [],
          totalMatched: 0,
          hasSearched: false,
          limitTip: '',
          expenseText: '',
          incomeText: ''
        });
        return;
      }
      const hide = this.hideAmount;
      const lowerKey = keyword.toLowerCase();
      const bills = store.allBills().filter(b => String(b.note || '').toLowerCase().indexOf(lowerKey) >= 0);
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
      let expense = 0;
      let income = 0;
      bills.forEach(b => {
        if (b.type === 'expense') expense += Number(b.amount) || 0;
        if (b.type === 'income') income += Number(b.amount) || 0;
      });
      const results = bills.slice(0, RESULT_LIMIT).map(b => {
        const isTransfer = b.type === 'transfer';
        const cat = catMap[b.categoryId];
        const icon = isTransfer ? '⇄' : cat ? cat.icon : '🏷️';
        const color = isTransfer ? '#86909C' : cat ? cat.color : '#86909C';
        const acc = accMap[b.accountId];
        let name = isTransfer ? '账户转账' : cat ? store.categoryDisplayName(b.categoryId) : '未分类';
        const sign = b.type === 'expense' ? '-' : b.type === 'income' ? '+' : '';
        return {
          id: b.id,
          icon,
          tint: hexToRgba(color, 0.13),
          name,
          dateText: dateUtil.dateLabel(b.date),
          time: b.time || '',
          noteParts: highlightParts(b.note, keyword),
          accountText: acc ? acc.name : '',
          amountText: hide ? '****' : sign + money.formatCents(b.amount),
          amountClass: b.type,
          hasImages: !!(b.images && b.images.length)
        };
      });
      this.setData({
        results,
        totalMatched: bills.length,
        hasSearched: true,
        expenseText: expense ? money.money(expense, hide) : '',
        incomeText: income ? money.money(income, hide) : '',
        limitTip: bills.length > RESULT_LIMIT ? '仅展示前 ' + RESULT_LIMIT + ' 笔，换个更精确的关键词试试' : ''
      });
    },
    editBill(e) {
      const id = e.currentTarget.dataset.id;
      uni.navigateTo({
        url: '/pages/edit/edit?id=' + id
      });
    },
    goRecord() {
      uni.reLaunch({
        url: '/pages/record/record'
      });
    }
  }
};</script>

<style scoped>
.search-page {
  min-height: 100vh;
  padding: 0 26rpx 60rpx;
  background: #F6F7F9;
}

.search-head {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #F6F7F9;
  padding: 16rpx 0 14rpx;
}

.search-box {
  display: flex;
  align-items: center;
  height: 84rpx;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  border-radius: 999rpx;
  padding: 0 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(31,35,41, 0.04);
}

.search-icon {
  font-size: 30rpx;
  margin-right: 12rpx;
  opacity: 0.8;
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  height: 60rpx;
}

.clear-btn {
  width: 48rpx;
  height: 48rpx;
  line-height: 46rpx;
  text-align: center;
  border-radius: 50%;
  background: #EEF1F5;
  color: #86909C;
  font-size: 26rpx;
  flex-shrink: 0;
}

.search-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 8rpx 4rpx;
}

.sm-count {
  font-size: 22rpx;
  color: #86909C;
}

.sm-sums {
  display: flex;
  align-items: center;
}

.sm-sum {
  font-size: 21rpx;
  margin-left: 16rpx;
  color: #86909C;
}

.sm-sum.expense {
  color: #FA5151;
}

.sm-sum.income {
  color: #00A76B;
}

.result-card {
  margin-top: 10rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.result-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.result-row:last-child {
  border-bottom: none;
}

.r-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.r-main {
  flex: 1;
  min-width: 0;
  padding: 0 16rpx;
}

.r-name-line {
  display: flex;
  align-items: center;
}

.r-name {
  font-size: 27rpx;
  font-weight: 500;
  color: #1F2329;
  max-width: 330rpx;
}

.r-date {
  font-size: 19rpx;
  color: #C9CDD4;
  margin-left: 10rpx;
  flex-shrink: 0;
}

.r-note {
  display: block;
  margin-top: 5rpx;
  font-size: 23rpx;
  color: #86909C;
  max-width: 100%;
}

.hit {
  color: #FA5151;
  font-weight: 600;
  background: #FDEBEB;
  border-radius: 4rpx;
  padding: 0 2rpx;
}

.r-attach {
  font-size: 19rpx;
  margin-left: 6rpx;
  opacity: 0.6;
}

.r-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.r-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2329;
}

.r-amount.income {
  color: #00A76B;
}

.r-amount.transfer {
  color: #86909C;
  font-weight: 500;
}

.r-time {
  font-size: 19rpx;
  color: #C9CDD4;
  margin-top: 4rpx;
}

.limit-tip {
  text-align: center;
  font-size: 20rpx;
  color: #C9CDD4;
  padding: 22rpx 0 6rpx;
}

.empty-btn {
  margin-top: 30rpx;
  width: 280rpx;
  height: 80rpx;
  line-height: 80rpx;
}
</style>
