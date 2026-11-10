<template>
  <view class="xtb-wrap">
    <view class="xtb-holder"></view>
    <view class="xtb">
      <view class="xtb-capsule">
        <view class="xtb-thumb-layer">
          <view class="xtb-thumb-mover" :style="'transform: translate3d(' + activeIndex * 100 + '%, 0, 0)'">
            <view :class="'xtb-thumb ' + (thumbIn ? 'xtb-thumb-in' : '')"></view>
          </view>
        </view>
        <view class="xtb-tabs">
          <view
            class="xtb-tab"
            v-for="(item, index) in tabs"
            :key="item.key"
            :class="{ on: item.key === current }"
            @tap="switchTo(index)"
          >
            <text class="xtb-ico">{{ item.icon }}</text>
            <text class="xtb-label">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>import tabnav from '../../utils/tabnav.js';
const TABS = [{
  key: 'record',
  label: '记账',
  icon: '✏️',
  path: '/pages/record/record'
}, {
  key: 'list',
  label: '明细',
  icon: '📋',
  path: '/pages/list/list'
}, {
  key: 'stats',
  label: '统计',
  icon: '📊',
  path: '/pages/stats/stats'
}, {
  key: 'mine',
  label: '我的',
  icon: '👤',
  path: '/pages/mine/mine'
}];
export default {
  name: 'XTabbar',
  props: {
    current: {
      type: String,
      default: 'record'
    }
  },
  data() {
    return {
      tabs: TABS,
      thumbIn: false
    };
  },
  computed: {
    activeIndex() {
      const index = this.tabs.findIndex(t => t.key === this.current);
      return index < 0 ? 0 : index;
    }
  },
  mounted() {
    setTimeout(() => {
      this.thumbIn = true;
    }, 30);
  },
  methods: {
    switchTo(index) {
      if (index === this.activeIndex) return;
      const tabs = this.tabs;
      tabnav.set({
        key: tabs[index].key,
        dir: index > this.activeIndex ? 1 : -1
      });
      uni.reLaunch({
        url: tabs[index].path
      });
    }
  }
};</script>

<style scoped>
.xtb-wrap {
  width: 100%;
}

.xtb-holder {
  height: 156rpx;
  height: calc(156rpx + constant(safe-area-inset-bottom));
  height: calc(156rpx + env(safe-area-inset-bottom));
}

.xtb {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  justify-content: center;
  padding: 0 44rpx;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: calc(18rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 悬浮胶囊容器 */
.xtb-capsule {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 620rpx;
  height: 126rpx;
  border-radius: 63rpx;
  background: rgba(236, 238, 241, 0.95);
  -webkit-backdrop-filter: blur(20rpx);
  backdrop-filter: blur(20rpx);
  box-shadow: 0 12rpx 36rpx rgba(31, 35, 41, 0.12), 0 0 0 2rpx rgba(255, 255, 255, 0.9);
}

.xtb-thumb-layer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  border-radius: 63rpx;
  overflow: hidden;
}

.xtb-thumb-mover {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 25%;
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

.xtb-thumb {
  position: absolute;
  left: 8rpx;
  right: 8rpx;
  top: 8rpx;
  bottom: 8rpx;
  border-radius: 56rpx;
  background: #FFFFFF;
  box-shadow: 0 6rpx 16rpx rgba(31, 35, 41, 0.12);
}

/* 选中块在原位置淡入，不做位移 */
.xtb-thumb-in {
  animation: xtb-thumb-fade 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes xtb-thumb-fade {
  0% {
    opacity: 0.3;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.xtb-tabs {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  height: 126rpx;
}

.xtb-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.xtb-ico {
  font-size: 34rpx;
  line-height: 1;
  opacity: 0.5;
  filter: grayscale(1);
  transform: scale(0.94);
  transition: opacity 200ms ease-out, transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
}

.xtb-label {
  margin-top: 6rpx;
  font-size: 21rpx;
  line-height: 1;
  color: #8A939E;
  letter-spacing: 0.02em;
  transition: color 200ms ease-out;
}

.xtb-tab.on .xtb-ico {
  opacity: 1;
  filter: none;
  transform: scale(1);
}

.xtb-tab.on .xtb-label {
  color: #00875A;
  font-weight: 600;
}
</style>
