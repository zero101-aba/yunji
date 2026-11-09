<template>
<view class="cat-page">
  <view class="type-seg-wrap">
    <view class="seg">
      <view :class="'seg-item ' + (type === 'expense' ? 'on' : '')" data-type="expense" @tap="switchType">支出分类</view>
      <view :class="'seg-item ' + (type === 'income' ? 'on' : '')" data-type="income" @tap="switchType">收入分类</view>
    </view>
  </view>

  <view class="list-intro">共 {{totalCount}} 个分类，隐藏的分类不会出现在记账页。拖动排序可用箭头完成。</view>

  <view class="cat-card" v-for="(group, index) in groups" :key="group.id">
    <view :class="'top-row ' + (group.hidden ? 'dim' : '')" :data-id="(group.id)" @tap="edit">
      <view class="cat-icon" :style="'background: ' + (group.tint)">{{group.icon}}</view>
      <view class="cat-main">
        <view class="cat-name-line">
          <text class="cat-name">{{group.name}}</text>
          <text class="hidden-tag" v-if="group.hidden">已隐藏</text>
        </view>
        <text class="cat-sub">{{group.children.length}} 个二级分类</text>
      </view>
      <view class="cat-actions">
        <view class="mini-act" :data-id="(group.id)" data-dir="-1" @tap.stop="move">↑</view>
        <view class="mini-act" :data-id="(group.id)" data-dir="1" @tap.stop="move">↓</view>
        <view class="mini-act text" :data-id="(group.id)" :data-hidden="(group.hidden)" @tap.stop="toggleHide">{{group.hidden ? '显示' : '隐藏'}}</view>
      </view>
    </view>

    <view class="child-list">
      <view :class="'child-row ' + (item.hidden ? 'dim' : '')" v-for="(item, index) in group.children" :key="item.id" :data-id="(item.id)" @tap="edit">
        <text class="child-icon">{{item.icon}}</text>
        <text class="child-name">{{item.name}}</text>
        <text class="hidden-tag small" v-if="item.hidden">隐藏</text>
        <view class="cat-actions">
          <view class="mini-act" :data-id="(item.id)" data-dir="-1" @tap.stop="move">↑</view>
          <view class="mini-act" :data-id="(item.id)" data-dir="1" @tap.stop="move">↓</view>
          <view class="mini-act text" :data-id="(item.id)" :data-hidden="(item.hidden)" @tap.stop="toggleHide">{{item.hidden ? '显示' : '隐藏'}}</view>
        </view>
      </view>
      <view class="add-child" :data-parent="(group.id)" @tap.stop="addChild">＋ 添加二级分类</view>
    </view>
  </view>

  <view class="empty" v-if="groups.length === 0">
    <view class="empty-icon">🏷️</view>
    <view class="empty-title">还没有分类</view>
    <view class="empty-desc">添加常用分类，记账更快</view>
  </view>

  <view class="btn-primary add-btn" @tap="addTop">＋ 添加一级分类</view>
</view>
</template>

<script>import store from '../../utils/store.js';
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
      type: 'expense',
      groups: [],
      totalCount: 0
    };
  },
  onLoad(options) {
    if (options.type === 'income') this.setData({
      type: 'income'
    });
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const all = store.getCategories();
      const tops = all.filter(c => c.type === this.type && !c.parentId).sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const groups = tops.map(top => {
        const children = all.filter(c => c.parentId === top.id).sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          hidden: !!c.hidden
        }));
        return {
          id: top.id,
          name: top.name,
          icon: top.icon,
          color: top.color,
          tint: hexToRgba(top.color, 0.12),
          hidden: !!top.hidden,
          children
        };
      });
      this.setData({
        groups,
        totalCount: all.filter(c => c.type === this.type).length
      });
    },
    switchType(e) {
      const type = e.currentTarget.dataset.type;
      if (type === this.type) return;
      this.setData({
        type
      });
      this.refresh();
    },
    addTop() {
      uni.navigateTo({
        url: '/pages/category-edit/category-edit?type=' + this.type
      });
    },
    addChild(e) {
      const parentId = e.currentTarget.dataset.parent;
      uni.navigateTo({
        url: '/pages/category-edit/category-edit?type=' + this.type + '&parentId=' + parentId
      });
    },
    edit(e) {
      const id = e.currentTarget.dataset.id;
      uni.navigateTo({
        url: '/pages/category-edit/category-edit?id=' + id
      });
    },
    move(e) {
      const id = e.currentTarget.dataset.id;
      const dir = Number(e.currentTarget.dataset.dir);
      store.reorderCategory(id, dir);
      this.refresh();
    },
    toggleHide(e) {
      const id = e.currentTarget.dataset.id;
      const hidden = e.currentTarget.dataset.hidden === 'true' || e.currentTarget.dataset.hidden === true;
      store.toggleCategoryHidden(id, !hidden);
      this.refresh();
    }
  }
};</script>

<style scoped>
.cat-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 70rpx;
  background: #F6F7F9;
}

.type-seg-wrap {
  margin-bottom: 18rpx;
}

.list-intro {
  font-size: 22rpx;
  color: #86909C;
  line-height: 1.6;
  padding: 0 4rpx 16rpx;
}

.cat-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 0 22rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.top-row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
}

.top-row.dim {
  opacity: 0.55;
}

.cat-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  flex-shrink: 0;
}

.cat-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
}

.cat-name-line {
  display: flex;
  align-items: center;
}

.cat-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #1F2329;
}

.cat-sub {
  display: block;
  font-size: 21rpx;
  color: #86909C;
  margin-top: 3rpx;
}

.hidden-tag {
  font-size: 18rpx;
  color: #86909C;
  background: #F2F3F5;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
  margin-left: 10rpx;
}

.hidden-tag.small {
  margin-left: 8rpx;
}

.cat-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.mini-act {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 10rpx;
  background: #F2F3F5;
  color: #86909C;
  font-size: 24rpx;
  margin-left: 8rpx;
}

.mini-act.text {
  width: auto;
  padding: 0 12rpx;
  font-size: 20rpx;
}

.child-list {
  border-top: 1rpx solid #EEF1F5;
  padding-left: 20rpx;
}

.child-row {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #F2F3F5;
}

.child-row.dim {
  opacity: 0.55;
}

.child-icon {
  font-size: 28rpx;
  width: 44rpx;
}

.child-name {
  flex: 1;
  font-size: 25rpx;
  color: #4E5969;
}

.add-child {
  padding: 18rpx 0 20rpx;
  font-size: 22rpx;
  color: #00B578;
  text-align: center;
}

.add-btn {
  margin-top: 24rpx;
}
</style>
