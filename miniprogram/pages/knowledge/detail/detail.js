// pages/knowledge/detail/detail.js
Page({
  data: {
    disease: null,
    isLoading: true
  },

  onLoad: function(options) {
    console.log('病害详情页加载，参数:', options);
    const diseaseId = parseInt(options.diseaseId);
    
    if (!diseaseId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.loadDiseaseDetail(diseaseId);
  },

  // 加载病害详情
  loadDiseaseDetail: function(diseaseId) {
    try {
      const app = getApp();
      if (!app || !app.globalData || !app.globalData.knowledgeBase) {
        throw new Error('知识库数据不可用');
      }

      const diseaseList = app.globalData.knowledgeBase;
      const disease = diseaseList.find(item => item.id === diseaseId);
      
      if (!disease) {
        throw new Error('未找到该病害');
      }

      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: disease.name
      });

      this.setData({ 
        disease: disease,
        isLoading: false
      });
      console.log('✅ 病害详情加载成功:', disease.name);
    } catch (error) {
      console.error('❌ 加载病害详情失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 2000);
    }
  },

  // 复制文本
  copyText: function(e) {
    const text = e.currentTarget.dataset.text;
    if (!text) return;
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
})