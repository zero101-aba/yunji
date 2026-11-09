<template>
<view class="cedit-page">
  <view class="preview">
    <view class="preview-icon" :style="'background: ' + (color) + '22; color: ' + (color)">{{icon}}</view>
    <view class="preview-name">{{name || '新分类'}}</view>
    <view class="preview-type">{{typeLabel}}分类</view>
  </view>

  <view class="form-card">
    <view class="form-row">
      <text class="form-label">名称</text>
      <input class="form-input" :value="(name)" maxlength="8" placeholder="例如：早餐" placeholder-class="placeholder" @input="onName" />
    </view>
    <picker v-if="canChooseParent" mode="selector" :range="(parentOptions)" range-key="name" :value="(parentIndex)" @change="onParent">
      <view class="form-row">
        <text class="form-label">上级分类</text>
        <view class="form-value">{{parentName}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <view class="form-row">
      <text class="form-label">在记账页隐藏</text>
      <view :class="'toggle ' + (hidden ? 'on' : '')" @tap.stop="toggleHidden">
        <view class="toggle-dot"></view>
      </view>
    </view>
  </view>

  <view class="section-label">图标</view>
  <view class="icon-grid">
    <view :class="'icon-cell ' + (icon === item ? 'on' : '')" v-for="(item, index) in icons" :key="index" :data-icon="(item)" @tap="selectIcon">{{item}}</view>
  </view>

  <template v-if="!parentId">
    <view class="section-label">颜色</view>
    <view class="color-grid">
      <view :class="'color-cell ' + (color === item ? 'on' : '')" v-for="(item, index) in colors" :key="index" :data-color="(item)" @tap="selectColor">
        <view class="color-dot" :style="'background: ' + (item)"></view>
      </view>
    </view>
  </template>
  <view class="color-hint" v-else>二级分类会沿用上级分类的颜色，统计时合并计算。</view>

  <view class="actions safe-bottom">
    <view class="btn-primary" @tap="save">保存</view>
    <view class="btn-danger remove-btn" v-if="isEdit" @tap="remove">删除分类</view>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
const ICONS = ['🍜', '🥟', '🍛', '🍲', '🍪', '🥡', '☕', '🍎', '🚌', '🚇', '🚕', '⛽', '🅿️', '🚲', '✈️', '🏃', '🛍️', '🧴', '👕', '💻', '💄', '🧸', '🎁', '🧧', '🏠', '🔑', '💡', '🏢', '🔧', '🛋️', '🎬', '🍿', '🎮', '🎵', '💊', '🏥', '🩺', '📚', '📖', '🎓', '✏️', '📱', '💰', '🏆', '📈', '🧰', '✨', '📦', '🏷️', '🐱'];
const COLORS = ['#FA5151', '#FF8F1F', '#00A76B', '#3D7FFF', '#8F6BFF', '#8F6BFF', '#00B578', '#FA5151', '#FF8F1F', '#3D7FFF', '#86909C', '#00B578'];
export default {
  data() {
    return {
      id: '',
      isEdit: false,
      type: 'expense',
      typeLabel: '支出',
      parentId: '',
      parentIndex: 0,
      parentName: '一级分类',
      parentOptions: [],
      canChooseParent: true,
      name: '',
      icon: '🏷️',
      color: '#86909C',
      hidden: false,
      icons: ICONS,
      colors: COLORS
    };
  },
  onLoad(options) {
    if (options.id) {
      const category = store.getCategory(options.id);
      if (!category) {
        uni.showToast({
          title: '分类不存在',
          icon: 'none'
        });
        setTimeout(() => uni.navigateBack(), 500);
        return;
      }
      const hasChildren = store.getCategories().some(c => c.parentId === category.id);
      const type = category.type;
      const parentId = category.parentId || '';
      this.setData({
        id: category.id,
        isEdit: true,
        type,
        typeLabel: type === 'income' ? '收入' : '支出',
        parentId,
        name: category.name,
        icon: category.icon,
        color: category.color,
        hidden: !!category.hidden,
        canChooseParent: !parentId && !hasChildren
      });
      this.buildParentOptions(type, parentId, category.id);
      return;
    }
    const type = options.type === 'income' ? 'income' : 'expense';
    const parentId = options.parentId || '';
    this.setData({
      type,
      typeLabel: type === 'income' ? '收入' : '支出',
      parentId,
      color: type === 'income' ? '#00A76B' : '#FA5151',
      icon: '🏷️'
    });
    this.buildParentOptions(type, parentId, '');
  },
  methods: {
    buildParentOptions(type, parentId, selfId) {
      const tops = store.getCategories().filter(c => c.type === type && !c.parentId && c.id !== selfId).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const options = [{
        id: '',
        name: '作为一级分类'
      }].concat(tops.map(c => ({
        id: c.id,
        name: c.name
      })));
      const index = Math.max(0, options.findIndex(o => o.id === parentId));
      this.setData({
        parentOptions: options,
        parentIndex: index,
        parentName: options[index].name,
        parentId: options[index].id
      });
    },
    onName(e) {
      this.setData({
        name: e.detail.value
      });
    },
    onParent(e) {
      const index = Number(e.detail.value);
      const option = this.parentOptions[index];
      if (!option) return;
      this.setData({
        parentIndex: index,
        parentName: option.name,
        parentId: option.id
      });
    },
    selectIcon(e) {
      this.setData({
        icon: e.currentTarget.dataset.icon
      });
    },
    selectColor(e) {
      this.setData({
        color: e.currentTarget.dataset.color
      });
    },
    toggleHidden() {
      this.setData({
        hidden: !this.hidden
      });
    },
    save() {
      const name = String(this.name || '').trim();
      if (!name) {
        uni.showToast({
          title: '请输入分类名称',
          icon: 'none'
        });
        return;
      }
      if (name.length > 8) {
        uni.showToast({
          title: '分类名称最多 8 个字',
          icon: 'none'
        });
        return;
      }
      const parentId = this.canChooseParent ? this.parentId : this.isEdit ? this.parentId : '';
      if (this.isEdit && parentId === this.id) {
        uni.showToast({
          title: '不能选择自己作为上级',
          icon: 'none'
        });
        return;
      }
      store.saveCategory({
        id: this.id || undefined,
        name,
        type: this.type,
        parentId: parentId === this.id ? '' : parentId,
        icon: this.icon,
        color: this.color,
        hidden: this.hidden
      });
      uni.showToast({
        title: '已保存',
        icon: 'success'
      });
      setTimeout(() => uni.navigateBack(), 450);
    },
    remove() {
      uni.showModal({
        title: '删除分类',
        content: '删除后不可恢复。已使用该分类的账单需要先改到其他分类。',
        confirmText: '删除',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          const result = store.deleteCategory(this.id);
          if (!result.ok) {
            let content = '无法删除该分类';
            if (result.reason === 'children') content = '该分类下还有二级分类，请先删除二级分类。';
            if (result.reason === 'referenced') content = '已有账单使用该分类，请先在明细中修改这些账单的分类。';
            uni.showModal({
              title: '无法删除',
              content,
              showCancel: false,
              confirmColor: '#00B578'
            });
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
.cedit-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0 20rpx;
}

.preview-icon {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 62rpx;
}

.preview-name {
  font-size: 32rpx;
  font-weight: 600;
  margin-top: 14rpx;
}

.preview-type {
  font-size: 22rpx;
  color: #86909C;
  margin-top: 2rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.icon-grid {
  display: flex;
  flex-wrap: wrap;
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.icon-cell {
  width: calc(16.66% - 12rpx);
  margin: 6rpx;
  height: 88rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  border: 1rpx solid transparent;
}

.icon-cell.on {
  background: #E4F8F0;
  border-color: rgba(0,181,120, 0.4);
}

.color-grid {
  display: flex;
  flex-wrap: wrap;
  background: #FFFFFF;
  border-radius: 22rpx;
  padding: 14rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.color-cell {
  width: calc(16.66% - 12rpx);
  margin: 6rpx;
  height: 84rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid transparent;
}

.color-cell.on {
  border-color: #00B578;
  background: #E4F8F0;
}

.color-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
}

.color-hint {
  margin-top: 18rpx;
  padding: 18rpx 22rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 14rpx;
  font-size: 22rpx;
  color: #86909C;
  line-height: 1.6;
}

.actions {
  margin-top: 40rpx;
}

.remove-btn {
  margin-top: 20rpx;
}
</style>
