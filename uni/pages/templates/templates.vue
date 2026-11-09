<template>
<view class="tpl-page">
  <view class="page-title">
    <view class="title">快捷模板</view>
    <view class="sub">把常记的一笔存成模板，记账时一键带出金额与分类</view>
  </view>

  <view class="tpl-card" v-if="list.length">
    <view class="tpl-row" v-for="(item, index) in list" :key="item.id" :data-id="(item.id)" @tap="editTemplate" @longpress="removeTemplate">
      <view :class="'tpl-icon ' + (item.type)">{{item.icon}}</view>
      <view class="tpl-main">
        <view class="tpl-name-line">
          <text class="tpl-name ellipsis">{{item.name}}</text>
          <text :class="'tpl-type ' + (item.type)">{{item.typeLabel}}</text>
        </view>
        <text class="tpl-sub ellipsis">{{item.categoryText}} · {{item.accountText}}</text>
      </view>
      <view class="tpl-right">
        <text :class="'tpl-amount num ' + (item.type)">{{item.amountText}}</text>
        <text class="tpl-hint">长按删除</text>
      </view>
    </view>
  </view>

  <view class="empty" v-else>
    <view class="empty-icon">⚡</view>
    <view class="empty-title">还没有快捷键模板</view>
    <view class="empty-desc">把每天都会记的一笔存成模板，下次记账点一下就填好了</view>
  </view>

  <view class="btn-primary add-btn" @tap="openForm">＋ 新建模板</view>

  <view class="tip-card">
    <text class="tip-title">模板能做什么</text>
    <text class="tip-desc">模板只保存金额、分类、账户和备注，不会直接产生账单。在记账页顶部的模板条点一下，即可自动填好这笔记录，再按「保存」完成记账。</text>
  </view>

  <view class="sheet-mask" v-if="showForm" @tap="closeForm">
    <view class="sheet" @tap.stop="noop">
      <view class="sheet-head">
        <text class="sheet-title">{{formId ? '编辑模板' : '新建模板'}}</text>
        <view class="sheet-close" @tap="closeForm">×</view>
      </view>

      <view class="form-card">
        <view class="form-row">
          <text class="form-label">模板名称</text>
          <input class="form-input" :value="(formName)" maxlength="12" placeholder="如：午餐、通勤" placeholder-class="placeholder" @input="onFormName" />
        </view>
        <view class="form-row">
          <text class="form-label">收支类型</text>
          <view class="form-seg">
            <view :class="'fs-item ' + (formType === 'expense' ? 'on expense' : '')" data-type="expense" @tap="selectFormType">支出</view>
            <view :class="'fs-item ' + (formType === 'income' ? 'on income' : '')" data-type="income" @tap="selectFormType">收入</view>
            <view :class="'fs-item ' + (formType === 'transfer' ? 'on transfer' : '')" data-type="transfer" @tap="selectFormType">转账</view>
          </view>
        </view>
        <view class="form-row">
          <text class="form-label">金额（元）</text>
          <input class="form-input num" type="digit" :value="(formAmount)" placeholder="0.00" placeholder-class="placeholder" @input="onFormAmount" />
        </view>
        <picker v-if="formType !== 'transfer'" mode="selector" :range="(categoryOptions)" range-key="name" :value="(categoryIndex)" @change="onFormCategory">
          <view class="form-row">
            <text class="form-label">分类</text>
            <view class="form-value">{{categoryName}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
        <view class="form-row" v-else>
          <text class="form-label">分类</text>
          <view class="form-value muted">转账无需分类</view>
        </view>
        <picker mode="selector" :range="(accountOptions)" range-key="name" :value="(accountIndex)" @change="onFormAccount">
          <view class="form-row">
            <text class="form-label">账户</text>
            <view class="form-value">{{accountName}}<text class="arrow-right">›</text></view>
          </view>
        </picker>
        <view class="form-row">
          <text class="form-label">备注</text>
          <input class="form-input" :value="(formNote)" maxlength="50" placeholder="选填" placeholder-class="placeholder" @input="onFormNote" />
        </view>
      </view>

      <view class="sheet-actions">
        <view class="btn-danger flex1" v-if="formId" :data-id="(formId)" @tap="removeTemplate">删除</view>
        <view class="btn-primary flex1" @tap="saveForm">保存模板</view>
      </view>
    </view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import money from '../../utils/money.js';
export default {
  data() {
    return {
      list: [],
      hideAmount: false,
      showForm: false,
      formId: '',
      formName: '',
      formType: 'expense',
      formAmount: '',
      formCategoryId: '',
      formAccountId: '',
      formNote: '',
      categoryOptions: [],
      categoryIndex: 0,
      categoryName: '请选择分类',
      accountOptions: [],
      accountIndex: 0,
      accountName: '请选择账户'
    };
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const settings = store.getSettings();
      const categories = store.getCategories();
      const accounts = store.getAccounts();
      const list = store.getTemplates().map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const acc = accounts.find(a => a.id === t.accountId);
        return Object.assign({}, t, {
          icon: t.type === 'transfer' ? '⇄' : cat ? cat.icon : '⚡',
          typeLabel: t.type === 'income' ? '收入' : t.type === 'transfer' ? '转账' : '支出',
          amountText: settings.hideAmount ? '****' : money.formatCents(t.amount),
          categoryText: t.type === 'transfer' ? '转账' : cat ? store.categoryDisplayName(t.categoryId) : '分类已删除',
          accountText: acc ? acc.name : '当前账户'
        });
      });
      this.setData({
        list,
        hideAmount: !!settings.hideAmount
      });
    },
    openForm() {
      const accounts = store.getAccounts();
      const accountOptions = accounts.map(a => ({
        id: a.id,
        name: a.name
      }));
      this.setData({
        showForm: true,
        formId: '',
        formName: '',
        formType: 'expense',
        formAmount: '',
        formCategoryId: '',
        formAccountId: accounts[0] ? accounts[0].id : '',
        formNote: '',
        accountOptions,
        accountIndex: 0,
        accountName: accounts[0] ? accounts[0].name : '暂无账户'
      });
      this.buildCategoryOptions('expense', '');
    },
    closeForm() {
      this.setData({
        showForm: false
      });
    },
    editTemplate(e) {
      const id = e.currentTarget.dataset.id;
      const tpl = store.getTemplates().find(t => t.id === id);
      if (!tpl) return;
      const accounts = store.getAccounts();
      const accountOptions = accounts.map(a => ({
        id: a.id,
        name: a.name
      }));
      const foundIndex = accountOptions.findIndex(a => a.id === tpl.accountId);
      const accountIndex = foundIndex >= 0 ? foundIndex : 0;
      const formAccountId = accountOptions[accountIndex] ? accountOptions[accountIndex].id : '';
      this.setData({
        showForm: true,
        formId: tpl.id,
        formName: tpl.name,
        formType: tpl.type,
        formAmount: money.centToInput(tpl.amount),
        formNote: tpl.note || '',
        formAccountId,
        accountOptions,
        accountIndex,
        accountName: accountOptions[accountIndex] ? accountOptions[accountIndex].name : '暂无账户'
      });
      if (tpl.type === 'transfer') {
        this.setData({
          formCategoryId: '',
          categoryOptions: [],
          categoryIndex: 0,
          categoryName: '转账无需分类'
        });
      } else {
        this.buildCategoryOptions(tpl.type, tpl.categoryId);
      }
    },
    buildCategoryOptions(type, categoryId) {
      const all = store.getCategories();
      const categories = all.filter(c => c.type === type).sort((a, b) => {
        if ((a.parentId || '') === (b.parentId || '')) return (a.sort || 0) - (b.sort || 0);
        const pa = a.parentId || a.id;
        const pb = b.parentId || b.id;
        if (pa !== pb) {
          const topA = all.find(c => c.id === pa);
          const topB = all.find(c => c.id === pb);
          return (topA && topA.sort || 0) - (topB && topB.sort || 0);
        }
        return a.parentId ? 1 : -1;
      });
      const options = [{
        id: '',
        name: '请选择分类'
      }].concat(categories.map(c => ({
        id: c.id,
        name: store.categoryDisplayName(c.id)
      })));
      const index = Math.max(0, options.findIndex(o => o.id === categoryId));
      this.setData({
        categoryOptions: options,
        categoryIndex: index,
        categoryName: options[index].name,
        formCategoryId: options[index].id
      });
    },
    selectFormType(e) {
      const type = e.currentTarget.dataset.type;
      if (type === this.formType) return;
      this.setData({
        formType: type
      });
      if (type === 'transfer') {
        this.setData({
          categoryOptions: [],
          categoryIndex: 0,
          categoryName: '转账无需分类',
          formCategoryId: ''
        });
      } else {
        this.buildCategoryOptions(type, '');
      }
    },
    onFormName(e) {
      this.setData({
        formName: e.detail.value
      });
    },
    onFormAmount(e) {
      this.setData({
        formAmount: e.detail.value
      });
    },
    onFormCategory(e) {
      const index = Number(e.detail.value);
      const option = this.categoryOptions[index];
      if (!option) return;
      this.setData({
        categoryIndex: index,
        categoryName: option.name,
        formCategoryId: option.id
      });
    },
    onFormAccount(e) {
      const index = Number(e.detail.value);
      const option = this.accountOptions[index];
      if (!option) return;
      this.setData({
        accountIndex: index,
        accountName: option.name,
        formAccountId: option.id
      });
    },
    onFormNote(e) {
      this.setData({
        formNote: e.detail.value
      });
    },
    saveForm() {
      const type = this.formType;
      const amount = money.parseToCents(this.formAmount);
      if (amount === null || amount <= 0) {
        uni.showToast({
          title: '请输入模板金额',
          icon: 'none'
        });
        return;
      }
      if (type !== 'transfer' && !this.formCategoryId) {
        uni.showToast({
          title: '请选择分类',
          icon: 'none'
        });
        return;
      }
      const name = String(this.formName || '').trim() || '常用模板';
      store.saveTemplate({
        id: this.formId || undefined,
        name,
        type,
        amount,
        categoryId: type === 'transfer' ? '' : this.formCategoryId,
        accountId: this.formAccountId,
        note: this.formNote
      });
      this.setData({
        showForm: false
      });
      this.refresh();
      uni.showToast({
        title: '模板已保存',
        icon: 'success'
      });
    },
    removeTemplate(e) {
      const id = e.currentTarget.dataset.id;
      uni.showModal({
        title: '删除模板',
        content: '模板删除后不影响已记录的账单。',
        confirmText: '删除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          store.deleteTemplate(id);
          this.setData({
            showForm: false
          });
          this.refresh();
          uni.showToast({
            title: '已删除',
            icon: 'none'
          });
        }
      });
    },
    noop() {}
  }
};</script>

<style scoped>
.tpl-page {
  min-height: 100vh;
  padding: 16rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.tpl-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 0 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.tpl-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #EEF1F5;
}

.tpl-row:last-child {
  border-bottom: none;
}

.tpl-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  flex-shrink: 0;
  background: #FDEBEB;
  color: #FA5151;
}

.tpl-icon.income {
  background: #E4F8F0;
  color: #00A76B;
}

.tpl-icon.transfer {
  background: #E8F1FF;
  color: #3D7FFF;
}

.tpl-main {
  flex: 1;
  min-width: 0;
  padding: 0 18rpx;
}

.tpl-name-line {
  display: flex;
  align-items: center;
}

.tpl-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #1F2329;
  max-width: 300rpx;
}

.tpl-type {
  margin-left: 12rpx;
  font-size: 19rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: #FDEBEB;
  color: #FA5151;
  flex-shrink: 0;
}

.tpl-type.income {
  background: #E4F8F0;
  color: #00A76B;
}

.tpl-type.transfer {
  background: #E8F1FF;
  color: #3D7FFF;
}

.tpl-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #86909C;
  max-width: 100%;
}

.tpl-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.tpl-amount {
  font-size: 30rpx;
  font-weight: 600;
  color: #FA5151;
}

.tpl-amount.income {
  color: #00A76B;
}

.tpl-amount.transfer {
  color: #86909C;
}

.tpl-hint {
  font-size: 18rpx;
  color: #C9CDD4;
  margin-top: 4rpx;
}

.add-btn {
  margin-top: 34rpx;
}

.tip-card {
  margin-top: 28rpx;
  padding: 24rpx 26rpx;
  border-radius: 20rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
}

.tip-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #4E5969;
}

.tip-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #86909C;
}

.form-seg {
  flex: 1;
  display: flex;
  background: #F2F3F5;
  border-radius: 999rpx;
  padding: 4rpx;
}

.fs-item {
  flex: 1;
  text-align: center;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #86909C;
}

.fs-item.on {
  background: #FFFFFF;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(31,35,41, 0.08);
}

.fs-item.on.expense {
  color: #FA5151;
}

.fs-item.on.income {
  color: #00A76B;
}

.fs-item.on.transfer {
  color: #3D7FFF;
}

.sheet-actions {
  display: flex;
  margin-top: 28rpx;
}

.sheet-actions .btn-danger {
  margin-right: 16rpx;
}

.sheet-actions .btn-primary,
.sheet-actions .btn-danger {
  height: 84rpx;
  line-height: 84rpx;
}
</style>
