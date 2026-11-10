<template>
<view class="share-page">
  <view class="page-title">
    <view class="title">账单分享</view>
    <view class="sub">生成一张月报海报，保存或转发给好友</view>
  </view>

  <view class="month-nav">
    <view class="m-arrow" data-dir="-1" @tap="shift">‹</view>
    <text class="m-label">{{ymLabel}}</text>
    <view class="m-arrow" data-dir="1" @tap="shift">›</view>
  </view>

  <view class="poster-wrap">
    <canvas canvas-id="poster" id="poster" class="poster-canvas"></canvas>
  </view>

  <view class="share-actions">
    <view class="btn-ghost flex1" @tap="copyText">复制账单文字</view>
    <view class="btn-primary flex1 save-btn" @tap="saveToAlbum">保存到相册</view>
  </view>

  <!-- #ifdef MP-WEIXIN -->
  <button class="btn-ghost share-btn" open-type="share">转发给好友</button>
  <!-- #endif -->
  <!-- #ifndef MP-WEIXIN -->
  <view class="btn-ghost share-btn" @tap="sharePoster">分享海报</view>
  <!-- #endif -->

  <view class="tip-card">
    <text class="tip-title">关于分享</text>
    <text class="tip-desc">海报仅包含月度收支、分类构成与记账天数，不包含任何备注和账户余额。开启「金额隐私模式」后，海报上的金额会显示为 ****。</text>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
function truncateText(text, maxWidth, fontSize) {
  const value = String(text || '');
  let width = 0;
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    const charWidth = /[\u4e00-\u9fa5]/.test(ch) ? fontSize : fontSize * 0.56;
    if (out.length > 0 && width + charWidth + fontSize * 0.6 > maxWidth) return out + '…';
    width += charWidth;
    out += ch;
  }
  return out;
}
export default {
  data() {
    return {
      ym: '',
      ymLabel: '',
      hideAmount: false,
      expenseText: '',
      incomeText: '',
      balanceText: '',
      count: 0,
      days: 0,
      hasData: false
    };
  },
  onLoad(query) {
    const currentYm = dateUtil.ymOf(dateUtil.todayStr());
    const ym = query && /^\d{4}-\d{2}$/.test(query.ym || '') ? query.ym : currentYm;
    this.setData({
      ym,
      ymLabel: dateUtil.monthLabel(ym)
    });
  },
  onReady() {
    this.ready = true;
    this.refresh(() => this.drawPoster());
  },
  onShow() {
    if (this.ready) this.refresh(() => this.drawPoster());
  },
  onShareAppMessage() {
    return {
      title: this.ymLabel + '账单 · 支出 ' + this.expenseText,
      path: '/pages/share/share?ym=' + this.ym
    };
  },
  methods: {
    refresh(callback) {
      const hide = !!store.getSettings().hideAmount;
      const ym = this.ym;
      const bills = store.getMonthBills(ym);
      const totals = store.monthTotals(ym);
      const categories = store.getCategories();
      const catMap = {};
      categories.forEach(c => {
        catMap[c.id] = c;
      });
      const map = {};
      bills.forEach(b => {
        if (b.type !== 'expense') return;
        const cat = catMap[b.categoryId];
        const key = cat ? cat.parentId || cat.id : '__other__';
        const top = cat ? cat.parentId ? catMap[cat.parentId] : cat : null;
        if (!map[key]) {
          map[key] = {
            name: top ? top.name : '未分类',
            color: top ? top.color : '#86909C',
            amount: 0
          };
        }
        map[key].amount += Number(b.amount) || 0;
      });
      const rankList = Object.keys(map).map(k => map[k]).sort((a, b) => b.amount - a.amount).slice(0, 4);
      const days = Object.keys(bills.reduce((acc, b) => {
        acc[b.date] = true;
        return acc;
      }, {})).length;
      this.posterData = {
        hide,
        totals,
        ranks: rankList.map(r => ({
          name: r.name,
          color: r.color,
          amountText: hide ? '****' : '¥' + money.formatCents(r.amount),
          percent: totals.expense ? r.amount / totals.expense * 100 : 0
        })),
        count: bills.length,
        days
      };
      this.setData({
        hideAmount: hide,
        expenseText: money.money(totals.expense, hide),
        incomeText: money.money(totals.income, hide),
        balanceText: money.money(totals.balance, hide),
        count: bills.length,
        days,
        hasData: bills.length > 0
      }, callback);
    },
    shift(e) {
      const dir = Number(e.currentTarget.dataset.dir);
      const ym = dateUtil.addMonths(this.ym, dir);
      this.setData({
        ym,
        ymLabel: dateUtil.monthLabel(ym)
      });
      this.refresh(() => this.drawPoster());
    },
    initPoster(done) {
      uni.createSelectorQuery().in(this).select('#poster').boundingClientRect(rect => {
        if (!rect || !rect.width || !rect.height) {
          if (typeof done === 'function') done();
          return;
        }
        this.posterWidth = rect.width;
        this.posterHeight = rect.height;
        this.posterCtx = uni.createCanvasContext('poster', this);
        this.paintPoster(this.posterCtx, rect.width, rect.height, done);
      }).exec();
    },
    drawPoster(done) {
      if (!this.ready) return;
      if (!this.posterCtx) {
        this.initPoster(done);
        return;
      }
      this.paintPoster(this.posterCtx, this.posterWidth, this.posterHeight, done);
    },
    paintPoster(ctx, w, h, done) {
      const data = this.posterData || {};
      const totals = data.totals || {
        expense: 0,
        income: 0,
        balance: 0
      };
      const hide = !!data.hide;
      const pad = w * 0.08;
      ctx.setFillStyle('#FFFFFF');
      ctx.fillRect(0, 0, w, h);
      ctx.setFillStyle('#FF8F1F');
      ctx.fillRect(0, 0, w, 4);
      ctx.setTextAlign('left');
      ctx.setFillStyle('#86909C');
      ctx.setFontSize(Math.round(w * 0.028));
      ctx.fillText('星记 · 月度账单', pad, h * 0.092);
      ctx.setFillStyle('#1F2329');
      ctx.setFontSize(Math.round(w * 0.072));
      ctx.fillText(this.ymLabel, pad, h * 0.172);
      ctx.setFillStyle('#FF8F1F');
      ctx.fillRect(pad, h * 0.215, w * 0.11, 3);
      ctx.setFillStyle('#86909C');
      ctx.setFontSize(Math.round(w * 0.03));
      ctx.fillText('本月支出', pad, h * 0.278);
      const expenseText = hide ? '****' : totals.expense === 0 ? '¥0.00' : '¥' + money.formatCents(totals.expense);
      let amountSize = w * 0.128;
      if (expenseText.length > 9) amountSize = w * 0.104;
      if (expenseText.length > 12) amountSize = w * 0.086;
      ctx.setFillStyle('#FA5151');
      ctx.setFontSize(Math.round(amountSize));
      ctx.fillText(expenseText, pad, h * 0.375);
      const colY = h * 0.447;
      ctx.setFillStyle('#86909C');
      ctx.setFontSize(Math.round(w * 0.028));
      ctx.fillText('本月收入', pad, colY);
      ctx.fillText('本月结余', pad + (w - pad * 2) * 0.5, colY);
      ctx.setFillStyle('#00A76B');
      ctx.setFontSize(Math.round(w * 0.046));
      ctx.fillText(hide ? '****' : '¥' + money.formatCents(totals.income), pad, colY + h * 0.048);
      ctx.setFillStyle(totals.balance >= 0 ? '#00B578' : '#FA5151');
      ctx.setFontSize(Math.round(w * 0.046));
      ctx.fillText(hide ? '****' : '¥' + money.formatCents(totals.balance), pad + (w - pad * 2) * 0.5, colY + h * 0.048);
      ctx.setFillStyle('#E5E6EB');
      ctx.fillRect(pad, h * 0.545, w - pad * 2, 1);
      ctx.setFillStyle('#1F2329');
      ctx.setFontSize(Math.round(w * 0.034));
      ctx.fillText('支出构成', pad, h * 0.6);
      const ranks = data.ranks || [];
      if (!ranks.length) {
        ctx.setFillStyle('#C9CDD4');
        ctx.setFontSize(Math.round(w * 0.032));
        ctx.fillText('这个月还没有支出记录', pad, h * 0.665);
      } else {
        const startY = h * 0.645;
        const rowH = h * 0.068;
        const barWidth = w - pad * 2;
        const nameSize = w * 0.03;
        ranks.forEach((rank, i) => {
          const y = startY + i * rowH;
          ctx.setTextAlign('left');
          ctx.setFillStyle('#4E5969');
          ctx.setFontSize(Math.round(nameSize));
          ctx.fillText(truncateText(rank.name, barWidth * 0.5, nameSize), pad, y);
          ctx.setTextAlign('right');
          ctx.setFillStyle('#1F2329');
          ctx.setFontSize(Math.round(w * 0.029));
          ctx.fillText(rank.amountText, w - pad, y);
          ctx.setFillStyle('#F2F3F5');
          ctx.fillRect(pad, y + h * 0.016, barWidth, 5);
          ctx.setFillStyle(rank.color || '#00B578');
          ctx.fillRect(pad, y + h * 0.016, Math.max(3, barWidth * Math.min(1, rank.percent / 100)), 5);
        });
      }
      ctx.setFillStyle('#E5E6EB');
      ctx.fillRect(pad, h * 0.895, w - pad * 2, 1);
      ctx.setTextAlign('left');
      ctx.setFillStyle('#86909C');
      ctx.setFontSize(Math.round(w * 0.026));
      ctx.fillText('共 ' + (data.count || 0) + ' 笔 · 记账 ' + (data.days || 0) + ' 天', pad, h * 0.935);
      ctx.setTextAlign('right');
      ctx.setFillStyle('#C9CDD4');
      ctx.setFontSize(Math.round(w * 0.024));
      ctx.fillText('数据只存在本机', w - pad, h * 0.935);
      ctx.draw(false, () => {
        if (typeof done === 'function') done();
      });
    },
    saveToAlbum() {
      this.renderThenExport(false);
    },
    sharePoster() {
      this.renderThenExport(true);
    },
    renderThenExport(forShare) {
      if (!this.ready) {
        uni.showToast({
          title: '页面还在加载，请稍候',
          icon: 'none'
        });
        return;
      }
      uni.showLoading({
        title: '生成图片'
      });
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        this.exportPoster(forShare);
      };
      this.drawPoster(finish);
      setTimeout(finish, 600);
    },
    exportPoster(forShare) {
      if (!this.posterWidth || !this.posterHeight) {
        uni.hideLoading();
        uni.showToast({
          title: '海报还在生成，请稍候',
          icon: 'none'
        });
        return;
      }
      uni.canvasToTempFilePath({
        canvasId: 'poster',
        x: 0,
        y: 0,
        width: this.posterWidth,
        height: this.posterHeight,
        destWidth: this.posterWidth * 2,
        destHeight: this.posterHeight * 2,
        success: res => {
          uni.hideLoading();
          if (forShare) {
            this.shareImage(res.tempFilePath);
            return;
          }
          this.saveImage(res.tempFilePath);
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({
            title: '生成图片失败，请重试',
            icon: 'none'
          });
        }
      }, this);
    },
    saveImage(filePath) {
      uni.saveImageToPhotosAlbum({
        filePath,
        success: () => uni.showToast({
          title: '已保存到相册',
          icon: 'success'
        }),
        fail: err => {
          const msg = String(err && err.errMsg || '');
          if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0) {
            uni.showModal({
              title: '需要相册权限',
              content: '保存图片需要允许访问相册，请在系统设置中开启后重试。',
              showCancel: false,
              confirmText: '知道了',
              confirmColor: '#00B578'
            });
          } else {
            uni.showToast({
              title: '保存失败，请重试',
              icon: 'none'
            });
          }
        }
      });
    },
    shareImage(filePath) {
      // #ifdef APP-PLUS
      if (typeof plus !== 'undefined' && plus.share && plus.share.sendWithSystem) {
        plus.share.sendWithSystem({
          type: 'image',
          pictures: [filePath]
        }, () => {}, () => {
          uni.showToast({
            title: '已取消分享',
            icon: 'none'
          });
        });
        return;
      }
      // #endif
      // #ifdef H5
      if (typeof window !== 'undefined') {
        window.open(filePath, '_blank');
        uni.showToast({
          title: '已打开海报，长按或右键保存',
          icon: 'none'
        });
        return;
      }
      // #endif
      this.saveImage(filePath);
    },
    copyText() {
      const d = this;
      const lines = ['【' + d.ymLabel + '账单】', '支出：' + d.expenseText, '收入：' + d.incomeText, '结余：' + d.balanceText, '共 ' + d.count + ' 笔 · 记账 ' + d.days + ' 天', '—— 星记 · 数据只存在本机'];
      uni.setClipboardData({
        data: lines.join('\n'),
        success: () => uni.showToast({
          title: '账单文字已复制',
          icon: 'success'
        })
      });
    }
  }
};</script>

<style scoped>
.share-page {
  min-height: 100vh;
  padding: 16rpx 26rpx 60rpx;
  background: #F6F7F9;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 0 22rpx;
}

.m-arrow {
  width: 52rpx;
  height: 52rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  background: #EEF1F5;
  color: #4E5969;
  font-size: 36rpx;
}

.m-label {
  font-size: 30rpx;
  font-weight: 600;
  margin: 0 20rpx;
  min-width: 200rpx;
  text-align: center;
}

.poster-wrap {
  border-radius: 26rpx;
  overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 14rpx 36rpx rgba(31,35,41, 0.1);
}

.poster-canvas {
  display: block;
  width: 100%;
  height: 1060rpx;
}

.share-actions {
  display: flex;
  margin-top: 30rpx;
}

.share-actions .btn-ghost {
  margin-right: 16rpx;
}

.save-btn {
  height: 84rpx;
  line-height: 84rpx;
}

.share-btn {
  margin-top: 18rpx;
  width: 100%;
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
</style>
