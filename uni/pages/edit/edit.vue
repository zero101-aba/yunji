<template>
<view class="edit-page" v-if="!missing">
  <view class="edit-type">
    <view :class="'chip ' + (type === 'expense' ? 'on' : '')" data-type="expense" @tap="onType">支出</view>
    <view :class="'chip ' + (type === 'income' ? 'on' : '')" data-type="income" @tap="onType">收入</view>
    <view :class="'chip ' + (type === 'transfer' ? 'on' : '')" data-type="transfer" @tap="onType">转账</view>
  </view>

  <view class="amount-card">
    <text class="amount-cap">金额</text>
    <view class="amount-input-row">
      <text class="amount-symbol">¥</text>
      <input class="amount-input num" type="digit" :value="(amountInput)" placeholder="0.00" placeholder-class="placeholder" @input="onAmount" />
    </view>
  </view>

  <view class="form-card">
    <picker v-if="type !== 'transfer'" mode="selector" :range="(categoryOptions)" range-key="name" :value="(categoryIndex)" @change="onCategory">
      <view class="form-row">
        <text class="form-label">分类</text>
        <view class="form-value">{{categoryName}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <picker mode="selector" :range="(accounts)" range-key="name" :value="(accountIndex)" @change="onAccount">
      <view class="form-row">
        <text class="form-label">{{type === 'transfer' ? '转出账户' : '账户'}}</text>
        <view class="form-value">{{accounts[accountIndex].name}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <picker v-if="type === 'transfer'" mode="selector" :range="(accounts)" range-key="name" :value="(toAccountIndex)" @change="onToAccount">
      <view class="form-row">
        <text class="form-label">转入账户</text>
        <view class="form-value">{{accounts[toAccountIndex].name}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <picker mode="date" :value="(date)" @change="onDate">
      <view class="form-row">
        <text class="form-label">日期</text>
        <view class="form-value">{{date}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <picker mode="time" :value="(time)" @change="onTime">
      <view class="form-row">
        <text class="form-label">时间</text>
        <view class="form-value">{{time}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
  </view>

  <view class="section-label">备注</view>
  <view class="note-card">
    <textarea class="edit-note" :value="(note)" maxlength="50" placeholder="写点什么（选填）" placeholder-class="placeholder" @input="onNote"></textarea>
    <view class="note-count">{{note.length}}/50</view>
  </view>

  <view class="section-label">图片凭证</view>
  <view class="img-row">
    <view class="img-item" v-for="(item, index) in images" :key="index">
      <image class="img-thumb" :src="(item)" mode="aspectFill" :data-src="(item)" @tap="previewImage"></image>
      <view class="img-del" :data-index="(index)" @tap.stop="removeImage">×</view>
    </view>
    <view class="img-add" v-if="images.length < 3" @tap="chooseImage">
      <text class="img-plus">＋</text>
      <text class="img-text">添加</text>
    </view>
  </view>

  <view class="edit-actions safe-bottom">
    <view class="btn-primary" @tap="save">保存修改</view>
    <view class="btn-danger delete-btn" @tap="removeBill">删除这笔记录</view>
  </view>
</view>

<view class="missing-page" v-else>
  <view class="empty">
    <view class="empty-icon">🧾</view>
    <view class="empty-title">记录不存在</view>
    <view class="empty-desc">它可能已被删除</view>
    <view class="btn-ghost empty-btn" @tap="goBack">返回</view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import money from '../../utils/money.js';
import dateUtil from '../../utils/date.js';
export default {
  data() {
    return {
      id: '',
      type: 'expense',
      amountInput: '',
      categoryId: '',
      categoryOptions: [],
      categoryIndex: 0,
      categoryName: '请选择分类',
      accounts: [],
      accountId: '',
      accountIndex: 0,
      toAccountId: '',
      toAccountIndex: 0,
      date: '',
      time: '',
      note: '',
      images: [],
      hideAmount: false,
      missing: false
    };
  },
  onLoad(options) {
    const id = options.id;
    const found = store.findBill(id);
    if (!found) {
      this.setData({
        missing: true
      });
      return;
    }
    const bill = found.bill;
    const settings = store.getSettings();
    const accounts = store.getAccounts();
    const accountOptions = accounts.map(a => ({
      id: a.id,
      name: a.name,
      balanceText: money.money(a.balance, settings.hideAmount)
    }));
    const accountIndex = Math.max(0, accountOptions.findIndex(a => a.id === bill.accountId));
    let toAccountIndex = accountOptions.findIndex(a => a.id === bill.toAccountId);
    if (toAccountIndex < 0) toAccountIndex = 0;
    this.bill = bill;
    this.setData({
      id,
      type: bill.type,
      amountInput: money.centToInput(bill.amount),
      accounts: accountOptions,
      accountId: bill.accountId,
      accountIndex,
      toAccountId: bill.toAccountId || (accountOptions[accountOptions.length - 1] || {}).id || '',
      toAccountIndex,
      date: bill.date,
      time: bill.time,
      note: bill.note || '',
      images: (bill.images || []).slice(),
      hideAmount: !!settings.hideAmount
    });
    this.buildCategoryOptions(bill.type, bill.categoryId);
  },
  methods: {
    buildCategoryOptions(type, categoryId) {
      if (type === 'transfer') {
        this.setData({
          categoryOptions: [{
            id: '',
            name: '转账无需分类'
          }],
          categoryIndex: 0,
          categoryId: '',
          categoryName: '转账无需分类'
        });
        return;
      }
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
        categoryId: index > 0 ? options[index].id : '',
        categoryName: options[index].name
      });
    },
    onType(e) {
      const type = e.currentTarget.dataset.type;
      if (type === this.type) return;
      this.setData({
        type
      });
      this.buildCategoryOptions(type, '');
    },
    onAmount(e) {
      this.setData({
        amountInput: e.detail.value
      });
    },
    onCategory(e) {
      const index = Number(e.detail.value);
      const option = this.categoryOptions[index];
      this.setData({
        categoryIndex: index,
        categoryId: option.id,
        categoryName: option.name
      });
    },
    onAccount(e) {
      const index = Number(e.detail.value);
      const account = this.accounts[index];
      if (!account) return;
      let toAccountId = this.toAccountId;
      let toAccountIndex = this.toAccountIndex;
      if (this.type === 'transfer' && toAccountId === account.id) {
        const other = this.accounts.find(a => a.id !== account.id);
        if (other) {
          toAccountId = other.id;
          toAccountIndex = Math.max(0, this.accounts.findIndex(a => a.id === other.id));
        }
      }
      this.setData({
        accountIndex: index,
        accountId: account.id,
        toAccountId,
        toAccountIndex
      });
    },
    onToAccount(e) {
      const index = Number(e.detail.value);
      const account = this.accounts[index];
      if (!account) return;
      if (account.id === this.accountId) {
        uni.showToast({
          title: '转入账户需与转出不同',
          icon: 'none'
        });
        return;
      }
      this.setData({
        toAccountIndex: index,
        toAccountId: account.id
      });
    },
    onDate(e) {
      this.setData({
        date: e.detail.value
      });
    },
    onTime(e) {
      this.setData({
        time: e.detail.value
      });
    },
    onNote(e) {
      this.setData({
        note: e.detail.value
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
              if (pending === 0) this.setData({
                images: this.images.concat(saved).slice(0, 3)
              });
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
            success: s => done(s.savedFilePath),
            fail: () => done(compress.tempFilePath)
          });
        },
        fail: () => {
          wx.saveFile({
            tempFilePath: path,
            success: s => done(s.savedFilePath),
            fail: () => done(path)
          });
        }
      });
      // #endif
      // #ifndef MP-WEIXIN
      if (uni.saveFile) {
        uni.saveFile({
          tempFilePath: path,
          success: s => done(s.savedFilePath),
          fail: () => done(path)
        });
      } else {
        done(path);
      }
      // #endif
    },

    previewImage(e) {
      uni.previewImage({
        current: e.currentTarget.dataset.src,
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

    save() {
      const amount = money.parseToCents(this.amountInput);
      if (amount === null || amount <= 0) {
        uni.showToast({
          title: '请输入正确金额',
          icon: 'none'
        });
        return;
      }
      if (this.type !== 'transfer' && !this.categoryId) {
        uni.showToast({
          title: '请选择分类',
          icon: 'none'
        });
        return;
      }
      if (this.type === 'transfer' && this.toAccountId === this.accountId) {
        uni.showToast({
          title: '请选择不同的转入账户',
          icon: 'none'
        });
        return;
      }
      const result = store.updateBill(this.id, {
        type: this.type,
        amount,
        categoryId: this.type === 'transfer' ? '' : this.categoryId,
        accountId: this.accountId,
        toAccountId: this.type === 'transfer' ? this.toAccountId : '',
        date: this.date,
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
      uni.showToast({
        title: '已保存',
        icon: 'success'
      });
      setTimeout(() => uni.navigateBack(), 500);
    },
    removeBill() {
      uni.showModal({
        title: '删除记录',
        content: '删除后不可恢复，账户余额与统计会同步更新。',
        confirmText: '删除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          store.deleteBill(this.id);
          uni.showToast({
            title: '已删除',
            icon: 'none'
          });
          setTimeout(() => uni.navigateBack(), 500);
        }
      });
    },
    goBack() {
      uni.navigateBack();
    }
  }
};</script>

<style scoped>
.edit-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.edit-type {
  display: flex;
  margin-bottom: 18rpx;
}

.edit-type .chip {
  height: 64rpx;
  padding: 0 30rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
}

.amount-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 24rpx 30rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.amount-cap {
  font-size: 23rpx;
  color: #86909C;
}

.amount-input-row {
  display: flex;
  align-items: baseline;
  margin-top: 4rpx;
}

.amount-symbol {
  font-size: 36rpx;
  font-weight: 600;
  margin-right: 10rpx;
}

.amount-input {
  flex: 1;
  font-size: 66rpx;
  font-weight: 600;
  height: 92rpx;
  line-height: 92rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.note-card {
  position: relative;
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.edit-note {
  width: 100%;
  height: 130rpx;
  font-size: 27rpx;
  line-height: 1.6;
}

.note-count {
  text-align: right;
  font-size: 21rpx;
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

.img-plus {
  font-size: 40rpx;
  line-height: 1;
}

.img-text {
  font-size: 22rpx;
  margin-top: 8rpx;
}

.edit-actions {
  margin-top: 40rpx;
}

.delete-btn {
  margin-top: 20rpx;
}

.empty-btn {
  margin-top: 20rpx;
  width: 240rpx;
  height: 76rpx;
  line-height: 76rpx;
}
</style>
