<template>
<view class="stats-page">
  <view class="pg-body" :class="navDir === 1 ? 'pg-in-next' : navDir === -1 ? 'pg-in-prev' : ''">
  <view class="top-bar">
    <view class="period-nav">
      <view class="p-arrow" data-dir="-1" @tap="shift">‹</view>
      <text class="p-label">{{label}}</text>
      <view class="p-arrow" data-dir="1" @tap="shift">›</view>
    </view>
    <view class="seg period-seg">
      <view :class="'seg-item ' + (period === 'month' ? 'on' : '')" data-period="month" @tap="switchPeriod">月</view>
      <view :class="'seg-item ' + (period === 'year' ? 'on' : '')" data-period="year" @tap="switchPeriod">年</view>
    </view>
  </view>

  <view class="hero">
    <view class="hero-head">
      <text class="hero-cap">{{period === 'month' ? '本月支出' : '本年支出'}}</text>
      <text class="hero-amount num">{{summary.expenseText}}</text>
    </view>
    <view class="hero-grid">
      <view class="hero-cell">
        <text class="hg-cap">收入</text>
        <text class="hg-val num">{{summary.incomeText}}</text>
      </view>
      <view class="hero-cell">
        <text class="hg-cap">结余</text>
        <text class="hg-val num">{{summary.balanceText}}</text>
      </view>
      <view class="hero-cell">
        <text class="hg-cap">日均支出</text>
        <text class="hg-val num">{{summary.avgText}}</text>
      </view>
    </view>
  </view>

  <view class="compare-row">
    <view class="cmp-card" v-if="showMom">
      <text class="cmp-cap">环比 · 上月</text>
      <text :class="'cmp-val num ' + (compare.momState)">{{compare.momText}}</text>
    </view>
    <view class="cmp-card">
      <text class="cmp-cap">同比 · {{compare.yoyLabel}}</text>
      <text :class="'cmp-val num ' + (compare.yoyState)">{{compare.yoyText}}</text>
    </view>
  </view>

  <view class="chart-card">
    <view class="card-head">
      <text class="card-title">分类占比</text>
      <view class="mini-seg">
        <view :class="'mini-item ' + (type === 'expense' ? 'on' : '')" data-type="expense" @tap="switchType">支出</view>
        <view :class="'mini-item ' + (type === 'income' ? 'on' : '')" data-type="income" @tap="switchType">收入</view>
      </view>
    </view>
    <view class="chart-sub">{{totalCount}} 笔 · 合计 {{totalAmountText}}</view>
    <canvas canvas-id="donut" id="donut" class="donut-canvas"></canvas>
    <view class="rank-list">
      <view class="rank-row" v-for="(item, index) in ranks" :key="item.id" :data-id="(item.id)" :data-clickable="(item.clickable)" @tap="openCategory">
        <view class="rank-icon" :style="'background: ' + (item.tint)">{{item.icon}}</view>
        <view class="rank-mid">
          <view class="rank-line">
            <text class="rank-name">{{item.name}}</text>
            <text class="rank-amt num">{{item.amountText}}</text>
          </view>
          <view class="rank-track">
            <view class="rank-fill" :style="'width: ' + (item.width) + '%; background: ' + (item.color)"></view>
          </view>
          <view class="rank-meta">
            <text>{{item.percentText}}</text>
            <text>{{item.count}} 笔</text>
          </view>
        </view>
        <text class="rank-arrow" v-if="item.clickable">›</text>
      </view>
      <view class="rank-empty" v-if="ranks.length === 0">还没有{{type === 'expense' ? '支出' : '收入'}}记录</view>
    </view>
  </view>

  <view class="chart-card">
    <view class="card-head">
      <text class="card-title">{{trendTitle}}</text>
      <text class="card-more">单位：元</text>
    </view>
    <canvas canvas-id="trend" id="trend" class="trend-canvas"></canvas>
  </view>

  <view class="share-entry" v-if="period === 'month'" @tap="openShare">
    <text>生成月度账单图片</text>
    <text class="share-arrow">›</text>
  </view>

  <view class="foot-note">数据仅存本机 · 统计随记账实时更新</view>

  </view>
  <x-tabbar current="stats" />
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
function changeState(current, previous) {
  if (!previous) return {
    text: '—',
    state: 'flat'
  };
  const diff = (current - previous) / previous * 100;
  if (Math.abs(diff) < 0.05) return {
    text: '持平',
    state: 'flat'
  };
  return {
    text: (diff > 0 ? '+' : '') + diff.toFixed(1) + '%',
    state: diff > 0 ? 'up' : 'down'
  };
}
export default {
  data() {
    return {
      navDir: 0,
      period: 'month',
      anchorYm: '',
      anchorYear: '',
      label: '',
      type: 'expense',
      hideAmount: false,
      summary: {},
      compare: {},
      showMom: true,
      showYoy: true,
      yoyLabel: '去年同月',
      ranks: [],
      totalAmountText: '',
      totalCount: 0,
      hasData: false,
      trendTitle: '当月每日支出',
      donutTotalText: '',
      donutLabel: '支出'
    };
  },
  onLoad() {
    const ym = dateUtil.ymOf(dateUtil.todayStr());
    this.periodBills = [];
    this.donutSlices = [];
    this.trendData = null;
    this.setData({
      anchorYm: ym,
      anchorYear: ym.slice(0, 4),
      label: dateUtil.monthLabel(ym)
    });
  },
  onReady() {
    this.ready = true;
    this.refresh();
  },
  onShow() {
    const nav = tabnav.take();
    if (nav && nav.key === 'stats') {
      this.navDir = nav.dir;
      setTimeout(() => {
        this.navDir = 0;
      }, 400);
    }
    const settings = store.getSettings();
    if (this.hideAmount !== !!settings.hideAmount) {
      this.setData({
        hideAmount: !!settings.hideAmount
      });
    }
    if (this.ready) this.refresh();
  },
  onUnload() {
    if (this.drawTimer) clearTimeout(this.drawTimer);
  },
  methods: {
    switchPeriod(e) {
      const period = e.currentTarget.dataset.period;
      if (period === this.period) return;
      if (period === 'year') {
        const currentYm = dateUtil.ymOf(dateUtil.todayStr());
        let year = this.anchorYm.slice(0, 4);
        if (year === currentYm.slice(0, 4)) this.setData({
          anchorYm: currentYm
        });
        this.setData({
          period,
          anchorYear: year,
          label: year + '年'
        });
      } else {
        const currentYm = dateUtil.ymOf(dateUtil.todayStr());
        let ym = this.anchorYm;
        if (ym.slice(0, 4) !== this.anchorYear) {
          ym = this.anchorYear === currentYm.slice(0, 4) ? currentYm : this.anchorYear + '-01';
        }
        this.setData({
          period,
          anchorYm: ym,
          label: dateUtil.monthLabel(ym)
        });
      }
      this.refresh();
    },
    shift(e) {
      const dir = Number(e.currentTarget.dataset.dir);
      if (this.period === 'month') {
        const ym = dateUtil.addMonths(this.anchorYm, dir);
        this.setData({
          anchorYm: ym,
          label: dateUtil.monthLabel(ym)
        });
      } else {
        const year = String(Number(this.anchorYear) + dir);
        this.setData({
          anchorYear: year,
          label: year + '年'
        });
      }
      this.refresh();
    },
    switchType(e) {
      const type = e.currentTarget.dataset.type;
      if (type === this.type) return;
      this.setData({
        type
      });
      this.refresh();
    },
    loadPeriodBills() {
      if (this.period === 'month') {
        return store.getMonthBills(this.anchorYm);
      }
      const year = this.anchorYear;
      return store.allBills().filter(b => (b.date || '').slice(0, 4) === year);
    },
    totalsOf(list) {
      let income = 0;
      let expense = 0;
      list.forEach(b => {
        if (b.type === 'income') income += Number(b.amount) || 0;else if (b.type === 'expense') expense += Number(b.amount) || 0;
      });
      return {
        income,
        expense,
        balance: income - expense
      };
    },
    refresh() {
      const hide = this.hideAmount;
      const bills = this.loadPeriodBills();
      this.periodBills = bills;
      const totals = this.totalsOf(bills);
      const isMonth = this.period === 'month';
      const days = isMonth ? dateUtil.daysElapsed(this.anchorYm) : this.daysOfYear(this.anchorYear);
      const avg = days > 0 ? Math.round(totals.expense / days) : 0;

      // 对比
      let mom = {
        text: '—',
        state: 'flat'
      };
      let yoy = {
        text: '—',
        state: 'flat'
      };
      if (isMonth) {
        const prevYm = dateUtil.addMonths(this.anchorYm, -1);
        const prevTotals = this.totalsOf(store.getMonthBills(prevYm));
        mom = changeState(totals.expense, prevTotals.expense);
        const lastYearYm = Number(this.anchorYm.slice(0, 4)) - 1 + '-' + this.anchorYm.slice(5, 7);
        const yoyTotals = this.totalsOf(store.getMonthBills(lastYearYm));
        yoy = changeState(totals.expense, yoyTotals.expense);
      } else {
        const prevYear = String(Number(this.anchorYear) - 1);
        const prevTotals = this.totalsOf(store.allBills().filter(b => (b.date || '').slice(0, 4) === prevYear));
        yoy = changeState(totals.expense, prevTotals.expense);
      }

      // 分类排行
      const categories = store.getCategories();
      const catMap = {};
      categories.forEach(c => {
        catMap[c.id] = c;
      });
      const map = {};
      bills.forEach(bill => {
        if (bill.type !== this.type) return;
        const cat = catMap[bill.categoryId];
        const key = cat ? cat.parentId || cat.id : '__other__';
        const top = cat ? cat.parentId ? catMap[cat.parentId] : cat : null;
        if (!map[key]) {
          map[key] = {
            id: key,
            name: top ? top.name : '未分类',
            icon: top ? top.icon : '🏷️',
            color: top ? top.color : '#86909C',
            amount: 0,
            count: 0,
            clickable: true
          };
        }
        map[key].amount += bill.amount;
        map[key].count += 1;
      });
      const all = Object.keys(map).map(k => map[k]).sort((a, b) => b.amount - a.amount);
      let top8 = all.slice(0, 8);
      const rest = all.slice(8);
      if (rest.length) {
        top8 = top8.concat([{
          id: '__other_group__',
          name: '其他 ' + rest.length + ' 类',
          icon: '…',
          color: '#86909C',
          amount: rest.reduce((sum, r) => sum + r.amount, 0),
          count: rest.reduce((sum, r) => sum + r.count, 0),
          clickable: false
        }]);
      }
      const totalTypeAmount = all.reduce((sum, r) => sum + r.amount, 0);
      const ranks = top8.map(r => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        color: r.color,
        tint: hexToRgba(r.color, 0.13),
        amountText: money.money(r.amount, hide),
        percentText: money.percentText(r.amount, totalTypeAmount),
        percent: totalTypeAmount ? r.amount / totalTypeAmount * 100 : 0,
        width: totalTypeAmount ? Math.max(2, r.amount / totalTypeAmount * 100) : 0,
        count: r.count,
        clickable: r.clickable
      }));
      this.donutSlices = top8.map(r => ({
        value: r.amount,
        color: r.color,
        percent: totalTypeAmount ? r.amount / totalTypeAmount * 100 : 0
      }));

      // 趋势
      const trendData = this.buildTrend(bills);
      this.trendData = trendData;
      this.setData({
        summary: {
          expenseText: money.money(totals.expense, hide),
          incomeText: money.money(totals.income, hide),
          balanceText: money.money(totals.balance, hide),
          avgText: days > 0 ? money.money(avg, hide) : '—'
        },
        compare: {
          momText: mom.text,
          momState: mom.state,
          yoyText: yoy.text,
          yoyState: yoy.state,
          yoyLabel: isMonth ? '去年同月' : '上年'
        },
        showMom: isMonth,
        ranks,
        totalAmountText: money.money(totalTypeAmount, hide),
        totalCount: all.reduce((sum, r) => sum + r.count, 0),
        hasData: totalTypeAmount > 0,
        trendTitle: isMonth ? '当月每日支出' : '全年每月支出',
        donutLabel: this.type === 'expense' ? '支出' : '收入',
        donutTotalText: hide ? '****' : money.formatCents(totalTypeAmount)
      }, () => {
        this.scheduleDraw();
      });
    },
    daysOfYear(year) {
      const today = dateUtil.todayStr();
      if (today.slice(0, 4) === year) {
        const start = new Date(Number(year), 0, 1);
        const now = new Date(today.replace(/-/g, '/'));
        return Math.max(1, Math.floor((now - start) / 86400000) + 1);
      }
      if (Number(year) < Number(today.slice(0, 4))) {
        return Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0) ? 366 : 365;
      }
      return 0;
    },
    buildTrend(bills) {
      if (this.period === 'month') {
        const n = dateUtil.daysInMonth(this.anchorYm);
        const values = new Array(n).fill(0);
        bills.forEach(b => {
          if (b.type !== 'expense') return;
          const day = Number((b.date || '').slice(8, 10));
          if (day >= 1 && day <= n) values[day - 1] += b.amount;
        });
        return {
          mode: 'bar',
          labels: values.map((v, i) => String(i + 1)),
          values
        };
      }
      const values = new Array(12).fill(0);
      bills.forEach(b => {
        if (b.type !== 'expense') return;
        const month = Number((b.date || '').slice(5, 7));
        if (month >= 1 && month <= 12) values[month - 1] += b.amount;
      });
      return {
        mode: 'line',
        labels: values.map((v, i) => String(i + 1)),
        values
      };
    },
    scheduleDraw() {
      if (!this.ready) return;
      if (this.drawTimer) clearTimeout(this.drawTimer);
      this.drawTimer = setTimeout(() => {
        this.drawDonut();
        this.drawTrend();
      }, 60);
    },
    initCanvas(id, callback) {
      uni.createSelectorQuery().in(this).select('#' + id).boundingClientRect(rect => {
        if (!rect || !rect.width) return;
        const ctx = uni.createCanvasContext(id, this);
        ctx.clearRect(0, 0, rect.width, rect.height);
        callback(ctx, rect.width, rect.height);
      }).exec();
    },
    drawDonut() {
      const slices = this.donutSlices || [];
      this.initCanvas('donut', (ctx, width, height) => {
        const cx = width / 2;
        const cy = height / 2;
        const outer = Math.min(width, height) / 2 - 6;
        const inner = outer * 0.62;
        const radius = (outer + inner) / 2;
        const band = outer - inner;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.setLineWidth(band);
        ctx.setStrokeStyle('#F2F3F5');
        ctx.stroke();
        const sum = slices.reduce((s, item) => s + item.value, 0);
        if (sum > 0) {
          let start = -Math.PI / 2;
          slices.forEach(slice => {
            const angle = Math.PI * 2 * slice.percent / 100;
            if (angle <= 0) return;
            const gap = slices.length > 1 ? 0.02 : 0;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, start + gap / 2, start + angle - gap / 2);
            ctx.setLineWidth(band);
            ctx.setStrokeStyle(slice.color);
            ctx.stroke();
            start += angle;
          });
        }
        ctx.setTextAlign('center');
        ctx.setFillStyle('#86909C');
        ctx.setFontSize(11);
        ctx.fillText(this.donutLabel + '合计', cx, cy - 14);
        ctx.setFillStyle('#1F2329');
        const text = this.donutTotalText || '0.00';
        ctx.setFontSize(text.length > 8 ? 15 : 19);
        ctx.fillText(text, cx, cy + 12);
        if (!this.hasData) {
          ctx.setFillStyle('#C9CDD4');
          ctx.setFontSize(11);
          ctx.fillText('暂无数据', cx, cy + 34);
        }
        ctx.draw();
      });
    },
    drawTrend() {
      const trend = this.trendData;
      if (!trend) return;
      this.initCanvas('trend', (ctx, width, height) => {
        const left = 8;
        const right = 8;
        const top = 26;
        const bottom = 22;
        const plotW = width - left - right;
        const plotH = height - top - bottom;
        const values = trend.values;
        const max = Math.max.apply(null, values.concat([1]));
        ctx.setStrokeStyle('#F2F3F5');
        ctx.setLineWidth(1);
        for (let i = 0; i <= 3; i++) {
          const y = top + plotH / 3 * i;
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(width - right, y);
          ctx.stroke();
        }
        ctx.setTextAlign('left');
        ctx.setFillStyle('#86909C');
        ctx.setFontSize(9);
        ctx.fillText(this.hideAmount ? '****' : money.formatCents(max), left, top - 10);
        if (values.length === 0) {
          ctx.draw();
          return;
        }
        if (trend.mode === 'bar') {
          const step = plotW / values.length;
          const barW = Math.max(2, step * 0.55);
          values.forEach((value, i) => {
            const h = max > 0 ? value / max * plotH : 0;
            const x = left + step * i + (step - barW) / 2;
            const y = top + plotH - h;
            ctx.setFillStyle(value > 0 ? '#FA5151' : '#F2F3F5');
            ctx.fillRect(x, value > 0 ? y : top + plotH - 2, barW, value > 0 ? Math.max(2, h) : 2);
          });
          ctx.setTextAlign('center');
          ctx.setFillStyle('#86909C');
          ctx.setFontSize(9);
          const n = values.length;
          const labelDays = [1, 5, 10, 15, 20, 25, n];
          labelDays.forEach(day => {
            if (day < 1 || day > n) return;
            const x = left + step * (day - 1) + step / 2;
            ctx.fillText(String(day), x, height - 8);
          });
        } else {
          const step = values.length > 1 ? plotW / (values.length - 1) : plotW;
          ctx.beginPath();
          values.forEach((value, i) => {
            const x = left + step * i;
            const y = top + plotH - value / max * plotH;
            if (i === 0) ctx.moveTo(x, y);else ctx.lineTo(x, y);
          });
          ctx.setStrokeStyle('#00B578');
          ctx.setLineWidth(2);
          ctx.stroke();
          values.forEach((value, i) => {
            const x = left + step * i;
            const y = top + plotH - value / max * plotH;
            ctx.beginPath();
            ctx.arc(x, y, value > 0 ? 2.6 : 1.6, 0, Math.PI * 2);
            ctx.setFillStyle(value > 0 ? '#00B578' : '#E5E6EB');
            ctx.fill();
          });
          ctx.setTextAlign('center');
          ctx.setFillStyle('#86909C');
          ctx.setFontSize(9);
          values.forEach((value, i) => {
            const x = left + step * i;
            ctx.fillText(i + 1 + '月', x, height - 8);
          });
        }
        ctx.draw();
      });
    },
    openCategory(e) {
      const id = e.currentTarget.dataset.id;
      const clickable = e.currentTarget.dataset.clickable;
      if (clickable === false || clickable === 'false') return;
      if (!this.hasData) return;
      const anchor = this.period === 'month' ? this.anchorYm : this.anchorYear;
      uni.navigateTo({
        url: '/pages/catstats/catstats?period=' + this.period + '&anchor=' + anchor + '&type=' + this.type + '&cat=' + id
      });
    },
    openShare() {
      uni.navigateTo({
        url: '/pages/share/share?ym=' + this.anchorYm
      });
    }
  }
};</script>

<style scoped>
.stats-page {
  min-height: 100vh;
  padding: 8rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0 22rpx;
}

.period-nav {
  display: flex;
  align-items: center;
}

.p-arrow {
  width: 52rpx;
  height: 52rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  background: #EEF1F5;
  color: #4E5969;
  font-size: 36rpx;
}

.p-label {
  font-size: 32rpx;
  font-weight: 600;
  margin: 0 16rpx;
  min-width: 170rpx;
  text-align: center;
}

.period-seg {
  width: 190rpx;
}

.period-seg .seg-item {
  padding: 8rpx 0;
  font-size: 24rpx;
}

.hero {
  background: linear-gradient(140deg, #00B578 0%, #00A76B 100%);
  border-radius: 30rpx;
  padding: 28rpx 32rpx;
  color: #FFFFFF;
  box-shadow: 0 16rpx 34rpx rgba(0,181,120, 0.18);
}

.hero-head {
  display: flex;
  flex-direction: column;
}

.hero-cap {
  font-size: 23rpx;
  opacity: 0.75;
  letter-spacing: 0.05em;
}

.hero-amount {
  font-size: 62rpx;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin-top: 4rpx;
}

.hero-grid {
  display: flex;
  margin-top: 22rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.16);
}

.hero-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hg-cap {
  font-size: 21rpx;
  opacity: 0.7;
}

.hg-val {
  font-size: 27rpx;
  margin-top: 4rpx;
  font-weight: 500;
}

.compare-row {
  display: flex;
  margin-top: 16rpx;
}

.cmp-card {
  flex: 1;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-right: 14rpx;
  box-shadow: 0 8rpx 22rpx rgba(31,35,41, 0.04);
}

.cmp-card:last-child {
  margin-right: 0;
}

.cmp-cap {
  display: block;
  font-size: 21rpx;
  color: #86909C;
}

.cmp-val {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-top: 6rpx;
  color: #86909C;
}

.cmp-val.up {
  color: #FA5151;
}

.cmp-val.down {
  color: #00A76B;
}

.chart-card {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 26rpx 26rpx 20rpx;
  margin-top: 18rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
}

.card-more {
  font-size: 21rpx;
  color: #86909C;
}

.mini-seg {
  display: flex;
  background: #F2F3F5;
  border-radius: 999rpx;
  padding: 4rpx;
}

.mini-item {
  padding: 8rpx 22rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #86909C;
}

.mini-item.on {
  background: #FFFFFF;
  color: #00B578;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.08);
}

.chart-sub {
  font-size: 22rpx;
  color: #86909C;
  margin-top: 6rpx;
}

.donut-canvas {
  display: block;
  width: 360rpx;
  height: 360rpx;
  margin: 18rpx auto 4rpx;
}

.rank-list {
  margin-top: 8rpx;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.rank-row:last-child {
  border-bottom: none;
}

.rank-icon {
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
}

.rank-mid {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.rank-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rank-name {
  font-size: 26rpx;
  color: #1F2329;
  font-weight: 500;
  max-width: 55%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-amt {
  font-size: 26rpx;
  font-weight: 600;
  color: #1F2329;
}

.rank-track {
  height: 6rpx;
  border-radius: 99rpx;
  background: #F2F3F5;
  margin: 10rpx 0 6rpx;
  overflow: hidden;
}

.rank-fill {
  height: 100%;
  border-radius: 99rpx;
}

.rank-meta {
  display: flex;
  justify-content: space-between;
  font-size: 20rpx;
  color: #86909C;
}

.rank-arrow {
  color: #C9CDD4;
  font-size: 26rpx;
  margin-left: 10rpx;
}

.rank-empty {
  text-align: center;
  color: #86909C;
  font-size: 24rpx;
  padding: 36rpx 0 20rpx;
}

.trend-canvas {
  display: block;
  width: 100%;
  height: 270rpx;
  margin-top: 18rpx;
}

.share-entry {
  margin-top: 18rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 26rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 27rpx;
  color: #00B578;
  box-shadow: 0 8rpx 22rpx rgba(31,35,41, 0.04);
}

.share-arrow {
  color: #C9CDD4;
}

.foot-note {
  text-align: center;
  color: #C9CDD4;
  font-size: 21rpx;
  margin-top: 30rpx;
}
</style>
