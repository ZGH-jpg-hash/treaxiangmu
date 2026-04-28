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
  
  // ===================== 【替换】淘宝自动搜索链接生成 =====================
 // ===================== 【替换】淘宝自动搜索链接生成（优化版） =====================
  // 根据药品名称自动生成淘宝搜索链接（权重优化版）
  getMedicineLink: function(medicineName) {
    const pureName = this.extractPureMedicineName(medicineName);
    // 🔴 关键修复：搜索词顺序调整为「农药 药品名 葡萄病害」，农药权重最高，彻底过滤水果
    const searchKeyword = `农药 ${pureName} 葡萄病害`;
    const taobaoSearchUrl = `https://s.taobao.com/search?q=${encodeURIComponent(searchKeyword)}&cat=50008263`;
    // 🔴 新增：强制指定淘宝农药类目ID（50008263），100%锁定农药分类
    return taobaoSearchUrl;
  },

  // 【重写】纯药品名称提取（零残留版）
  extractPureMedicineName: function(rawName) {
    if (!rawName || typeof rawName !== 'string') return '杀菌剂';
    
    let pureName = rawName.trim();
    console.log('🔍 原始用药文本:', pureName);

    // 🔴 第一阶段：先清除所有格式字符（优先级最高，解决序号残留问题）
    const formatFilters = [
      /[\u3000\s]+/g,                // 全角空格+半角空格，合并为单个空格
      /[，。；;：:、？?！!()（）【】""''\[\]{}《》]/g, // 所有中英文标点
      /[·•●◆★■▲▼]/g,                // 特殊符号
      /\s*[-—~]\s*/g,                // 连接符、破折号
    ];
    formatFilters.forEach(filter => {
      pureName = pureName.replace(filter, '');
    });

    // 🔴 第二阶段：清除所有数字和序号（包括中文数字）
    const numberFilters = [
      /\d+/g,                        // 所有阿拉伯数字
      /^[零一二三四五六七八九十百千万]+/g, // 开头中文数字
      /[第][零一二三四五六七八九十百千万]+[条项款点]/g, // 第X条/项
    ];
    numberFilters.forEach(filter => {
      pureName = pureName.replace(filter, '');
    });

    // 🔴 第三阶段：清除所有使用说明和干扰词（最全覆盖）
    const usageFilters = [
      /发病初期/g, /发病中期/g, /发病后期/g, /严重时/g, /预防时/g, /治疗时/g,
      /按/g, /稀释/g, /喷雾/g, /兑水/g, /倍液/g, /每亩/g, /每公顷/g, /每株/g,
      /用量/g, /用法/g, /使用/g, /喷洒/g, /喷施/g, /涂抹/g, /灌根/g, /浸果/g,
      /每隔/g, /天一次/g, /连续/g, /次/g, /毫升/g, /克/g, /公斤/g, /升/g, /倍/g,
      /混合/g, /复配/g, /交替使用/g, /轮换使用/g, /安全间隔期/g, /采摘前/g,
      /停药/g, /避免/g, /禁止/g, /注意/g, /建议/g, /可与/g, /不能与/g, /配合/g,
      /使用时/g, /施药/g, /药剂/g, /药液/g, /浓度/g, /剂量/g, /间隔/g, /周期/g,
      /次数/g, /每次/g, /每/g, /天/g, /周/g, /月/g, /小时/g, /分钟/g, /葡萄专用/g,
      /果树专用/g, /蔬菜专用/g, /大田专用/g, /广谱/g, /高效/g, /低毒/g, /无公害/g,
      /绿色/g, /有机/g, /残留/g, /环保/g, /新型/g, /特效/g, /优质/g, /正品/g,
      /厂家直销/g, /包邮/g, /批发/g, /零售/g, /葡萄/g // 🔴 强制过滤"葡萄"字样，彻底避免水果匹配
    ];
    // 按长度从长到短排序，避免短词先匹配导致长词残留
    usageFilters.sort((a, b) => b.toString().length - a.toString().length);
    usageFilters.forEach(filter => {
      pureName = pureName.replace(filter, '');
    });

    // 🔴 第四阶段：清除所有剂型词
    const formulationFilters = [
      /可湿性粉剂/g, /悬浮剂/g, /水剂/g, /乳油/g, /水分散粒剂/g, /颗粒剂/g,
      /粉剂/g, /烟剂/g, /微乳剂/g, /水乳剂/g, /乳油剂/g, /可溶性粉剂/g,
      /可溶性液剂/g, /干悬浮剂/g, /泡腾片/g, /片剂/g, /胶囊剂/g, /油剂/g,
      /气雾剂/g, /熏蒸剂/g, /饵剂/g, /母液/g, /母粉/g
    ];
    formulationFilters.forEach(filter => {
      pureName = pureName.replace(filter, '');
    });

    // 🔴 第五阶段：处理复配农药（取第一个有效成分）
    if (pureName.includes('+') || pureName.includes('加') || pureName.includes('和')) {
      const parts = pureName.split(/[+加和]/g).map(part => part.trim()).filter(part => part.length > 1);
      pureName = parts[0] || pureName;
    }

    // 🔴 第六阶段：最终清洗和白名单验证
    pureName = pureName
      .replace(/[a-zA-Z0-9]/g, '') // 去除所有英文字母和残留数字
      .replace(/\s+/g, ' ')
      .trim();

    // 🔴 农药白名单（只保留常见葡萄病害用药，彻底过滤无效内容）
    const pesticideWhitelist = [
      '戊唑醇', '多菌灵', '百菌清', '嘧菌酯', '代森锰锌', '甲基硫菌灵', '霜霉威',
      '苯醚甲环唑', '咪鲜胺', '烯酰吗啉', '腈菌唑', '丙环唑', '氟硅唑', '三唑酮',
      '异菌脲', '腐霉利', '啶酰菌胺', '咯菌腈', '春雷霉素', '中生菌素', '噻唑锌',
      '喹啉铜', '波尔多液', '石硫合剂', '氧化亚铜', '氢氧化铜', '代森锌', '福美双'
    ];

    // 白名单匹配：优先匹配最长的包含词
    let matchedName = '葡萄病害杀菌剂';
    for (const name of pesticideWhitelist) {
      if (pureName.includes(name) || name.includes(pureName)) {
        matchedName = name;
        break;
      }
    }

    console.log('✅ 提取后纯药品名:', matchedName);
    return matchedName;
  },

  // 【优化】打开淘宝搜索链接（增加类目提示）
  openBuyLink: function(e) {
    const medicineName = e.currentTarget.dataset.medicine;
    const pureName = this.extractPureMedicineName(medicineName);
    const link = this.getMedicineLink(medicineName);
    
    console.log('生成淘宝搜索链接:', link);
    wx.showModal({
      title: '跳转到淘宝购买',
      content: `将为您搜索「${pureName} 葡萄专用农药」，已自动锁定农药类目，链接已复制到剪贴板`,
      confirmText: '复制链接',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: link,
            success: () => {
              wx.showToast({
                title: '链接已复制，打开淘宝',
                icon: 'success',
                duration: 2000
              });
            }
          });
        }
      }
    });
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
  },

  // ===================== 【新增】知识库跳转方法 =====================
  goDiseaseKnowledge: function() {
    console.log('=== 开始执行知识库跳转 ===');
    
    // 1. 容错：检查getApp()是否存在
    const app = getApp();
    if (!app || !app.globalData) {
      console.error('❌ getApp()返回undefined或globalData不存在');
      wx.showToast({
        title: '系统初始化中，请重试',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    console.log('✅ getApp()和globalData正常');

    // 2. 容错：检查知识库数据是否存在
    const diseaseList = app.globalData.knowledgeBase;
    if (!diseaseList || !Array.isArray(diseaseList) || diseaseList.length === 0) {
      console.error('❌ 知识库数据不存在或为空:', diseaseList);
      wx.showToast({
        title: '知识库数据加载失败',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    console.log('✅ 知识库数据正常，共', diseaseList.length, '条');

    // 3. 获取当前病害名称
    const diseaseName = this.data.result?.diseaseName;
    if (!diseaseName) {
      console.error('❌ 未获取到病害名称');
      wx.showToast({
        title: '未获取到病害信息',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    console.log('✅ 当前识别病害:', diseaseName);

    // 4. 精确匹配当前识别的病害
    const targetDisease = diseaseList.find(item => item.name === diseaseName);
    console.log('✅ 匹配结果:', targetDisease ? '找到' : '未找到', targetDisease);
    
    // 5. 跳转逻辑
    if (targetDisease && targetDisease.id) {
      // 匹配成功：跳转到详情页
      const detailUrl = `/pages/knowledge/detail/detail?diseaseId=${targetDisease.id}`;
      console.log('🔗 准备跳转到详情页:', detailUrl);
      wx.navigateTo({
        url: detailUrl,
        success: () => console.log('✅ 详情页跳转成功'),
        fail: (err) => {
          console.error('❌ 详情页跳转失败:', err);
          // 详情页跳转失败时，兜底跳转到列表页
          console.log('🔄 兜底跳转到列表页');
          wx.navigateTo({
            url: '/pages/knowledge/knowledge',
            success: () => console.log('✅ 列表页跳转成功'),
            fail: (listErr) => {
              console.error('❌ 列表页也跳转失败:', listErr);
              wx.showModal({
                title: '页面跳转失败',
                content: '请检查：1. app.json中是否配置了知识库页面路由 2. 知识库页面文件是否存在',
                showCancel: false
              });
            }
          });
        }
      });
    } else {
      // 匹配失败：跳转到知识库列表页
      console.log('🔄 未匹配到病害，跳转到列表页');
      wx.navigateTo({
        url: '/pages/knowledge/knowledge',
        success: () => console.log('✅ 列表页跳转成功'),
        fail: (err) => {
          console.error('❌ 列表页跳转失败:', err);
          wx.showModal({
            title: '页面跳转失败',
            content: '请检查：1. app.json中是否配置了知识库页面路由 2. 知识库页面文件是否存在',
            showCancel: false
          });
        }
      });
    }
  }

})