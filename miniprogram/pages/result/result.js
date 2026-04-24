// pages/result/result.js
Page({
  data: {
    // 页面数据
    result: null
  },
  
  onLoad: function(options) {
    // 页面加载时执行
    console.log('Result page loaded', options);
    
    // 【新增】页面加载时开启分享菜单（确保右上角也能分享）
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
      success: () => console.log('分享菜单开启成功'),
      fail: (err) => console.error('分享菜单开启失败', err)
    });
    
    // 解析传入的识别结果（核心修复：增加解码容错，兼容分享带参）
    if (options.result) {
      try {
        // 修复：先解码，再解析JSON，兼容分享编码后的参数
        const decodeResult = decodeURIComponent(options.result);
        const result = JSON.parse(decodeResult);
        console.log('Recognition result:', result);
        
        // 验证结果数据是否完整
        const validatedResult = this.validateResultData(result);
        
        this.setData({
          result: validatedResult
        });
      } catch (error) {
        console.error('Failed to parse result:', error);
        wx.showToast({
          title: '解析结果失败',
          icon: 'none'
        });
        // 设置默认结果数据，避免页面空白
        this.setData({
          result: this.getEmptyResult()
        });
      }
    } else {
      console.error('No result data received');
      wx.showToast({
        title: '未接收到识别结果',
        icon: 'none'
      });
      // 设置默认结果数据，避免页面空白
      this.setData({
        result: this.getEmptyResult()
      });
    }
  },
  
  // 【修改点1】验证结果数据，新增用药建议字段验证
  validateResultData: function(result) {
    if (!result || typeof result !== 'object') {
      return this.getEmptyResult();
    }
    
    return {
      diseaseName: result.diseaseName || '未知病害',
      confidence: result.confidence || 0,
      symptoms: result.symptoms || '暂无症状描述',
      suggestions: result.suggestions || '暂无防治建议',
      medicines: result.medicines && Array.isArray(result.medicines) ? result.medicines : [],
      // 【新增】用药建议字段验证与默认值
      medicineSuggestion: result.medicineSuggestion || '暂无用药建议',
      prevention: result.prevention || '暂无预防措施'
    };
  },
  
  // 【修改点2】获取空结果数据，新增用药建议默认值
  getEmptyResult: function() {
    return {
      diseaseName: '未知病害',
      confidence: 0,
      symptoms: '暂无症状描述',
      suggestions: '暂无防治建议',
      medicines: [],
      // 【新增】用药建议默认值
      medicineSuggestion: '暂无用药建议',
      prevention: '暂无预防措施'
    };
  },
  
  onShow: function() {
    // 页面显示时执行
    console.log('Result page showed');
  },
  
  onReady: function() {
    // 页面初次渲染完成时执行
    console.log('Result page ready');
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },
  
  // 重新识别
  reidentify: function() {
    console.log('Reidentify button clicked');
    wx.switchTab({
      url: '../camera/camera',
      success: function(res) {
        console.log('Switch to camera tab success:', res);
      },
      fail: function(res) {
        console.error('Switch to camera tab failed:', res);
        wx.showToast({
          title: '导航失败，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 分享结果
  shareResult: function() {
    const that = this;
    wx.showActionSheet({
      itemList: ['分享给好友', '分享到朋友圈'],
      itemColor: '#4CAF50',
      success: function(res) {
        const tapIndex = res.tapIndex;
        if (tapIndex === 0) {
          // 用户选择“分享给好友”：按钮已配置open-type，直接唤起分享面板
          wx.showToast({
            title: '即将唤起好友分享面板',
            icon: 'none',
            duration: 1000
          });
        } else if (tapIndex === 1) {
          // 用户选择“分享到朋友圈”：提示用户通过右上角触发
          wx.showToast({
            title: '请点击右上角菜单「分享到朋友圈」',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: function(res) {
        console.log('用户取消分享', res);
      }
    });
  },
  
  // 打开购买链接
  openBuyLink: function(e) {
    const link = e.currentTarget.dataset.link;
    console.log('Opening buy link:', link);
    
    wx.showModal({
      title: '打开购买链接',
      content: '确定要打开此链接吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: link,
            success: (res) => {
              wx.showToast({
                title: '链接已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        }
      }
    });
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
  
  // ===================== 核心修复：分享给好友（带编码后的完整参数） =====================
  onShareAppMessage: function() {
    const diseaseName = this.data.result ? this.data.result.diseaseName : '葡萄病害';
    // 修复：编码结果参数，避免特殊字符/换行符导致解析失败
    const encodeResult = encodeURIComponent(JSON.stringify(this.data.result));
    return {
      title: `葡萄病害识别结果：${diseaseName}`,
      // 核心修复：路径携带编码后的结果参数，好友打开能正常拿到数据
      path: `/pages/result/result?result=${encodeResult}`,
      imageUrl: '../../images/share.png',
      success: function(res) {
        console.log('Share success:', res);
      },
      fail: function(res) {
        console.error('Share failed:', res);
      }
    };
  },
  
  // ===================== 核心修复：分享到朋友圈（增加参数编码） =====================
  onShareTimeline: function() {
    const diseaseName = this.data.result ? this.data.result.diseaseName : '葡萄病害';
    // 修复：编码结果参数，避免特殊字符/换行符导致解析失败
    const encodeResult = encodeURIComponent(JSON.stringify(this.data.result));
    return {
      title: `葡萄病害识别结果：${diseaseName}`,
      imageUrl: '../../images/share.png',
      // 修复：使用编码后的参数，避免解析失败
      query: `result=${encodeResult}`
    };
  }
})