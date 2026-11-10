<template>
<view class="cal-page">
  <view class="cal-head">
    <view class="nav">
      <view class="nav-arrow" data-dir="-1" @tap="shift">‹</view>
      <text class="nav-label">{{ymLabel}}</text>
      <view class="nav-arrow" data-dir="1" @tap="shift">›</view>
    </view>
    <view class="today-btn" v-if="ym !== currentYm" @tap="goToday">回到本月</view>
  </view>

  <view class="month-strip">
    <view class="ms-item">
      <text class="ms-cap">本月支出</text>
      <text class="ms-val num expense">{{monthExpenseText}}</text>
    </view>
    <view class="ms-item">
      <text class="ms-cap">本月收入</text>
      <text class="ms-val num income">{{monthIncomeText}}</text>
    </view>
    <view class="ms-item small-item">
      <text class="ms-cap">记账</text>
      <text class="ms-val num">{{monthCount}} 笔</text>
    </view>
  </view>

  <view class="cal-card">
    <view class="week-row">
      <text class="week-cell" v-for="(item, index) in weekLabels" :key="index">{{item}}</text>
    </view>
    <view class="days-grid">
      <view
        :class="'day-cell ' + (item.day === 0 ? 'blank' : '') + ' ' + (item.isSelected ? 'selected' : '') + ' ' + (item.isToday ? 'today' : '')"
        v-for="(item, index) in cells"
        :key="item.key"
        :data-date="(item.date)"
        @tap="selectDay"
      >
        <text class="day-num">{{item.day > 0 ? item.day : ''}}</text>
        <view :class="'dot ' + (item.dotClass)" v-if="item.hasBill"></view>
      </view>
    </view>
    <view class="legend">
      <view class="lg-item"><view class="dot expense"></view><text>有支出</text></view>
      <view class="lg-item"><view class="dot income"></view><text>有收入</text></view>
      <text class="lg-days">本月记账 {{monthDays}} 天</text>
    </view>
  </view>

  <view class="day-panel">
    <view class="dp-head">
      <view class="dp-date-box">
        <text class="dp-date">{{selectedLabel}}</text>
        <text class="dp-week">{{selectedWeek}}</text>
      </view>
      <view class="dp-sums">
        <text class="dp-sum expense" v-if="daySummary.expenseText">支出 {{daySummary.expenseText}}</text>
        <text class="dp-sum income" v-if="daySummary.incomeText">收入 {{daySummary.incomeText}}</text>
      </view>
    </view>

    <view class="dp-card" v-if="dayBills.length">
      <view class="bill-row" v-for="(item, index) in dayBills" :key="item.id" :data-id="(item.id)" @tap="editBill" @longpress="deleteBill">
        <view class="bill-icon" :style="'background: ' + (item.tint)">{{item.icon}}</view>
        <view class="bill-main">
          <view class="bill-name">{{item.name}}<text class="bill-attach" v-if="item.hasImages">📎</text></view>
          <view class="bill-sub ellipsis">{{item.sub}}</view>
        </view>
        <view class="bill-right">
          <text :class="'bill-amount num ' + (item.amountClass)">{{item.amountText}}</text>
          <text class="bill-time">{{item.time}}</text>
        </view>
      </view>
    </view>

    <view class="day-empty" v-else>
      <text class="de-title">这一天还没有记录</text>
      <text class="de-desc">点击下方按钮，补记一笔</text>
      <view class="btn-mini primary-bg de-btn" @tap="goRecord">去记一笔</view>
    </view>
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
      currentYm: '',
      weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
      cells: [],
      selectedDate: '',
      selectedLabel: '',
      selectedWeek: '',
      dayBills: [],
      daySummary: {
        expenseText: '',
        incomeText: ''
      },
      monthExpenseText: '',
      monthIncomeText: '',
      monthCount: 0,
      monthDays: 0,
      hideAmount: false
    };
  },
  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr());
    const ym = query && /^\d{4}-\d{2}$/.test(query.ym || '') ? query.ym : currentYm;
    this.setData({
      ym,
      ymLabel: dateUtil.monthLabel(ym),
      currentYm
    });
    this.pickDefaultDay();
    this.refresh();
  },
  onShow() {
    if (this.ym) this.refresh();
  },
  methods: {
    pickDefaultDay() {
      const ym = this.ym;
      let selectedDate = ym + '-01';
      if (ym === this.currentYm) {
        selectedDate = dateUtil.todayStr();
      } else {
        const bills = store.getMonthBills(ym);
        const days = bills.map(b => b.date).filter(d => d && d.slice(0, 7) === ym).sort();
        if (days.length) selectedDate = days[0];
      }
      this.setData({
        selectedDate
      });
    },
    refresh() {
      const hide = !!store.getSettings().hideAmount;
      this.setData({
        hideAmount: hide
      });
      this.buildCalendar(hide);
      this.loadDay(hide);
    },
    buildCalendar(hide) {
      const useHide = typeof hide === 'boolean' ? hide : this.hideAmount;
      const ym = this.ym;
      const bills = store.getMonthBills(ym);
      this.monthBills = bills;
      const dateMap = {};
      bills.forEach(b => {
        if (!b.date) return;
        if (!dateMap[b.date]) dateMap[b.date] = {
          hasExpense: false,
          hasIncome: false
        };
        if (b.type === 'expense') dateMap[b.date].hasExpense = true;
        if (b.type === 'income') dateMap[b.date].hasIncome = true;
      });
      const y = Number(ym.slice(0, 4));
      const m = Number(ym.slice(5, 7));
      const firstWeekday = new Date(y, m - 1, 1).getDay();
      const n = dateUtil.daysInMonth(ym);
      const today = dateUtil.todayStr();
      const cells = [];
      for (let i = 0; i < firstWeekday; i++) {
        cells.push({
          key: 'blank-' + i,
          day: 0,
          date: '',
          hasBill: false,
          dotClass: ''
        });
      }
      for (let d = 1; d <= n; d++) {
        const date = ym + '-' + dateUtil.pad2(d);
        const info = dateMap[date];
        cells.push({
          key: date,
          day: d,
          date,
          hasBill: !!info,
          dotClass: info ? info.hasExpense ? 'expense' : 'income' : '',
          isToday: date === today,
          isSelected: date === this.selectedDate
        });
      }
      const rest = (7 - cells.length % 7) % 7;
      for (let i = 0; i < rest; i++) {
        cells.push({
          key: 'tail-' + i,
          day: 0,
          date: '',
          hasBill: false,
          dotClass: ''
        });
      }
      const totals = store.monthTotals(ym);
      this.setData({
        cells,
        monthExpenseText: money.money(totals.expense, useHide),
        monthIncomeText: money.money(totals.income, useHide),
        monthCount: bills.length,
        monthDays: Object.keys(dateMap).length
      });
    },
    loadDay(hide) {
      const date = this.selectedDate;
      if (!date) return;
      const useHide = typeof hide === 'boolean' ? hide : this.hideAmount;
      const bills = (this.monthBills || []).filter(b => b.date === date);
      const categories = store.getCategories();
      const accounts = store.getAccounts();
      const catMap = {};
      categories.forEach(c => {
        catMap[c.id] = c;
      });
      const accMap = {};
      accounts.forEach(a => {
        accMap[a.id] = a;
      });
      let expense = 0;
      let income = 0;
      const items = bills.map(bill => {
        const isTransfer = bill.type === 'transfer';
        const cat = catMap[bill.categoryId];
        const icon = isTransfer ? '⇄' : cat ? cat.icon : '🏷️';
        const color = isTransfer ? '#86909C' : cat ? cat.color : '#86909C';
        const name = isTransfer ? '账户转账' : cat ? cat.name : '未分类';
        let sub = '';
        if (isTransfer) {
          const from = accMap[bill.accountId] ? accMap[bill.accountId].name : '未知账户';
          const to = accMap[bill.toAccountId] ? accMap[bill.toAccountId].name : '未知账户';
          sub = from + ' → ' + to;
          if (bill.note) sub += ' · ' + bill.note;
        } else {
          const acc = accMap[bill.accountId];
          sub = bill.note || (acc ? acc.name : '');
        }
        if (bill.type === 'expense') expense += bill.amount;
        if (bill.type === 'income') income += bill.amount;
        const sign = bill.type === 'expense' ? '-' : bill.type === 'income' ? '+' : '';
        return {
          id: bill.id,
          icon,
          tint: hexToRgba(color, 0.13),
          name,
          sub,
          time: bill.time || '',
          amountText: useHide ? '****' : sign + money.formatCents(bill.amount),
          amountClass: bill.type,
          hasImages: !!(bill.images && bill.images.length)
        };
      });
      this.setData({
        dayBills: items,
        selectedLabel: dateUtil.dateLabel(date),
        selectedWeek: dateUtil.weekOf(date),
        daySummary: {
          expenseText: expense ? money.money(expense, useHide) : '',
          incomeText: income ? money.money(income, useHide) : ''
        }
      });
    },
    selectDay(e) {
      const date = e.currentTarget.dataset.date;
      if (!date) return;
      this.setData({
        selectedDate: date
      });
      this.buildCalendar();
      this.loadDay();
    },
    shift(e) {
      const dir = Number(e.currentTarget.dataset.dir);
      const ym = dateUtil.addMonths(this.ym, dir);
      this.setData({
        ym,
        ymLabel: dateUtil.monthLabel(ym)
      });
      this.pickDefaultDay();
      this.refresh();
    },
    goToday() {
      this.setData({
        ym: this.currentYm,
        ymLabel: dateUtil.monthLabel(this.currentYm)
      });
      this.setData({
        selectedDate: dateUtil.todayStr()
      });
      this.refresh();
    },
    editBill(e) {
      const id = e.currentTarget.dataset.id;
      uni.navigateTo({
        url: '/pages/edit/edit?id=' + id
      });
    },
    deleteBill(e) {
      const id = e.currentTarget.dataset.id;
      uni.showModal({
        title: '删除这笔记录',
        content: '删除后不可恢复，账户余额与统计会同步更新。',
        confirmText: '删除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          if (store.deleteBill(id).ok) {
            uni.showToast({
              title: '已删除',
              icon: 'none'
            });
            this.refresh();
          }
        }
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
.cal-page {
  min-height: 100vh;
  padding: 18rpx 26rpx 60rpx;
  background: #F6F7F9;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 4rpx 18rpx;
}

.nav {
  display: flex;
  align-items: center;
}

.nav-arrow {
  width: 52rpx;
  height: 52rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  background: #EEF1F5;
  color: #4E5969;
  font-size: 36rpx;
}

.nav-label {
  font-size: 34rpx;
  font-weight: 600;
  margin: 0 18rpx;
  min-width: 200rpx;
  text-align: center;
}

.today-btn {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  font-size: 23rpx;
  color: #00B578;
}

.month-strip {
  display: flex;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 22rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.ms-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ms-item.small-item {
  flex: 0 0 auto;
  min-width: 150rpx;
  text-align: right;
}

.ms-cap {
  font-size: 21rpx;
  color: #86909C;
}

.ms-val {
  margin-top: 4rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1F2329;
}

.ms-val.expense {
  color: #FA5151;
}

.ms-val.income {
  color: #00A76B;
}

.cal-card {
  margin-top: 20rpx;
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 20rpx 14rpx 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.week-row {
  display: flex;
  padding-bottom: 10rpx;
}

.week-cell {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  color: #86909C;
}

.days-grid {
  display: flex;
  flex-wrap: wrap;
}

.day-cell {
  width: 14.2857%;
  height: 94rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.day-cell.blank {
  visibility: hidden;
}

.day-num {
  font-size: 26rpx;
  color: #4E5969;
  width: 60rpx;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  border-radius: 50%;
  font-family: "DIN Alternate", "Bahnschrift", sans-serif;
}

.day-cell.today .day-num {
  color: #00B578;
  font-weight: 600;
}

.day-cell.selected .day-num {
  background: #00B578;
  color: #FFFFFF;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #FA5151;
  margin-top: 3rpx;
}

.dot.income {
  background: #00A76B;
}

.day-cell.selected .dot {
  background: #FFFFFF;
  opacity: 0.85;
}

.legend {
  display: flex;
  align-items: center;
  padding: 14rpx 12rpx 0;
  border-top: 1rpx solid #EEF1F5;
  margin-top: 6rpx;
}

.lg-item {
  display: flex;
  align-items: center;
  margin-right: 24rpx;
  font-size: 20rpx;
  color: #86909C;
}

.lg-item .dot {
  margin: 0 8rpx 0 0;
}

.lg-days {
  margin-left: auto;
  font-size: 20rpx;
  color: #C9CDD4;
}

.day-panel {
  margin-top: 26rpx;
}

.dp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 12rpx;
}

.dp-date-box {
  display: flex;
  align-items: baseline;
}

.dp-date {
  font-size: 28rpx;
  font-weight: 600;
  color: #1F2329;
}

.dp-week {
  font-size: 21rpx;
  color: #86909C;
  margin-left: 10rpx;
}

.dp-sums {
  display: flex;
  align-items: center;
}

.dp-sum {
  font-size: 21rpx;
  margin-left: 14rpx;
  color: #86909C;
}

.dp-sum.expense {
  color: #FA5151;
}

.dp-sum.income {
  color: #00A76B;
}

.dp-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 22rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.bill-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.bill-row:last-child {
  border-bottom: none;
}

.bill-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  flex-shrink: 0;
}

.bill-main {
  flex: 1;
  min-width: 0;
  padding: 0 18rpx;
}

.bill-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #1F2329;
  display: flex;
  align-items: center;
}

.bill-attach {
  font-size: 20rpx;
  margin-left: 8rpx;
  opacity: 0.6;
}

.bill-sub {
  font-size: 22rpx;
  color: #86909C;
  margin-top: 4rpx;
  max-width: 100%;
}

.bill-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.bill-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #1F2329;
}

.bill-amount.income {
  color: #00A76B;
}

.bill-amount.transfer {
  color: #86909C;
  font-weight: 500;
}

.bill-time {
  font-size: 19rpx;
  color: #C9CDD4;
  margin-top: 4rpx;
}

.day-empty {
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 22rpx;
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.de-title {
  font-size: 25rpx;
  color: #4E5969;
}

.de-desc {
  font-size: 21rpx;
  color: #86909C;
  margin-top: 6rpx;
}

.de-btn {
  margin-top: 20rpx;
  height: 64rpx;
  padding: 0 34rpx;
}
</style>
