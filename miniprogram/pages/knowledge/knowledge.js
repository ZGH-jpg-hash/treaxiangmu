// pages/knowledge/knowledge.js
Page({
  data: {
    diseaseList: [],
    searchKeyword: ''
  },

  onLoad: function(options) {
    console.log('知识库列表页加载');
    this.loadKnowledgeData();
  },

  // 加载知识库数据（从app.globalData获取）
  loadKnowledgeData: function() {
    try {
      const app = getApp();
      if (!app || !app.globalData || !app.globalData.knowledgeBase) {
        wx.showToast({
          title: '知识库数据加载失败',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      const knowledgeBase = app.globalData.knowledgeBase;
      this.setData({ 
        diseaseList: knowledgeBase,
        originalList: knowledgeBase // 保存原始数据用于搜索
      });
      console.log('✅ 知识库数据加载成功，共', knowledgeBase.length, '条');
    } catch (error) {
      console.error('❌ 加载知识库数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 搜索病害
  onSearchInput: function(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword });

    if (!keyword) {
      // 搜索词为空，恢复原始数据
      this.setData({ diseaseList: this.data.originalList });
      return;
    }

    // 模糊搜索：匹配病害名称、别名
    const filteredList = this.data.originalList.filter(disease => 
      disease.name.toLowerCase().includes(keyword) || 
      (disease.alias && disease.alias.toLowerCase().includes(keyword))
    );

    this.setData({ diseaseList: filteredList });
    console.log('🔍 搜索完成，找到', filteredList.length, '条结果');
  },

  // 跳转到病害详情页
  goDetail: function(e) {
    const diseaseId = e.currentTarget.dataset.id;
    const diseaseName = e.currentTarget.dataset.name;
    console.log('🔗 跳转到详情页:', diseaseName, 'ID:', diseaseId);
    
    wx.navigateTo({
      url: `/pages/knowledge/detail/detail?diseaseId=${diseaseId}`,
      fail: (err) => {
        console.error('❌ 跳转详情页失败:', err);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果没有上一页，跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  }
})