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
    
    // 查看历史记录（核心修复：增加 encodeURIComponent 编码）
    viewHistoryItem: function(e) {
      const index = e.currentTarget.dataset.index;
      const historyItem = this.data.historyList[index];
      console.log('Viewing history item:', historyItem);
      
      // 直接传递完整的历史识别结果，和AI识别返回的格式完全一致，增加编码
      wx.navigateTo({
        url: '../result/result?result=' + encodeURIComponent(JSON.stringify(historyItem))
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
      this.loadHistory();
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