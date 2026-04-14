// pages/index/index.js
Page({
    data: {
      // 页面数据
      historyList: [] // 识别历史列表
    },
    
    onLoad: function(options) {
      // 页面加载时执行
      console.log('Index page loaded');
      // 加载历史记录
      this.loadHistory();
    },
    
    // 加载历史记录
    loadHistory: function() {
      const history = wx.getStorageSync('diseaseHistory') || [];
      this.setData({
        historyList: history
      });
      console.log('Loaded history:', history);
    },
    
    // 查看历史记录
    viewHistoryItem: function(e) {
      const index = e.currentTarget.dataset.index;
      const historyItem = this.data.historyList[index];
      console.log('Viewing history item:', historyItem);
      
      // 跳转到结果页面，传递历史记录数据
      wx.navigateTo({
        url: '../result/result?result=' + JSON.stringify({
          diseaseName: historyItem.diseaseName,
          confidence: historyItem.confidence,
          symptoms: '历史记录症状描述',
          suggestions: '历史记录防治建议',
          medicines: [
            {
              name: '历史记录农药',
              usage: '历史记录使用方法',
              link: 'https://example.com'
            }
          ],
          prevention: '历史记录预防措施'
        })
      });
    },
    
    onShow: function() {
      // 页面显示时执行
      console.log('Index page showed');
      // 重新加载历史记录，确保数据最新
      this.loadHistory();
    },
    
    onReady: function() {
      // 页面初次渲染完成时执行
      console.log('Index page ready');
    },
    
    onHide: function() {
      // 页面隐藏时执行
      console.log('Index page hidden');
    },
    
    onUnload: function() {
      // 页面卸载时执行
      console.log('Index page unloaded');
    },
    
    // 页面相关事件处理函数
    onPullDownRefresh: function() {
      // 下拉刷新
      console.log('Pull down refresh');
      wx.stopPullDownRefresh();
    },
    
    onReachBottom: function() {
      // 上拉触底
      console.log('Reach bottom');
    },
    
    onShareAppMessage: function() {
      // 分享
      return {
        title: '葡萄病害识别系统',
        path: '/pages/index/index',
        imageUrl: '../../images/share.png'
      };
    }
  })