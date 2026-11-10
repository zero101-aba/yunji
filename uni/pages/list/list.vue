<template>
<view class="list-page" @touchstart="onTouchStart" @touchend="onTouchEnd">
  <view class="pg-body" :class="navDir === 1 ? 'pg-in-next' : navDir === -1 ? 'pg-in-prev' : ''">
  <view class="sticky-head">
    <view class="head-row">
      <view class="month-box">
        <view class="month-arrow" @tap.stop="prevMonth">‹</view>
        <text class="month-label">{{ymLabel}}</text>
        <view class="month-arrow" @tap.stop="nextMonth">›</view>
      </view>
      <view class="tools">
        <view class="tool" @tap="goSearch">搜索</view>
        <view :class="'tool ' + (hasFilter ? 'tool-on' : '')" @tap="openFilter">筛选</view>
        <view class="tool" @tap="goCalendar">日历</view>
      </view>
    </view>

    <view class="summary-card">
      <view class="sum-cols">
        <view class="sum-col">
          <text class="sum-col-cap">本月支出</text>
          <text class="sum-col-val num sum-expense">{{summary.expenseText}}</text>
        </view>
        <view class="sum-col">
          <text class="sum-col-cap">本月收入</text>
          <text class="sum-col-val num sum-income">{{summary.incomeText}}</text>
        </view>
        <view class="sum-col">
          <text class="sum-col-cap">本月结余</text>
          <text :class="'sum-col-val num sum-balance ' + (summary.balanceClass)">{{summary.balanceText}}</text>
        </view>
      </view>
    </view>

    <view class="filter-bar" v-if="hasFilter">
      <view class="filter-chips">
        <view class="filter-chip" v-for="(item, index) in filterChips" :key="item.key">
          <text>{{item.label}}</text>
          <text class="chip-x" :data-key="(item.key)" @tap.stop="removeChip">×</text>
        </view>
        <view class="filter-clear" @tap.stop="resetFilter">清除</view>
      </view>
      <view class="filter-result">{{totalFiltered}} 笔 · {{filterResultText}}</view>
    </view>
  </view>

  <view class="group" v-for="(group, index) in groups" :key="group.date">
    <view class="group-head">
      <view class="gh-left">
        <text class="gh-date">{{group.dateText}}</text>
        <text class="gh-week">{{group.week}}</text>
        <text class="today-chip" v-if="group.isToday">今天</text>
      </view>
      <view class="gh-right">
        <text class="gh-sum" v-if="group.expenseText">支 {{group.expenseText}}</text>
        <text class="gh-sum" v-if="group.incomeText">收 {{group.incomeText}}</text>
      </view>
    </view>
    <view class="group-card">
      <view class="bill-row" v-for="(bill, index) in group.items" :key="bill.id" :data-id="(bill.id)" @tap="editBill" @longpress="deleteBill">
        <view class="bill-icon" :style="'background: ' + (bill.tint)">{{bill.icon}}</view>
        <view class="bill-main">
          <view class="bill-name">{{bill.name}}<text class="bill-attach" v-if="bill.hasImages">📎</text></view>
          <view class="bill-sub ellipsis">{{bill.sub}}</view>
        </view>
        <view class="bill-right">
          <text :class="'bill-amount num ' + (bill.amountClass)">{{bill.amountText}}</text>
          <text class="bill-time">{{bill.time}}</text>
        </view>
      </view>
    </view>
  </view>

  <view class="empty" v-if="monthEmpty">
    <view class="empty-icon">🧾</view>
    <view class="empty-title">这个月还没有记录</view>
    <view class="empty-desc">随手记下第一笔，月底就知道钱花在哪了</view>
    <view class="btn-primary empty-btn" @tap="goRecord">记一笔</view>
  </view>

  <view class="empty" v-else-if="totalFiltered === 0">
    <view class="empty-icon">🔍</view>
    <view class="empty-title">没有符合条件的记录</view>
    <view class="empty-desc">换个筛选条件试试</view>
    <view class="btn-ghost empty-btn" @tap.stop="resetFilter">清除筛选</view>
  </view>

  <view class="list-foot" v-if="groups.length">
    <text>{{hasMore ? '上拉加载更多' : '— 已加载全部 —'}}</text>
  </view>

  <view class="fab" @tap="goRecord">＋</view>

  <!-- 筛选面板 -->
  <view class="sheet-mask" v-if="sheet === 'filter'" @tap="closeSheet">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">筛选</text>
        <view class="sheet-close" @tap="closeSheet">×</view>
      </view>

      <view class="section-label">收支类型</view>
      <view class="type-chips">
        <view :class="'chip ' + (draftType === 'all' ? 'on' : '')" data-type="all" @tap="onFilterType">全部</view>
        <view :class="'chip ' + (draftType === 'expense' ? 'on' : '')" data-type="expense" @tap="onFilterType">支出</view>
        <view :class="'chip ' + (draftType === 'income' ? 'on' : '')" data-type="income" @tap="onFilterType">收入</view>
        <view :class="'chip ' + (draftType === 'transfer' ? 'on' : '')" data-type="transfer" @tap="onFilterType">转账</view>
      </view>

      <view class="form-card">
        <picker mode="selector" :range="(filterCatOptions)" range-key="name" :value="(filterCatIndex)" @change="onFilterCategory">
          <view class="form-row">
            <text class="form-label">分类</text>
            <view class="form-value">{{filterCatName}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
        <picker mode="selector" :range="(filterAccountOptions)" range-key="name" :value="(filterAccountIndex)" @change="onFilterAccount">
          <view class="form-row">
            <text class="form-label">账户</text>
            <view class="form-value">{{filterAccountName}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
        <view class="form-row">
          <text class="form-label">最低金额</text>
          <input class="form-input" type="digit" :value="(draftMin)" placeholder="不限" placeholder-class="placeholder" @input="onFilterMin" />
        </view>
        <view class="form-row">
          <text class="form-label">最高金额</text>
          <input class="form-input" type="digit" :value="(draftMax)" placeholder="不限" placeholder-class="placeholder" @input="onFilterMax" />
        </view>
      </view>

      <view class="filter-actions">
        <view class="btn-ghost flex1" @tap="resetFilter">清除全部</view>
        <view class="btn-primary flex1 apply-btn" @tap="applyFilter">应用筛选</view>
      </view>
    </view>
  </view>

  </view>
  <x-tabbar current="list" />
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
import tabnav from '../../utils/tabnav.js';
function hexToRgba(hex, alpha) {
  const value = String(hex || '#86909C').replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
const PAGE_SIZE = 30;
export default {
  data() {
    return {
      navDir: 0,
      ym: '',
      ymLabel: '',
      hideAmount: false,
      summary: {},
      groups: [],
      loaded: PAGE_SIZE,
      totalFiltered: 0,
      hasMore: false,
      monthEmpty: true,
      filterChips: [],
      hasFilter: false,
      filterResultText: '',
      sheet: '',
      draftType: 'all',
      draftCategoryId: '',
      draftAccountId: '',
      draftMin: '',
      draftMax: '',
      filterCatOptions: [],
      filterCatIndex: 0,
      filterCatName: '全部分类',
      filterAccountOptions: [],
      filterAccountIndex: 0,
      filterAccountName: '全部账户'
    };
  },
  onLoad() {
    const ym = dateUtil.ymOf(dateUtil.todayStr());
    this.setData({
      ym,
      ymLabel: dateUtil.monthLabel(ym)
    });
    this.monthBills = [];
    this.activeFilter = {
      type: 'all',
      categoryId: '',
      accountId: '',
      minCents: null,
      maxCents: null
    };
    this.setData({
      loaded: PAGE_SIZE
    });
  },
  onShow() {
    const nav = tabnav.take();
    if (nav && nav.key === 'list') {
      this.navDir = nav.dir;
      setTimeout(() => {
        this.navDir = 0;
      }, 400);
    }
    const settings = store.getSettings();
    this.setData({
      hideAmount: !!settings.hideAmount
    });
    this.refresh(true);
  },
  onReachBottom() {
    if (!this.hasMore) return;
    this.setData({
      loaded: this.loaded + PAGE_SIZE
    });
    this.apply();
  },
  methods: {
    refresh(resetPage) {
      this.monthBills = store.getMonthBills(this.ym);
      if (resetPage) this.setData({
        loaded: PAGE_SIZE
      });
      this.apply();
    },
    apply() {
      const hide = this.hideAmount;
      const totals = store.monthTotals(this.ym);
      const filtered = this.filterBills(this.monthBills);
      const loaded = Math.min(filtered.length, this.loaded);
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
      const groupsMap = {};
      const groupOrder = [];
      filtered.slice(0, loaded).forEach(bill => {
        const c = catMap[bill.categoryId];
        const isTransfer = bill.type === 'transfer';
        const icon = isTransfer ? '⇄' : c ? c.icon : '🏷️';
        const color = isTransfer ? '#86909C' : c ? c.color : '#86909C';
        const name = isTransfer ? '账户转账' : c ? c.name : '未分类';
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
        const sign = bill.type === 'expense' ? '-' : bill.type === 'income' ? '+' : '';
        const amountText = hide ? '****' : sign + money.formatCents(bill.amount);
        const item = {
          id: bill.id,
          icon,
          tint: hexToRgba(color, 0.13),
          color,
          name,
          sub,
          amountText,
          amountClass: bill.type,
          time: bill.time || '',
          hasImages: !!(bill.images && bill.images.length)
        };
        if (!groupsMap[bill.date]) {
          groupsMap[bill.date] = {
            date: bill.date,
            dateText: dateUtil.dateLabel(bill.date),
            week: dateUtil.weekOf(bill.date),
            isToday: bill.date === dateUtil.todayStr(),
            dayExpense: 0,
            dayIncome: 0,
            items: []
          };
          groupOrder.push(bill.date);
        }
        const g = groupsMap[bill.date];
        g.items.push(item);
        if (bill.type === 'expense') g.dayExpense += bill.amount;
        if (bill.type === 'income') g.dayIncome += bill.amount;
      });
      const groups = groupOrder.map(date => {
        const g = groupsMap[date];
        return Object.assign({}, g, {
          expenseText: g.dayExpense ? hide ? '****' : money.formatCents(g.dayExpense) : '',
          incomeText: g.dayIncome ? hide ? '****' : money.formatCents(g.dayIncome) : ''
        });
      });
      let filterResultText = '';
      if (this.hasFilter) {
        let exp = 0;
        let inc = 0;
        let tr = 0;
        filtered.forEach(b => {
          if (b.type === 'expense') exp += b.amount;else if (b.type === 'income') inc += b.amount;else tr += b.amount;
        });
        if (this.activeFilter.type === 'transfer') {
          filterResultText = '转账合计 ' + money.money(tr, hide);
        } else if (this.activeFilter.type === 'income') {
          filterResultText = '收入合计 ' + money.money(inc, hide);
        } else if (this.activeFilter.type === 'expense') {
          filterResultText = '支出合计 ' + money.money(exp, hide);
        } else {
          filterResultText = '支出 ' + money.money(exp, hide) + ' · 收入 ' + money.money(inc, hide);
        }
      }
      this.setData({
        summary: {
          incomeText: money.money(totals.income, hide),
          expenseText: money.money(totals.expense, hide),
          balanceText: money.money(totals.balance, hide),
          balanceClass: totals.balance >= 0 ? 'pos' : 'neg'
        },
        groups,
        totalFiltered: filtered.length,
        hasMore: loaded < filtered.length,
        monthEmpty: this.monthBills.length === 0,
        filterResultText
      });
    },
    filterBills(list) {
      const f = this.activeFilter;
      return list.filter(b => {
        if (f.type !== 'all' && b.type !== f.type) return false;
        if (f.type === 'transfer' && b.type !== 'transfer') return false;
        if (f.categoryId) {
          if (b.categoryId !== f.categoryId) {
            const category = store.getCategory(f.categoryId);
            if (!category || category.parentId) return false;
            const child = store.getCategory(b.categoryId);
            if (!child || child.parentId !== f.categoryId) return false;
          }
        }
        if (f.accountId && b.accountId !== f.accountId && b.toAccountId !== f.accountId) return false;
        if (f.minCents !== null && b.amount < f.minCents) return false;
        if (f.maxCents !== null && b.amount > f.maxCents) return false;
        return true;
      });
    },
    prevMonth() {
      this.setData({
        ym: dateUtil.addMonths(this.ym, -1)
      });
      this.setData({
        ymLabel: dateUtil.monthLabel(this.ym),
        loaded: PAGE_SIZE
      });
      this.refresh(false);
    },
    nextMonth() {
      this.setData({
        ym: dateUtil.addMonths(this.ym, 1)
      });
      this.setData({
        ymLabel: dateUtil.monthLabel(this.ym),
        loaded: PAGE_SIZE
      });
      this.refresh(false);
    },
    onTouchStart(e) {
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      this.touchStart = {
        x: touch.clientX,
        y: touch.clientY
      };
    },
    onTouchEnd(e) {
      if (!this.touchStart) return;
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - this.touchStart.x;
      const dy = touch.clientY - this.touchStart.y;
      this.touchStart = null;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
        if (dx < 0) this.nextMonth();else this.prevMonth();
      }
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
          const result = store.deleteBill(id);
          if (result.ok) {
            uni.showToast({
              title: '已删除',
              icon: 'none'
            });
            this.refresh(true);
          }
        }
      });
    },
    goSearch() {
      uni.navigateTo({
        url: '/pages/search/search'
      });
    },
    goCalendar() {
      uni.navigateTo({
        url: '/pages/calendar/calendar?ym=' + this.ym
      });
    },
    goRecord() {
      uni.reLaunch({
        url: '/pages/record/record'
      });
    },
    /* ------- 筛选 ------- */
    openFilter() {
      const f = this.activeFilter;
      this.setData({
        sheet: 'filter',
        draftType: f.type,
        draftCategoryId: f.categoryId,
        draftAccountId: f.accountId,
        draftMin: f.minCents !== null ? money.centToInput(f.minCents) : '',
        draftMax: f.maxCents !== null ? money.centToInput(f.maxCents) : ''
      });
      this.buildFilterOptions(f.type, f.categoryId, f.accountId);
    },
    buildFilterOptions(type, categoryId, accountId) {
      const categories = store.getCategories();
      let catOptions = [{
        id: '',
        name: '全部分类'
      }];
      if (type === 'transfer') {
        catOptions = [{
          id: '',
          name: '转账无分类'
        }];
      } else {
        const filtered = categories.filter(c => type === 'all' ? true : c.type === type).sort((a, b) => cmpCategory(a, b, categories));
        filtered.forEach(c => {
          catOptions.push({
            id: c.id,
            name: store.categoryDisplayName(c.id)
          });
        });
      }
      const accounts = store.getAccounts();
      const accOptions = [{
        id: '',
        name: '全部账户'
      }].concat(accounts.map(a => ({
        id: a.id,
        name: a.name
      })));
      const catIndex = Math.max(0, catOptions.findIndex(o => o.id === categoryId));
      const accIndex = Math.max(0, accOptions.findIndex(o => o.id === accountId));
      this.setData({
        filterCatOptions: catOptions,
        filterCatIndex: catIndex,
        filterCatName: catOptions[catIndex].name,
        filterAccountOptions: accOptions,
        filterAccountIndex: accIndex,
        filterAccountName: accOptions[accIndex].name
      });
    },
    onFilterType(e) {
      const type = e.currentTarget.dataset.type;
      this.setData({
        draftType: type,
        draftCategoryId: ''
      });
      this.buildFilterOptions(type, '', this.draftAccountId);
    },
    onFilterCategory(e) {
      const index = Number(e.detail.value);
      const option = this.filterCatOptions[index];
      if (!option) return;
      this.setData({
        filterCatIndex: index,
        filterCatName: option.name,
        draftCategoryId: option.id
      });
    },
    onFilterAccount(e) {
      const index = Number(e.detail.value);
      const option = this.filterAccountOptions[index];
      if (!option) return;
      this.setData({
        filterAccountIndex: index,
        filterAccountName: option.name,
        draftAccountId: option.id
      });
    },
    onFilterMin(e) {
      this.setData({
        draftMin: e.detail.value
      });
    },
    onFilterMax(e) {
      this.setData({
        draftMax: e.detail.value
      });
    },
    applyFilter() {
      const draft = this.data;
      let minCents = null;
      let maxCents = null;
      if (draft.draftMin) {
        minCents = money.parseToCents(draft.draftMin);
        if (minCents === null) {
          uni.showToast({
            title: '最低金额格式有误',
            icon: 'none'
          });
          return;
        }
      }
      if (draft.draftMax) {
        maxCents = money.parseToCents(draft.draftMax);
        if (maxCents === null) {
          uni.showToast({
            title: '最高金额格式有误',
            icon: 'none'
          });
          return;
        }
      }
      if (minCents !== null && maxCents !== null && minCents > maxCents) {
        uni.showToast({
          title: '最低金额不能大于最高金额',
          icon: 'none'
        });
        return;
      }
      this.activeFilter = {
        type: draft.draftType,
        categoryId: draft.draftType === 'transfer' ? '' : draft.draftCategoryId,
        accountId: draft.draftAccountId,
        minCents,
        maxCents
      };
      const chips = [];
      if (draft.draftType !== 'all') {
        chips.push({
          key: 'type',
          label: {
            expense: '支出',
            income: '收入',
            transfer: '转账'
          }[draft.draftType]
        });
      }
      if (this.activeFilter.categoryId) {
        chips.push({
          key: 'category',
          label: store.categoryDisplayName(this.activeFilter.categoryId)
        });
      }
      if (this.activeFilter.accountId) {
        chips.push({
          key: 'account',
          label: store.accountName(this.activeFilter.accountId)
        });
      }
      if (minCents !== null || maxCents !== null) {
        chips.push({
          key: 'amount',
          label: (minCents !== null ? '≥' + money.centToInput(minCents) : '') + (minCents !== null && maxCents !== null ? ' ~ ' : '') + (maxCents !== null ? '≤' + money.centToInput(maxCents) : '')
        });
      }
      this.setData({
        hasFilter: chips.length > 0,
        filterChips: chips,
        sheet: '',
        loaded: PAGE_SIZE
      });
      this.apply();
    },
    resetFilter() {
      this.activeFilter = {
        type: 'all',
        categoryId: '',
        accountId: '',
        minCents: null,
        maxCents: null
      };
      this.setData({
        hasFilter: false,
        filterChips: [],
        filterResultText: '',
        sheet: '',
        loaded: PAGE_SIZE
      });
      this.apply();
    },
    removeChip(e) {
      const key = e.currentTarget.dataset.key;
      if (key === 'type') this.activeFilter.type = 'all';
      if (key === 'category') this.activeFilter.categoryId = '';
      if (key === 'account') this.activeFilter.accountId = '';
      if (key === 'amount') {
        this.activeFilter.minCents = null;
        this.activeFilter.maxCents = null;
      }
      const chips = this.filterChips.filter(c => c.key !== key);
      this.setData({
        filterChips: chips,
        hasFilter: chips.length > 0,
        loaded: PAGE_SIZE
      });
      this.apply();
    },
    closeSheet() {
      this.setData({
        sheet: ''
      });
    },
    noop() {}
  }
};
function cmpCategory(a, b, all) {
  if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
  const pa = a.parentId || a.id;
  const pb = b.parentId || b.id;
  if (pa !== pb) {
    const topA = all.find(c => c.id === pa);
    const topB = all.find(c => c.id === pb);
    return (topA && topA.sort || 0) - (topB && topB.sort || 0);
  }
  if ((a.parentId || '') === (b.parentId || '')) return (a.sort || 0) - (b.sort || 0);
  return a.parentId ? 1 : -1;
}</script>

<style scoped>
.list-page {
  min-height: 100vh;
  padding: 0 28rpx 180rpx;
  background: #F6F7F9;
}

.sticky-head {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #F6F7F9;
  padding: 8rpx 0 12rpx;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10rpx 0 18rpx;
}

.month-box {
  display: flex;
  align-items: center;
}

.month-arrow {
  width: 52rpx;
  height: 52rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  color: #4E5969;
  font-size: 36rpx;
  background: #EEF1F5;
}

.month-label {
  font-size: 34rpx;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 18rpx;
  min-width: 190rpx;
  text-align: center;
}

.tools {
  display: flex;
  align-items: center;
}

.tool {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  font-size: 23rpx;
  color: #4E5969;
  margin-left: 10rpx;
}

.tool-on {
  background: #00B578;
  border-color: #00B578;
  color: #FFFFFF;
}

.summary-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 26rpx 12rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
}

.sum-cols {
  display: flex;
}

.sum-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1rpx solid #F2F3F5;
}

.sum-col:last-child {
  border-right: none;
}

.sum-col-cap {
  font-size: 22rpx;
  color: #86909C;
  letter-spacing: 0.04em;
}

.sum-col-val {
  margin-top: 8rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: #1F2329;
}

.sum-expense {
  color: #FA5151;
}

.sum-income {
  color: #FF8F1F;
}

.sum-balance.neg {
  color: #FA5151;
}

.filter-bar {
  margin-top: 14rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 18rpx;
  padding: 14rpx 18rpx;
}

.filter-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  height: 48rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  background: #F1FBF6;
  color: #00B578;
  font-size: 22rpx;
  margin-right: 10rpx;
  margin-bottom: 6rpx;
}

.chip-x {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #86909C;
}

.filter-clear {
  font-size: 22rpx;
  color: #86909C;
  padding: 0 6rpx;
}

.filter-result {
  font-size: 22rpx;
  color: #86909C;
  margin-top: 6rpx;
}

.group {
  margin-top: 22rpx;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 10rpx;
}

.gh-left {
  display: flex;
  align-items: center;
}

.gh-date {
  font-size: 26rpx;
  font-weight: 600;
  color: #4E5969;
}

.gh-week {
  font-size: 22rpx;
  color: #86909C;
  margin-left: 10rpx;
}

.today-chip {
  margin-left: 10rpx;
  font-size: 19rpx;
  color: #FF8F1F;
  background: #FFF3E3;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}

.gh-right {
  display: flex;
  align-items: center;
}

.gh-sum {
  font-size: 21rpx;
  color: #86909C;
  margin-left: 14rpx;
}

.group-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 0 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
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
  border-radius: 22rpx;
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
  color: #FF8F1F;
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

.empty {
  padding-top: 70rpx;
}

.empty-btn {
  margin-top: 34rpx;
  width: 280rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
}

.list-foot {
  text-align: center;
  color: #C9CDD4;
  font-size: 22rpx;
  padding: 36rpx 0 10rpx;
}

.fab {
  position: fixed;
  right: 34rpx;
  bottom: calc(200rpx + env(safe-area-inset-bottom));
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #00B578;
  color: #FFFFFF;
  font-size: 48rpx;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 14rpx 30rpx rgba(0,181,120, 0.32);
  z-index: 50;
}

.fab:active {
  transform: scale(0.96);
}

/* 筛选面板 */
.type-chips {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20rpx;
}

.type-chips .chip {
  margin-bottom: 10rpx;
}

.filter-actions {
  display: flex;
  margin-top: 26rpx;
}

.filter-actions .btn-ghost {
  margin-right: 16rpx;
}

.apply-btn {
  height: 84rpx;
  line-height: 84rpx;
}
</style>
