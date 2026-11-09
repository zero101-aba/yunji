const store = require('./utils/store')

App({
  onLaunch() {
    try {
      store.init()
    } catch (e) {
      console.error('初始化失败', e)
    }
    let settings = {}
    try {
      settings = store.getSettings()
    } catch (e) {
      settings = {}
    }
    this.globalData.defaultPage = settings.defaultPage || 'record'
    this.globalData.justLaunched = true
  },

  onError(err) {
    console.error('小程序运行错误', err)
  },

  globalData: {
    defaultPage: 'record',
    justLaunched: false
  }
})
