//app.js
App({
  onLaunch: function () {
    // 小程序初始化
    console.log('小程序初始化');
  },
  globalData: {
    userInfo: null,
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    apiKey: '52f7d05c-b99f-4fd7-833b-b31e14250b91'
  }
})