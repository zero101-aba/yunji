import Vue from 'vue'
import App from './App'

Vue.config.productionTip = false

// 兼容原小程序页面中的 this.setData({...}) 写法，内部转换为 Vue 响应式赋值
Vue.mixin({
  methods: {
    setData(patch, callback) {
      if (patch && typeof patch === 'object') {
        Object.keys(patch).forEach((key) => {
          this[key] = patch[key]
        })
      }
      if (typeof callback === 'function') {
        this.$nextTick(() => {
          callback.call(this)
        })
      }
    }
  }
})

App.mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()
