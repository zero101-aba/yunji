<template>
<view class="rec">
  <!-- 预算提示 -->
  <view class="alert-banner" v-if="alertText">{{alertText}}</view>

  <view class="rec-main">
    <view class="budget-mini" v-if="budget.hasBudget" @tap="goBudget">
      <view class="row between">
        <text class="bm-label">本月预算</text>
        <text :class="'bm-value ' + (budget.over ? 'over' : '')">{{budget.over ? '已超支' : '剩余 ' + budget.remainText}}</text>
      </view>
      <view class="bm-bar">
        <view :class="'bm-fill ' + (budget.over ? 'over' : '')" :style="'width: ' + (budget.barWidth) + '%'"></view>
      </view>
      <view class="row between bm-foot">
        <text>已用 {{budget.usedText}}</text>
        <text>{{budget.totalText}}</text>
      </view>
    </view>

    <!-- 收支类型 -->
    <view class="type-seg">
      <view :class="'type-item ' + (type === 'expense' ? 'on expense-text' : '')" data-type="expense" @tap="onType">支出</view>
      <view :class="'type-item ' + (type === 'income' ? 'on income-text' : '')" data-type="income" @tap="onType">收入</view>
      <view :class="'type-item ' + (type === 'transfer' ? 'on' : '')" data-type="transfer" @tap="onType">转账</view>
    </view>

    <!-- 金额 -->
    <view class="amount-block">
      <text class="amount-label">本次金额</text>
      <view class="amount-line">
        <text class="currency">¥</text>
        <text :class="'amount-text num ' + (expr ? '' : 'ph')" :style="'font-size: ' + (amountFont) + 'rpx'">{{expr || '0.00'}}</text>
      </view>
      <view class="amount-meta">
        <text v-if="type === 'transfer'">账户转账 · 不计入收支</text>
        <text v-else-if="selectedLabel">{{selectedLabel}}</text>
        <text v-else class="ph-text">请选择分类</text>
        <text v-if="images.length" class="meta-extra"> · {{images.length}} 张凭证</text>
      </view>
    </view>

    <!-- 快捷信息 -->
    <view class="meta-chips">
      <view class="meta-chip" @tap="openDate">
        <text class="mc-k">日期</text>
        <text class="mc-v ellipsis">{{dateShort}}</text>
      </view>
      <view class="meta-chip" data-target="account" @tap="openAccount">
        <text class="mc-k">账户</text>
        <text class="mc-v ellipsis">{{accountLabel}}</text>
      </view>
      <view class="meta-chip" @tap="openNote">
        <text class="mc-k">备注</text>
        <text class="mc-v ellipsis">{{noteShort || '添加'}}</text>
      </view>
    </view>

    <!-- 快捷模板 -->
    <view class="tpl-wrap" v-if="templates.length">
      <scroll-view class="tpl-scroll" scroll-x enable-flex>
        <view class="tpl-chip" v-for="(item, index) in templates" :key="item.id" :data-id="(item.id)" @tap="applyTemplate">
          <text class="tpl-name">{{item.name}}</text>
          <text class="tpl-amt num">{{item.icon}}{{item.amountText}}</text>
        </view>
        <view class="tpl-manage" @tap="openTemplates">管理</view>
      </scroll-view>
    </view>

    <!-- 分类 / 转账 -->
    <scroll-view v-if="type !== 'transfer'" class="cat-scroll" scroll-y>
      <view class="cat-grid">
        <view v-for="(item, index) in categories" :key="item.id" :class="'cat-item ' + (item.active ? 'active' : '')" :data-id="(item.id)" @tap="onCatTap">
          <view class="cat-icon" :style="'background: ' + (item.tint) + '; color: ' + (item.color)">{{item.icon}}</view>
          <text :class="'cat-name ' + (item.active ? 'active' : '')">{{item.name}}</text>
          <view class="cat-dot" v-if="item.hasChildren"></view>
        </view>
      </view>
      <view class="cat-empty" v-if="categories.length === 0">暂无可用分类，请到「我的 - 分类管理」添加</view>
    </scroll-view>

    <view v-else class="transfer-panel">
      <view class="transfer-card">
        <view class="transfer-row" data-target="account" @tap="openAccount">
          <view class="tr-cap">转出</view>
          <view class="tr-name">{{accountLabel}}</view>
          <view class="tr-arrow">选择 ›</view>
        </view>
        <view class="tr-line">
          <view class="tr-line-dot"></view>
          <text class="tr-arrow-icon">↓</text>
        </view>
        <view class="transfer-row" data-target="toAccount" @tap="openAccount">
          <view class="tr-cap">转入</view>
          <view class="tr-name">{{toAccountLabel}}</view>
          <view class="tr-arrow">选择 ›</view>
        </view>
      </view>
      <view class="transfer-tip">转账只调整两个账户的余额，不会计入收入与支出统计</view>
    </view>
  </view>

  <!-- 键盘 -->
  <view class="keypad">
    <view class="key" data-key="7" @tap="onKey">7</view>
    <view class="key" data-key="8" @tap="onKey">8</view>
    <view class="key" data-key="9" @tap="onKey">9</view>
    <view class="key fn" data-key="del" @tap="onKey">⌫</view>

    <view class="key" data-key="4" @tap="onKey">4</view>
    <view class="key" data-key="5" @tap="onKey">5</view>
    <view class="key" data-key="6" @tap="onKey">6</view>
    <view class="key op" data-key="+" @tap="onKey">+</view>

    <view class="key" data-key="1" @tap="onKey">1</view>
    <view class="key" data-key="2" @tap="onKey">2</view>
    <view class="key" data-key="3" @tap="onKey">3</view>
    <view class="key op" data-key="-" @tap="onKey">−</view>

    <view class="key" data-key="." @tap="onKey">.</view>
    <view class="key" data-key="0" @tap="onKey">0</view>
    <view class="key eq" data-key="eq" @tap="onKey">=</view>
    <view class="key save" @tap="onSave">保存</view>
  </view>

  <!-- 撤销 -->
  <view class="undo-bar" v-if="showUndo">
    <text>已保存这笔账</text>
    <view class="undo-btn" @tap.stop="undoLast">撤销</view>
  </view>

  <!-- 引导 -->
  <view class="guide-mask" v-if="showGuide">
    <view class="guide-card">
      <view class="guide-logo">🧾</view>
      <view class="guide-title">欢迎使用星即</view>
      <view class="guide-desc">打开就能记，不用注册，数据只留在你自己手机里。</view>
      <view class="guide-list">
        <view class="guide-row">
          <view class="guide-idx">1</view>
          <view>
            <view class="guide-row-t">10 秒记一笔</view>
            <view class="guide-row-d">选分类、敲金额，点保存即可。</view>
          </view>
        </view>
        <view class="guide-row">
          <view class="guide-idx">2</view>
          <view>
            <view class="guide-row-t">数据仅存本机</view>
            <view class="guide-row-d">不联网、不采集信息，换机需手动备份。</view>
          </view>
        </view>
        <view class="guide-row">
          <view class="guide-idx">3</view>
          <view>
            <view class="guide-row-t">定期备份更安心</view>
            <view class="guide-row-d">清理应用缓存或卸载应用会导致数据丢失。</view>
          </view>
        </view>
      </view>
      <view class="btn-primary guide-btn" @tap="closeGuide">开始记账</view>
    </view>
  </view>

  <!-- 账户选择 -->
  <view class="sheet-mask" v-if="sheet === 'account'" @tap="closeSheet">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">{{accountTarget === 'toAccount' ? '选择转入账户' : '选择账户'}}</text>
        <view class="sheet-close" @tap="closeSheet">×</view>
      </view>
      <scroll-view scroll-y class="account-scroll">
        <view :class="'account-item ' + (item.id === sheetAccountActive ? 'on' : '')" v-for="(item, index) in accounts" :key="item.id" :data-id="(item.id)" @tap="selectAccount">
          <view class="account-icon">{{item.icon}}</view>
          <view class="flex1">
            <view class="account-name">{{item.name}}</view>
            <view class="account-balance">余额 {{item.balanceText}}</view>
          </view>
          <view class="check-mark" v-if="item.id === sheetAccountActive">✓</view>
        </view>
      </scroll-view>
      <view class="btn-ghost" @tap="goAccounts">管理账户</view>
    </view>
  </view>

  <!-- 日期选择 -->
  <view class="sheet-mask" v-if="sheet === 'date'" @tap="closeSheet">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">选择日期</text>
        <view class="sheet-close" @tap="closeSheet">×</view>
      </view>
      <view class="quick-dates">
        <view :class="'quick-date ' + (item.date === dateStr ? 'on' : '')" v-for="(item, index) in quickDates" :key="item.offset" :data-date="(item.date)" @tap="pickQuickDate">
          <text class="qd-label">{{item.label}}</text>
          <text class="qd-date">{{item.date}}</text>
        </view>
      </view>
      <view class="form-card">
        <picker mode="date" :value="(dateStr)" @change="onDateChange">
          <view class="form-row">
            <text class="form-label">自定义日期</text>
            <view class="form-value">{{dateStr}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
        <picker mode="time" :value="(time)" @change="onTimeChange">
          <view class="form-row">
            <text class="form-label">时间</text>
            <view class="form-value">{{time}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
      </view>
    </view>
  </view>

  <!-- 备注与凭证 -->
  <view class="sheet-mask" v-if="sheet === 'note'" @tap="closeSheet">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">备注与凭证</text>
        <view class="sheet-close" @tap="closeSheet">×</view>
      </view>
      <view class="note-box">
        <textarea class="note-input" :value="(note)" maxlength="50" placeholder="写点什么，方便以后搜索（选填）" placeholder-class="placeholder" @input="onNoteInput"></textarea>
        <view class="note-count">{{note.length}}/50</view>
      </view>
      <view class="section-label">图片凭证（最多 3 张，会压缩后保存在本机）</view>
      <view class="img-row">
        <view class="img-item" v-for="(item, index) in images" :key="index">
          <image class="img-thumb" :src="(item)" mode="aspectFill" :data-src="(item)" @tap="previewImage"></image>
          <view class="img-del" :data-index="(index)" @tap.stop="removeImage">×</view>
        </view>
        <view class="img-add" v-if="images.length < 3" @tap="chooseImage">
          <text class="img-add-plus">＋</text>
          <text class="img-add-text">添加</text>
        </view>
      </view>
      <view class="btn-primary note-done" @tap="closeNote">完成</view>
    </view>
  </view>

  <!-- 二级分类 -->
  <view class="sheet-mask" v-if="subVisible" @tap="closeSub">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">{{subParent.name}}</text>
        <view class="sheet-close" @tap="closeSub">×</view>
      </view>
      <view class="sub-only" @tap="pickParentOnly">仅记一级分类 · {{subParent.name}}</view>
      <view class="sub-grid">
        <view class="sub-item" v-for="(item, index) in subCategories" :key="item.id" :data-id="(item.id)" @tap="pickSubCategory">
          <text class="sub-icon">{{item.icon}}</text>
          <text class="sub-name">{{item.name}}</text>
        </view>
      </view>
    </view>
  </view>

  <x-tabbar :current="0" />
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
import calc from '../../utils/calc.js';
function hexToRgba(hex, alpha) {
  const value = String(hex || '#86909C').replace('#', '');
  const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function amountFont(expr) {
  const len = String(expr || '').length;
  if (len <= 7) return 88;
  if (len <= 11) return 70;
  if (len <= 15) return 54;
  return 44;
}
function shortDate(dateStr) {
  const today = dateUtil.todayStr();
  if (dateStr === today) return '今天';
  if (dateStr === dateUtil.quickDate(1)) return '昨天';
  if (dateStr === dateUtil.quickDate(2)) return '前天';
  return Number(dateStr.slice(5, 7)) + '月' + dateStr.slice(8, 10) + '日';
}
export default {
  data() {
    return {
      type: 'expense',
      expr: '',
      amountFont: 88,
      selectedId: '',
      selectedLabel: '',
      selectedParentName: '',
      categories: [],
      accounts: [],
      accountId: '',
      accountLabel: '账户',
      toAccountId: '',
      toAccountLabel: '选择账户',
      dateStr: '',
      dateShort: '今天',
      time: '',
      note: '',
      noteShort: '',
      images: [],
      hideAmount: false,
      budget: {
        hasBudget: false
      },
      templates: [],
      sheet: '',
      accountTarget: 'account',
      subVisible: false,
      subParent: null,
      subCategories: [],
      showUndo: false,
      showGuide: false,
      alertText: '',
      quickDates: []
    };
  },
  onLoad() {
    const today = dateUtil.todayStr();
    this.setData({
      dateStr: today,
      dateShort: shortDate(today),
      time: dateUtil.nowTime()
    });
  },
  onShow() {
    const app = getApp();
    if (app && app.globalData && app.globalData.justLaunched) {
      app.globalData.justLaunched = false;
      if (store.getSettings().defaultPage === 'list') {
        uni.reLaunch({
          url: '/pages/list/list'
        });
        return;
      }
    }
    const meta = store.getMeta();
    const settings = store.getSettings();
    const accounts = store.getAccounts();
    this.allCategories = store.getCategories();
    let accountId = this.accountId;
    if (!accounts.some(a => a.id === accountId)) {
      accountId = accounts.some(a => a.id === settings.lastAccountId) ? settings.lastAccountId : accounts[0] ? accounts[0].id : '';
    }
    let toAccountId = this.toAccountId;
    if (!accounts.some(a => a.id === toAccountId) || toAccountId === accountId) {
      const other = accounts.find(a => a.id !== accountId);
      toAccountId = other ? other.id : '';
    }
    const notesShort = this.note.length > 7 ? this.note.slice(0, 7) + '…' : this.note;
    this.setData({
      hideAmount: !!settings.hideAmount,
      accounts: accounts.map(a => Object.assign({}, a, {
        balanceText: money.money(a.balance, settings.hideAmount)
      })),
      accountId,
      accountLabel: accounts.find(a => a.id === accountId) ? store.accountName(accountId) : '添加账户',
      toAccountId,
      toAccountLabel: accounts.find(a => a.id === toAccountId) ? store.accountName(toAccountId) : '选择账户',
      dateShort: shortDate(this.dateStr),
      noteShort: notesShort,
      templates: store.getTemplates().map(t => Object.assign({}, t, {
        amountText: settings.hideAmount ? '****' : money.formatCents(t.amount),
        icon: t.type === 'income' ? '+' : t.type === 'transfer' ? '⇄' : '-'
      })),
      showGuide: !meta.guideSeen
    });
    this.loadCategoryGrid();
    this.refreshBudget();
    this.refreshQuickDates();
    if (!this.dateStr) {
      const today = dateUtil.todayStr();
      this.setData({
        dateStr: today,
        dateShort: shortDate(today),
        time: dateUtil.nowTime()
      });
    }

    // 每次进入首页检查一次预算阈值（每个阈值每月只提示一次）
    const alert = store.checkBudgetAlert(dateUtil.ymOf(this.dateStr));
    if (alert) {
      this.showAlert(alert);
    }
  },
  onUnload() {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    if (this.alertTimer) clearTimeout(this.alertTimer);
  },
  methods: {
    /* ------- 分类 ------- */
    loadCategoryGrid() {
      if (this.type === 'transfer') {
        this.setData({
          categories: []
        });
        return;
      }
      const type = this.type;
      const all = this.allCategories || store.getCategories();
      const recent = store.getRecentCategory(type);
      const tops = all.filter(c => c.type === type && !c.parentId && !c.hidden).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const recentTops = recent.map(id => tops.find(c => c.id === id)).filter(Boolean);
      const rest = tops.filter(c => recentTops.indexOf(c) === -1);
      const ordered = recentTops.concat(rest);
      let activeTop = '';
      if (this.selectedId) {
        const selected = all.find(c => c.id === this.selectedId);
        if (selected) activeTop = selected.parentId || selected.id;
      }
      const categories = ordered.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        tint: hexToRgba(c.color, 0.12),
        hasChildren: all.some(ch => ch.parentId === c.id && !ch.hidden),
        active: c.id === activeTop
      }));
      this.setData({
        categories
      });
    },
    onType(e) {
      const type = e.currentTarget.dataset.type;
      if (type === this.type) return;
      this.setData({
        type,
        selectedId: '',
        selectedLabel: '',
        selectedParentName: '',
        sheet: '',
        subVisible: false
      });
      this.loadCategoryGrid();
    },
    onCatTap(e) {
      const id = e.currentTarget.dataset.id;
      const all = this.allCategories || store.getCategories();
      const category = all.find(c => c.id === id);
      if (!category) return;
      const children = all.filter(c => c.parentId === id && !c.hidden).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      if (children.length > 0) {
        this.setData({
          subVisible: true,
          subParent: {
            id: category.id,
            name: category.name,
            icon: category.icon,
            color: category.color
          },
          subCategories: children.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon
          }))
        });
        return;
      }
      this.selectCategory(category.id, '', category.name);
    },
    selectCategory(id, parentName, name) {
      const all = this.allCategories || store.getCategories();
      const category = all.find(c => c.id === id);
      if (!category) return;
      let label = name || category.name;
      if (category.parentId) {
        const parent = all.find(c => c.id === category.parentId);
        label = (parent ? parent.name : '') + ' · ' + category.name;
      }
      this.setData({
        selectedId: id,
        selectedLabel: label,
        selectedParentName: parentName || '',
        subVisible: false
      });
      this.loadCategoryGrid();
    },
    pickParentOnly() {
      const parent = this.subParent;
      if (!parent) return;
      this.selectCategory(parent.id, '', parent.name);
    },
    pickSubCategory(e) {
      const id = e.currentTarget.dataset.id;
      const parent = this.subParent;
      const child = this.subCategories.find(c => c.id === id);
      if (!child) return;
      this.selectCategory(id, parent ? parent.name : '', child.name);
    },
    closeSub() {
      this.setData({
        subVisible: false
      });
    },
    /* ------- 键盘 ------- */
    onKey(e) {
      const key = e.currentTarget.dataset.key;
      let expr = this.expr || '';
      if (key === 'del') {
        expr = expr.slice(0, -1);
      } else if (key === 'eq') {
        if (!calc.hasOperator(expr)) return;
        const value = calc.evaluate(expr);
        if (value === null || value <= 0) {
          uni.showToast({
            title: '算式有误',
            icon: 'none'
          });
          return;
        }
        expr = String(Math.round(value * 100) / 100);
      } else if (key === '+' || key === '-') {
        if (!expr) return;
        if (/[+\-*/]$/.test(expr)) expr = expr.slice(0, -1) + key;else expr = expr + key;
      } else if (key === '.') {
        const operand = calc.currentOperand(expr);
        if (operand.indexOf('.') >= 0) return;
        expr = expr ? expr + '.' : '0.';
      } else {
        const operand = calc.currentOperand(expr);
        if (operand.indexOf('.') >= 0) {
          const decimals = operand.split('.')[1] || '';
          if (decimals.length >= 2) return;
        }
        if (operand === '0') {
          expr = expr.slice(0, -1) + key;
        } else if (!expr && key === '0') {
          expr = '0';
        } else {
          expr = expr + key;
        }
      }
      if (expr.length > 20) expr = expr.slice(0, 20);
      this.setData({
        expr,
        amountFont: amountFont(expr)
      });
    },
    /* ------- 账户 / 日期 / 备注 ------- */
    openAccount(e) {
      const target = e.currentTarget && e.currentTarget.dataset.target || 'account';
      if (this.accounts.length === 0) {
        uni.navigateTo({
          url: '/pages/accounts/accounts'
        });
        return;
      }
      this.setData({
        sheet: 'account',
        accountTarget: target,
        sheetAccountActive: target === 'toAccount' ? this.toAccountId : this.accountId
      });
    },
    selectAccount(e) {
      const id = e.currentTarget.dataset.id;
      const target = this.accountTarget;
      if (target === 'toAccount') {
        if (id === this.accountId) {
          uni.showToast({
            title: '转入账户需与转出不同',
            icon: 'none'
          });
          return;
        }
        this.setData({
          toAccountId: id,
          toAccountLabel: store.accountName(id),
          sheet: ''
        });
      } else {
        let toAccountId = this.toAccountId;
        if (this.type === 'transfer' && toAccountId === id) {
          const other = this.accounts.find(a => a.id !== id);
          toAccountId = other ? other.id : '';
        }
        this.setData({
          accountId: id,
          accountLabel: store.accountName(id),
          toAccountId,
          toAccountLabel: toAccountId ? store.accountName(toAccountId) : '选择账户',
          sheet: ''
        });
      }
    },
    openDate() {
      this.refreshQuickDates();
      this.setData({
        sheet: 'date'
      });
    },
    refreshQuickDates() {
      const today = dateUtil.todayStr();
      this.setData({
        quickDates: [{
          offset: 0,
          label: '今天',
          date: today
        }, {
          offset: 1,
          label: '昨天',
          date: dateUtil.quickDate(1)
        }, {
          offset: 2,
          label: '前天',
          date: dateUtil.quickDate(2)
        }]
      });
    },
    pickQuickDate(e) {
      const date = e.currentTarget.dataset.date;
      this.setData({
        dateStr: date,
        dateShort: shortDate(date),
        time: date === dateUtil.todayStr() ? dateUtil.nowTime() : this.time,
        sheet: ''
      });
    },
    onDateChange(e) {
      const date = e.detail.value;
      this.setData({
        dateStr: date,
        dateShort: shortDate(date),
        sheet: ''
      });
    },
    onTimeChange(e) {
      this.setData({
        time: e.detail.value
      });
    },
    openNote() {
      this.setData({
        sheet: 'note'
      });
    },
    onNoteInput(e) {
      const note = e.detail.value;
      this.setData({
        note,
        noteShort: note.length > 7 ? note.slice(0, 7) + '…' : note
      });
    },
    closeNote() {
      this.setData({
        sheet: ''
      });
    },
    chooseImage() {
      const remain = 3 - this.images.length;
      if (remain <= 0) return;
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: res => {
          const paths = res.tempFilePaths || [];
          if (!paths.length) return;
          const saved = [];
          let pending = paths.length;
          paths.forEach(path => {
            this.persistImage(path, finalPath => {
              saved.push(finalPath);
              pending -= 1;
              if (pending === 0) {
                this.setData({
                  images: this.images.concat(saved).slice(0, 3)
                });
              }
            });
          });
        }
      });
    },
    persistImage(path, done) {
      // #ifdef MP-WEIXIN
      wx.compressImage({
        src: path,
        quality: 60,
        success: compress => {
          wx.saveFile({
            tempFilePath: compress.tempFilePath,
            success: save => done(save.savedFilePath),
            fail: () => done(compress.tempFilePath)
          });
        },
        fail: () => {
          wx.saveFile({
            tempFilePath: path,
            success: save => done(save.savedFilePath),
            fail: () => done(path)
          });
        }
      });
      // #endif
      // #ifndef MP-WEIXIN
      if (uni.saveFile) {
        uni.saveFile({
          tempFilePath: path,
          success: save => done(save.savedFilePath),
          fail: () => done(path)
        });
      } else {
        done(path);
      }
      // #endif
    },

    previewImage(e) {
      const src = e.currentTarget.dataset.src;
      uni.previewImage({
        current: src,
        urls: this.images
      });
    },
    removeImage(e) {
      const index = Number(e.currentTarget.dataset.index);
      const images = this.images.slice();
      const removed = images.splice(index, 1);
      this.setData({
        images
      });
      if (removed[0]) {
        // #ifdef MP-WEIXIN
        try {
          wx.getFileSystemManager().unlink({
            filePath: removed[0],
            fail: () => {}
          });
        } catch (err) {
          // 忽略清理失败
        }
        // #endif
      }
    },

    /* ------- 模板 ------- */
    openTemplates() {
      uni.navigateTo({
        url: '/pages/templates/templates'
      });
    },
    applyTemplate(e) {
      const id = e.currentTarget.dataset.id;
      const tpl = this.templates.find(t => t.id === id);
      if (!tpl) return;
      const all = this.allCategories || store.getCategories();
      const category = all.find(c => c.id === tpl.categoryId);
      if (tpl.type !== 'transfer' && !category) {
        uni.showToast({
          title: '模板分类已删除',
          icon: 'none'
        });
        return;
      }
      const accountsExist = this.accounts.some(a => a.id === tpl.accountId);
      const expr = tpl.amount > 0 ? money.centToInput(tpl.amount) : '';
      this.setData({
        type: tpl.type,
        expr,
        amountFont: amountFont(expr),
        selectedId: category ? category.id : '',
        selectedLabel: category ? category.parentId ? store.categoryDisplayName(category.id) : category.name : '',
        note: tpl.note || '',
        noteShort: tpl.note && tpl.note.length > 7 ? tpl.note.slice(0, 7) + '…' : tpl.note || '',
        accountId: accountsExist ? tpl.accountId : this.accountId,
        accountLabel: accountsExist ? store.accountName(tpl.accountId) : this.accountLabel
      });
      this.loadCategoryGrid();
      this.setData({
        sheet: ''
      });
    },
    /* ------- 预算 ------- */
    refreshBudget() {
      const ym = dateUtil.ymOf(this.dateStr);
      const summary = store.getBudgetSummary(ym);
      const percent = Math.min(100, Math.round(summary.percent));
      this.setData({
        budget: {
          hasBudget: summary.hasBudget,
          usedText: money.money(summary.used, this.hideAmount),
          totalText: money.money(summary.total, this.hideAmount),
          remainText: money.money(Math.abs(summary.remain), this.hideAmount),
          over: summary.over,
          percent: summary.percent,
          barWidth: percent
        }
      });
    },
    goBudget() {
      uni.navigateTo({
        url: '/pages/budget/budget?ym=' + dateUtil.ymOf(this.dateStr)
      });
    },
    showAlert(alert) {
      if (this.alertTimer) clearTimeout(this.alertTimer);
      const text = alert.threshold === 100 ? '本月预算已超支，记得控制开销' : '本月预算已使用 ' + Math.round(alert.percent) + '%';
      this.setData({
        alertText: text
      });
      this.alertTimer = setTimeout(() => {
        this.setData({
          alertText: ''
        });
      }, 4200);
    },
    /* ------- 保存 / 撤销 ------- */
    onSave() {
      const expr = this.expr;
      let value = null;
      if (expr) {
        value = calc.hasOperator(expr) ? calc.evaluate(expr) : Number(expr);
      }
      const amount = value === null || !isFinite(value) ? 0 : Math.round(value * 100);
      if (amount <= 0) {
        uni.showToast({
          title: '请输入金额',
          icon: 'none'
        });
        return;
      }
      if (amount > 999999999) {
        uni.showToast({
          title: '金额过大',
          icon: 'none'
        });
        return;
      }
      if (!this.accountId) {
        uni.showToast({
          title: '请先添加账户',
          icon: 'none'
        });
        return;
      }
      if (this.type === 'transfer') {
        if (!this.toAccountId || this.toAccountId === this.accountId) {
          uni.showToast({
            title: '请选择不同的转入账户',
            icon: 'none'
          });
          return;
        }
      } else if (!this.selectedId) {
        uni.showToast({
          title: '请选择分类',
          icon: 'none'
        });
        return;
      }
      const result = store.addBill({
        type: this.type,
        amount,
        categoryId: this.selectedId,
        accountId: this.accountId,
        toAccountId: this.toAccountId,
        date: this.dateStr,
        time: this.time,
        note: this.note,
        images: this.images
      });
      if (!result.ok) {
        uni.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
        return;
      }
      this.lastBillId = result.bill.id;
      this.setData({
        expr: '',
        amountFont: 88,
        note: '',
        noteShort: '',
        images: [],
        showUndo: true,
        sheet: ''
      });
      store.saveSettings({
        lastAccountId: this.accountId
      });
      this.allCategories = store.getCategories();
      this.loadCategoryGrid();
      this.refreshBudget();
      if (this.undoTimer) clearTimeout(this.undoTimer);
      this.undoTimer = setTimeout(() => {
        this.setData({
          showUndo: false
        });
      }, 3000);
      const alert = store.checkBudgetAlert(dateUtil.ymOf(this.dateStr));
      if (alert) this.showAlert(alert);
      uni.showToast({
        title: '已记一笔',
        icon: 'success',
        duration: 1200
      });
    },
    undoLast() {
      if (!this.lastBillId) return;
      if (this.undoTimer) clearTimeout(this.undoTimer);
      const result = store.deleteBill(this.lastBillId);
      this.lastBillId = '';
      this.setData({
        showUndo: false
      });
      this.refreshBudget();
      if (result.ok) {
        uni.showToast({
          title: '已撤销',
          icon: 'none'
        });
      }
    },
    /* ------- 引导 ------- */
    closeGuide() {
      store.saveMeta({
        guideSeen: true
      });
      this.setData({
        showGuide: false
      });
    },
    goAccounts() {
      uni.navigateTo({
        url: '/pages/accounts/accounts'
      });
    },
    closeSheet() {
      this.setData({
        sheet: ''
      });
    },
    noop() {}
  }
};</script>

<style scoped>
.rec {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F6F7F9;
  overflow: hidden;
}

.rec-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14rpx 28rpx 0;
}

/* 预算 */
.budget-mini {
  background: #00B578;
  border-radius: 20rpx;
  padding: 18rpx 24rpx 16rpx;
  margin-bottom: 16rpx;
  color: #FFFFFF;
}

.bm-label {
  font-size: 23rpx;
  opacity: 0.82;
  letter-spacing: 0.04em;
}

.bm-value {
  font-size: 24rpx;
  font-weight: 600;
}

.bm-value.over {
  color: #FFF3E3;
}

.bm-bar {
  height: 8rpx;
  border-radius: 99rpx;
  background: rgba(255, 255, 255, 0.22);
  margin: 12rpx 0 10rpx;
  overflow: hidden;
}

.bm-fill {
  height: 100%;
  border-radius: 99rpx;
  background: #FF8F1F;
  transition: width 0.25s ease;
}

.bm-fill.over {
  background: #FA5151;
}

.bm-foot {
  font-size: 21rpx;
  opacity: 0.78;
}

/* 类型切换 */
.type-seg {
  display: flex;
  align-items: center;
  background: #E9EDF2;
  border-radius: 24rpx;
  padding: 6rpx;
  margin: 6rpx 0 2rpx;
}

.type-item {
  position: relative;
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 28rpx;
  color: #4E5969;
  border-radius: 18rpx;
  transition: all 0.18s ease;
}

.type-item.on {
  background: #FFFFFF;
  color: #00B578;
  font-weight: 600;
  font-size: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.08);
}

.type-item.on.expense-text {
  color: #00B578;
}

.type-item.on.income-text {
  color: #FF8F1F;
}

.type-item.on::after {
  display: none;
}

/* 金额 */
.amount-block {
  padding: 26rpx 10rpx 10rpx;
  flex-shrink: 0;
  text-align: center;
}

.amount-label {
  display: block;
  font-size: 23rpx;
  color: #86909C;
  letter-spacing: 0.06em;
  margin-bottom: 6rpx;
}

.amount-line {
  display: flex;
  align-items: baseline;
  justify-content: center;
  min-height: 104rpx;
}

.currency {
  font-size: 40rpx;
  font-weight: 600;
  color: #1F2329;
  margin-right: 10rpx;
}

.amount-text {
  font-size: 88rpx;
  font-weight: 600;
  color: #1F2329;
  line-height: 1.1;
  word-break: break-all;
}

.amount-text.ph {
  color: #C9CDD4;
}

.amount-meta {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #4E5969;
  min-height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ph-text {
  color: #C9CDD4;
}

.meta-extra {
  color: #86909C;
}

/* 模板 */
.tpl-wrap {
  margin-bottom: 12rpx;
  flex-shrink: 0;
}

.tpl-scroll {
  white-space: nowrap;
  width: 100%;
  display: flex;
  align-items: center;
}

.tpl-chip {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 10rpx 20rpx;
  margin-right: 12rpx;
  border-radius: 14rpx;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
}

.tpl-name {
  font-size: 24rpx;
  color: #4E5969;
}

.tpl-amt {
  font-size: 22rpx;
  color: #86909C;
  margin-left: 10rpx;
}

.tpl-manage {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 10rpx 14rpx;
  color: #86909C;
  font-size: 22rpx;
}

/* 分类宫格 */
.cat-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 4rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 10rpx 8rpx 6rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
}

.cat-grid {
  display: flex;
  flex-wrap: wrap;
}

.cat-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14rpx 0 16rpx;
  position: relative;
}

.cat-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.cat-item.active .cat-icon {
  transform: scale(1.03);
  box-shadow: 0 0 0 4rpx #00B578;
}

.cat-name {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #4E5969;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-name.active {
  color: #00B578;
  font-weight: 600;
}

.cat-dot {
  position: absolute;
  right: 28rpx;
  top: 16rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(0, 181, 120, 0.35);
}

.cat-empty {
  text-align: center;
  color: #86909C;
  font-size: 24rpx;
  padding: 40rpx 0;
}

/* 转账 */
.transfer-panel {
  flex: 1;
  min-height: 0;
  padding-top: 16rpx;
}

.transfer-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
  border: 1rpx solid #E5E6EB;
}

.transfer-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
}

.tr-cap {
  width: 80rpx;
  font-size: 24rpx;
  color: #86909C;
}

.tr-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #1F2329;
}

.tr-arrow {
  font-size: 24rpx;
  color: #C9CDD4;
}

.tr-line {
  display: flex;
  align-items: center;
  padding-left: 40rpx;
  position: relative;
}

.tr-line-dot {
  width: 100%;
  height: 1rpx;
  background: #F2F3F5;
}

.tr-arrow-icon {
  position: absolute;
  right: 6rpx;
  top: -22rpx;
  font-size: 28rpx;
  color: #C9CDD4;
}

.transfer-tip {
  margin-top: 22rpx;
  padding: 0 10rpx;
  color: #86909C;
  font-size: 23rpx;
  line-height: 1.7;
}

/* 快捷信息 chips */
.meta-chips {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin: 6rpx 0 14rpx;
}

.meta-chip {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  margin-right: 12rpx;
  padding: 0 18rpx;
  background: #FFFFFF;
  border-radius: 18rpx;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.05);
}

.meta-chip:last-child {
  margin-right: 0;
}

.mc-k {
  font-size: 22rpx;
  color: #86909C;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.mc-v {
  font-size: 24rpx;
  color: #1F2329;
  max-width: 100%;
}

/* 元信息 */
.meta-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 88rpx;
  margin-top: 8rpx;
  border-top: 1rpx solid #E5E6EB;
}

.meta-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.meta-k {
  font-size: 20rpx;
  color: #86909C;
  margin-bottom: 4rpx;
}

.meta-v {
  font-size: 25rpx;
  color: #4E5969;
  max-width: 100%;
}

.meta-sp {
  width: 1rpx;
  height: 36rpx;
  background: #F2F3F5;
}

/* 键盘 */
.keypad {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx 16rpx calc(10rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  border-top: 1rpx solid #E5E6EB;
  box-shadow: 0 -8rpx 24rpx rgba(31,35,41, 0.04);
}

.key {
  width: calc(25% - 12rpx);
  margin: 6rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 20rpx;
  font-size: 38rpx;
  font-weight: 500;
  color: #1F2329;
  background: #F7F8FA;
  border: 1rpx solid #EDEFF2;
}

.key:active {
  background: #E9EDF2;
}

.key.fn {
  font-size: 32rpx;
  color: #4E5969;
}

.key.op {
  color: #00B578;
  font-weight: 600;
  background: #F1FBF6;
  border-color: #DCF6EA;
}

.key.eq {
  color: #00B578;
  font-weight: 700;
  background: #F1FBF6;
  border-color: #DCF6EA;
}

.key.save {
  background: linear-gradient(160deg, #00C97E 0%, #00A76B 100%);
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
  border-color: transparent;
  box-shadow: 0 8rpx 18rpx rgba(0,181,120, 0.24);
}

.key.save:active {
  opacity: 0.88;
}

/* 撤销 */
.undo-bar {
  position: fixed;
  left: 40rpx;
  right: 40rpx;
  bottom: calc(500rpx + env(safe-area-inset-bottom));
  background: rgba(31,35,41, 0.92);
  color: #FFFFFF;
  border-radius: 999rpx;
  padding: 18rpx 18rpx 18rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 900;
  font-size: 26rpx;
  animation: fade 0.24s ease;
}

.undo-btn {
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #B8F3DD;
  font-size: 25rpx;
  font-weight: 600;
}

/* 提示条 */
.alert-banner {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  top: 20rpx;
  z-index: 950;
  background: #FFF3E3;
  border: 1rpx solid #FDEBEB;
  color: #FA5151;
  font-size: 25rpx;
  padding: 18rpx 26rpx;
  border-radius: 16rpx;
  text-align: center;
  animation: fade 0.24s ease;
  box-shadow: 0 8rpx 24rpx rgba(184, 81, 46, 0.12);
}

/* 引导 */
.guide-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1200;
  background: rgba(32, 28, 22, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50rpx;
}

.guide-card {
  width: 100%;
  background: #F2F3F5;
  border-radius: 36rpx;
  padding: 48rpx 40rpx 40rpx;
  animation: fade 0.3s ease;
}

.guide-logo {
  font-size: 76rpx;
  text-align: center;
  margin-bottom: 14rpx;
}

.guide-title {
  text-align: center;
  font-size: 38rpx;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.guide-desc {
  text-align: center;
  color: #86909C;
  font-size: 25rpx;
  line-height: 1.7;
  margin: 12rpx 0 30rpx;
}

.guide-list {
  margin-bottom: 34rpx;
}

.guide-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 22rpx;
}

.guide-idx {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #E4F8F0;
  color: #00B578;
  font-size: 22rpx;
  text-align: center;
  line-height: 44rpx;
  margin-right: 18rpx;
  flex-shrink: 0;
  font-weight: 600;
}

.guide-row-t {
  font-size: 27rpx;
  font-weight: 600;
  color: #1F2329;
}

.guide-row-d {
  font-size: 23rpx;
  color: #86909C;
  line-height: 1.6;
  margin-top: 2rpx;
}

.guide-btn {
  margin-top: 8rpx;
}

/* 账户弹层 */
.account-scroll {
  max-height: 56vh;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  margin-bottom: 12rpx;
  border: 1rpx solid #F2F3F5;
}

.account-item.on {
  border-color: rgba(0,181,120, 0.4);
  background: #E4F8F0;
}

.account-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #F2F3F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  margin-right: 20rpx;
}

.account-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #1F2329;
}

.account-balance {
  font-size: 23rpx;
  color: #86909C;
  margin-top: 2rpx;
}

.check-mark {
  color: #00B578;
  font-size: 30rpx;
  font-weight: 600;
}

.sheet .btn-ghost {
  margin-top: 12rpx;
}

/* 日期 */
.quick-dates {
  display: flex;
  margin-bottom: 24rpx;
}

.quick-date {
  flex: 1;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  border-radius: 18rpx;
  padding: 18rpx 10rpx;
  text-align: center;
  margin-right: 14rpx;
}

.quick-date:last-child {
  margin-right: 0;
}

.quick-date.on {
  border-color: rgba(0,181,120, 0.45);
  background: #E4F8F0;
}

.qd-label {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: #1F2329;
}

.qd-date {
  display: block;
  font-size: 20rpx;
  color: #86909C;
  margin-top: 4rpx;
}

/* 备注 */
.note-box {
  position: relative;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  border-radius: 20rpx;
  padding: 22rpx;
  margin-bottom: 8rpx;
}

.note-input {
  width: 100%;
  height: 150rpx;
  font-size: 28rpx;
  color: #1F2329;
  line-height: 1.6;
}

.note-count {
  text-align: right;
  font-size: 22rpx;
  color: #C9CDD4;
}

.img-row {
  display: flex;
  flex-wrap: wrap;
}

.img-item {
  position: relative;
  width: 150rpx;
  height: 150rpx;
  margin-right: 16rpx;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.img-thumb {
  width: 100%;
  height: 100%;
}

.img-del {
  position: absolute;
  right: 6rpx;
  top: 6rpx;
  width: 38rpx;
  height: 38rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(31,35,41, 0.68);
  color: #FFFFFF;
  font-size: 26rpx;
}

.img-add {
  width: 150rpx;
  height: 150rpx;
  border-radius: 16rpx;
  border: 1rpx dashed #E5E6EB;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #86909C;
  background: #FFFFFF;
}

.img-add-plus {
  font-size: 40rpx;
  line-height: 1;
}

.img-add-text {
  font-size: 22rpx;
  margin-top: 8rpx;
}

.note-done {
  margin-top: 20rpx;
}

/* 二级分类 */
.sub-only {
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #4E5969;
  margin-bottom: 16rpx;
}

.sub-grid {
  display: flex;
  flex-wrap: wrap;
}

.sub-item {
  width: calc(33.33% - 12rpx);
  margin: 6rpx;
  background: #FFFFFF;
  border: 1rpx solid #F2F3F5;
  border-radius: 16rpx;
  padding: 22rpx 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sub-item:active {
  background: #E4F8F0;
}

.sub-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.sub-name {
  font-size: 24rpx;
  color: #4E5969;
}
</style>
