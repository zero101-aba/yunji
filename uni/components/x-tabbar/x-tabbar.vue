<template>
  <view class="xtb-wrap">
    <view class="xtb-holder"></view>
    <view class="xtb" :class="'fx-' + effect">
      <view class="xtb-capsule">
        <view class="xtb-thumb-layer">
          <view class="xtb-thumb-mover" :style="'transform: translate3d(' + current * 100 + '%, 0, 0)'">
            <view class="xtb-thumb" :key="tick"></view>
          </view>
        </view>
        <view class="xtb-tabs">
          <view
            class="xtb-tab"
            v-for="(item, index) in tabs"
            :key="item.path"
            :class="{ on: index === current }"
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

<script>import store from '../../utils/store.js';
export default {
  name: 'XTabbar',
  props: {
    current: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      tick: 0,
      effect: 'slide',
      tabs: [{
        label: '记账',
        icon: '✏️',
        path: '/pages/record/record'
      }, {
        label: '明细',
        icon: '📋',
        path: '/pages/list/list'
      }, {
        label: '统计',
        icon: '📊',
        path: '/pages/stats/stats'
      }, {
        label: '我的',
        icon: '👤',
        path: '/pages/mine/mine'
      }]
    };
  },
  mounted() {
    const effect = store.getSettings().tabEffect;
    this.effect = ['jelly', 'slide', 'fade', 'none'].indexOf(effect) >= 0 ? effect : 'slide';
  },
  watch: {
    current() {
      this.tick += 1;
    }
  },
  methods: {
    switchTo(index) {
      if (index === this.current) return;
      uni.reLaunch({
        url: this.tabs[index].path
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
  overflow: hidden;
}

.xtb-thumb-layer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
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
  transform-origin: center center;
}

/* 果冻弹性 */
.fx-jelly .xtb-thumb {
  animation: xtb-jelly 420ms cubic-bezier(0.34, 1.35, 0.64, 1) both;
}

/* 柔和淡入 */
.fx-fade .xtb-thumb {
  animation: xtb-fade 240ms ease-out both;
}

/* 无动画 */
.fx-none .xtb-thumb {
  animation: none;
}

.fx-none .xtb-thumb-mover {
  transition: none;
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

@keyframes xtb-fade {
  0% {
    opacity: 0;
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes xtb-jelly {
  0% {
    transform: scale(1.06, 0.92);
  }
  30% {
    transform: scale(0.94, 1.05);
  }
  58% {
    transform: scale(1.02, 0.98);
  }
  78% {
    transform: scale(0.99, 1.01);
  }
  100% {
    transform: scale(1, 1);
  }
}
</style>
