<template>
<view class="data-page">
  <view class="storage-card">
    <view class="row between">
      <text class="storage-title">本地存储占用</text>
      <text class="storage-val">{{storageText}}</text>
    </view>
    <view class="storage-track">
      <view :class="'storage-fill ' + (storageWarn ? 'warn' : '')" :style="'width: ' + (storagePercent) + '%'"></view>
    </view>
    <view class="storage-meta">共 {{billCount}} 笔账单 · {{monthCount}} 个月份</view>
    <view class="storage-warn" v-if="storageWarn">存储接近上限，建议导出备份后清理不常用的图片凭证。</view>
  </view>

  <view class="section-label">导出账单</view>
  <view class="card">
    <picker mode="selector" :range="(exportOptions)" range-key="name" :value="(exportIndex)" @change="onExportScope">
      <view class="form-row">
        <text class="form-label">导出范围</text>
        <view class="form-value">{{exportName}}<text class="arrow-right">›</text></view>
      </view>
    </picker>
    <view class="card-desc">导出为 CSV，包含日期、时间、类型、分类、账户、金额与备注，可直接用 Excel 打开。</view>
    <view class="btn-primary export-btn" @tap="exportCsv">导出 CSV 文件</view>
  </view>

  <view class="section-label">备份与恢复</view>
  <view class="card">
    <view class="card-desc">备份包含账户、分类、预算、模板和全部账单。建议每月备份一次并保存到电脑或网盘。</view>
    <view class="backup-row">
      <view class="btn-primary flex1" @tap="generateBackup">生成并复制备份</view>
      <view class="btn-ghost backup-file-btn" @tap="saveBackupFile">存为文件</view>
    </view>
    <view class="backup-info" v-if="backupInfo">{{backupInfo}}</view>
    <view class="divider backup-divider"></view>
    <view class="restore-label">粘贴备份内容恢复</view>
    <textarea class="restore-input" :value="(restoreText)" placeholder="在此粘贴之前复制的备份内容（JSON）" placeholder-class="placeholder" @input="onRestoreInput" maxlength="-1"></textarea>
    <view class="btn-ghost restore-btn" @tap="restoreBackup">恢复备份</view>
  </view>

  <view class="section-label">危险操作</view>
  <view class="danger-card">
    <view class="danger-title">清空全部账单</view>
    <view class="danger-desc">删除所有账单并把账户余额重置为初始余额，分类和账户设置保留。此操作不可撤销。</view>
    <view class="btn-danger" @tap="clearBills">清空账单</view>
  </view>

  <view class="foot-tip">
    <text class="foot-tip-strong">为什么一定要备份？</text>
    <text class="foot-tip-text">数据只存在当前设备的本地存储中。清理应用缓存、卸载应用或更换手机都会导致数据永久丢失，定期备份可以避免损失。</text>
  </view>
</view>
</template>

<script>import store from '../../utils/store.js';
import dateUtil from '../../utils/date.js';
import money from '../../utils/money.js';
function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
const TYPE_LABEL = {
  expense: '支出',
  income: '收入',
  transfer: '转账'
};
export default {
  data() {
    return {
      storageText: '',
      storagePercent: 0,
      storageWarn: false,
      billCount: 0,
      monthCount: 0,
      exportOptions: [],
      exportIndex: 0,
      exportName: '全部账单',
      busy: false,
      backupInfo: '',
      restoreText: ''
    };
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const storage = store.storageInfo();
      const months = store.getBillMonths();
      const options = [{
        id: 'all',
        name: '全部账单'
      }].concat(months.map(ym => ({
        id: ym,
        name: dateUtil.monthLabel(ym)
      })));
      let count = 0;
      try {
        count = store.allBills().length;
      } catch (e) {
        count = 0;
      }
      let backupInfo = this.backupInfo;
      if (this.backupText) {
        backupInfo = '已生成 ' + Math.round(this.backupText.length / 1024) + ' KB 备份内容';
      }
      this.setData({
        storageText: Math.round(storage.currentSize) + ' KB / ' + Math.round(storage.limitSize / 1024) + ' MB',
        storagePercent: Math.min(100, Math.round(storage.currentSize / (storage.limitSize || 10240) * 100)),
        storageWarn: storage.currentSize > storage.limitSize * 0.7,
        billCount: count,
        monthCount: months.length,
        exportOptions: options,
        backupInfo
      });
    },
    onExportScope(e) {
      const index = Number(e.detail.value);
      const option = this.exportOptions[index];
      if (!option) return;
      this.setData({
        exportIndex: index,
        exportName: option.name
      });
    },
    exportCsv() {
      if (this.busy) return;
      const scope = this.exportOptions[this.exportIndex].id;
      const list = scope === 'all' ? store.allBills() : store.getMonthBills(scope);
      if (!list.length) {
        uni.showToast({
          title: '没有可导出的账单',
          icon: 'none'
        });
        return;
      }
      const catMap = {};
      store.getCategories().forEach(c => {
        catMap[c.id] = c;
      });
      const accMap = {};
      store.getAccounts().forEach(a => {
        accMap[a.id] = a;
      });
      const header = ['日期', '时间', '类型', '分类', '账户', '金额(元)', '备注'];
      const lines = [header.map(csvCell).join(',')];
      list.slice().reverse().forEach(b => {
        const cat = catMap[b.categoryId];
        const acc = accMap[b.accountId];
        let accountText = acc ? acc.name : '';
        if (b.type === 'transfer') {
          const to = accMap[b.toAccountId];
          accountText = accountText + ' → ' + (to ? to.name : '');
        }
        lines.push([csvCell(b.date), csvCell(b.time), csvCell(TYPE_LABEL[b.type] || b.type), csvCell(b.type === 'transfer' ? '转账' : cat ? store.categoryDisplayName(b.categoryId) : '未分类'), csvCell(accountText), csvCell(money.centToInput(b.amount)), csvCell(b.note || '')].join(','));
      });
      const csv = '\ufeff' + lines.join('\r\n');
      const fileName = '星记_' + (scope === 'all' ? '全部账单' : scope) + '.csv';
      this.setData({
        busy: true
      });
      this.saveTextFile(csv, fileName, '账单 CSV 已导出', csv.replace(/\ufeff/g, ''));
    },
    copyFallback(text, title) {
      uni.setClipboardData({
        data: text,
        success: () => uni.showToast({
          title,
          icon: 'none'
        })
      });
    },
    saveTextFile(content, fileName, successText, plainText) {
      // #ifdef MP-WEIXIN
      try {
        const fs = wx.getFileSystemManager();
        const filePath = wx.env.USER_DATA_PATH + '/' + fileName;
        fs.writeFile({
          filePath,
          data: content,
          encoding: 'utf8',
          success: () => {
            this.setData({
              busy: false
            });
            if (wx.shareFileMessage) {
              wx.shareFileMessage({
                filePath,
                success: () => uni.showToast({
                  title: successText,
                  icon: 'none'
                }),
                fail: () => this.copyFallback(plainText, '文件已生成，内容已复制')
              });
            } else {
              this.copyFallback(plainText, '文件已生成，内容已复制');
            }
          },
          fail: () => {
            this.setData({
              busy: false
            });
            this.copyFallback(plainText, '文件写入失败，内容已复制');
          }
        });
      } catch (e) {
        this.setData({
          busy: false
        });
        this.copyFallback(plainText, '文件写入失败，内容已复制');
      }
      // #endif

      // #ifdef APP-PLUS
      plus.io.resolveLocalFileSystemURL('_downloads/', root => {
        root.getFile(fileName, {
          create: true
        }, entry => {
          entry.createWriter(writer => {
            writer.onwrite = () => {
              this.setData({
                busy: false
              });
              uni.showToast({
                title: successText + '，已存到手机下载目录',
                icon: 'none'
              });
            };
            writer.onerror = () => {
              this.setData({
                busy: false
              });
              this.copyFallback(plainText, '文件保存失败，内容已复制');
            };
            let payload = content;
            try {
              if (typeof Blob !== 'undefined') payload = new Blob([content], {
                type: 'text/plain;charset=utf-8'
              });
            } catch (e) {
              payload = content;
            }
            writer.write(payload);
          }, () => {
            this.setData({
              busy: false
            });
            this.copyFallback(plainText, '文件保存失败，内容已复制');
          });
        }, () => {
          this.setData({
            busy: false
          });
          this.copyFallback(plainText, '文件保存失败，内容已复制');
        });
      }, () => {
        this.setData({
          busy: false
        });
        this.copyFallback(plainText, '文件保存失败，内容已复制');
      });
      // #endif

      // #ifdef H5
      try {
        const blob = new Blob([content], {
          type: 'text/plain;charset=utf-8'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        this.setData({
          busy: false
        });
        uni.showToast({
          title: successText,
          icon: 'none'
        });
      } catch (e) {
        this.setData({
          busy: false
        });
        this.copyFallback(plainText, '导出失败，内容已复制');
      }
      // #endif
    },

    generateBackup() {
      try {
        const data = store.exportBackup();
        this.backupText = JSON.stringify(data);
        const now = new Date();
        const label = dateUtil.todayStr(now) + ' ' + dateUtil.nowTime();
        store.saveMeta({
          lastBackupAt: Date.now()
        });
        this.setData({
          backupInfo: '已生成 ' + Math.round(this.backupText.length / 1024) + ' KB · ' + label
        });
        uni.setClipboardData({
          data: this.backupText,
          success: () => uni.showToast({
            title: '备份内容已复制',
            icon: 'success'
          })
        });
      } catch (e) {
        uni.showToast({
          title: '备份生成失败',
          icon: 'none'
        });
      }
    },
    saveBackupFile() {
      if (!this.backupText) this.generateBackup();
      if (!this.backupText) return;
      this.setData({
        busy: true
      });
      this.saveTextFile(this.backupText, '星记_备份_' + dateUtil.todayStr() + '.json', '备份文件已保存', this.backupText);
    },
    onRestoreInput(e) {
      this.setData({
        restoreText: e.detail.value
      });
    },
    restoreBackup() {
      const text = String(this.restoreText || '').trim();
      if (!text) {
        uni.showToast({
          title: '请先粘贴备份内容',
          icon: 'none'
        });
        return;
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (e) {
        uni.showToast({
          title: '备份内容格式有误',
          icon: 'none'
        });
        return;
      }
      uni.showModal({
        title: '确认恢复备份',
        content: '恢复会覆盖当前账户、分类、账单与设置，且不可撤销。',
        confirmText: '覆盖恢复',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          const result = store.importBackup(data);
          if (!result.ok) {
            uni.showModal({
              title: '恢复失败',
              content: result.reason === 'format' ? '这不是有效的「星记」备份内容。' : '写入失败，可能是存储空间不足。',
              showCancel: false,
              confirmColor: '#00B578'
            });
            return;
          }
          this.backupText = '';
          this.setData({
            restoreText: '',
            backupInfo: ''
          });
          this.refresh();
          uni.showToast({
            title: '已恢复 ' + result.count + ' 笔账单',
            icon: 'none'
          });
        }
      });
    },
    clearBills() {
      uni.showModal({
        title: '清空全部账单',
        content: '将删除所有账单并把账户余额重置为初始余额。分类、账户、预算设置会保留。',
        editable: true,
        placeholderText: '请输入「清空」确认',
        confirmText: '清空',
        confirmColor: '#FA5151',
        success: res => {
          if (!res.confirm) return;
          if (String(res.content || '').trim() !== '清空') {
            uni.showToast({
              title: '确认文字不正确',
              icon: 'none'
            });
            return;
          }
          store.clearBills();
          this.refresh();
          uni.showToast({
            title: '账单已清空',
            icon: 'none'
          });
        }
      });
    }
  }
};</script>

<style scoped>
.data-page {
  min-height: 100vh;
  padding: 24rpx 28rpx 60rpx;
  background: #F6F7F9;
}

.storage-card {
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 26rpx 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.storage-title {
  font-size: 27rpx;
  font-weight: 600;
  color: #1F2329;
}

.storage-val {
  font-size: 23rpx;
  color: #86909C;
  font-family: "DIN Alternate", sans-serif;
}

.storage-track {
  height: 10rpx;
  border-radius: 99rpx;
  background: #F2F3F5;
  margin-top: 16rpx;
  overflow: hidden;
}

.storage-fill {
  height: 100%;
  border-radius: 99rpx;
  background: #86909C;
}

.storage-fill.warn {
  background: #FA5151;
}

.storage-meta {
  font-size: 21rpx;
  color: #86909C;
  margin-top: 10rpx;
}

.storage-warn {
  margin-top: 12rpx;
  font-size: 21rpx;
  color: #FA5151;
  background: #FFF3E3;
  border-radius: 12rpx;
  padding: 12rpx 16rpx;
  line-height: 1.6;
}

.card {
  background: #FFFFFF;
  border-radius: 26rpx;
  padding: 0 24rpx 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(31,35,41, 0.04);
}

.card .form-row {
  padding-left: 4rpx;
  padding-right: 4rpx;
}

.card-desc {
  font-size: 22rpx;
  color: #86909C;
  line-height: 1.7;
  padding: 4rpx 4rpx 18rpx;
}

.export-btn {
  height: 82rpx;
  line-height: 82rpx;
}

.backup-row {
  display: flex;
}

.backup-file-btn {
  width: 210rpx;
  height: 82rpx;
  line-height: 82rpx;
  margin-left: 14rpx;
  flex-shrink: 0;
  font-size: 26rpx;
}

.backup-info {
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #00B578;
  background: #E4F8F0;
  border-radius: 10rpx;
  padding: 12rpx 16rpx;
}

.backup-divider {
  margin: 24rpx 4rpx 20rpx;
}

.restore-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #4E5969;
  padding: 0 4rpx 12rpx;
}

.restore-input {
  width: 100%;
  height: 180rpx;
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
  border-radius: 14rpx;
  padding: 16rpx 18rpx;
  font-size: 22rpx;
  line-height: 1.5;
}

.restore-btn {
  margin-top: 16rpx;
  height: 82rpx;
  line-height: 82rpx;
}

.danger-card {
  background: #FFF3E3;
  border: 1rpx solid #FDEBEB;
  border-radius: 24rpx;
  padding: 24rpx 26rpx;
}

.danger-title {
  font-size: 27rpx;
  font-weight: 600;
  color: #FA5151;
}

.danger-desc {
  font-size: 22rpx;
  color: #FA5151;
  line-height: 1.7;
  margin: 8rpx 0 20rpx;
}

.foot-tip {
  margin-top: 28rpx;
  padding: 0 8rpx;
}

.foot-tip-strong {
  display: block;
  font-size: 23rpx;
  font-weight: 600;
  color: #86909C;
}

.foot-tip-text {
  display: block;
  font-size: 21rpx;
  color: #86909C;
  line-height: 1.75;
  margin-top: 6rpx;
}
</style>
