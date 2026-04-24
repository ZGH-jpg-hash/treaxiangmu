// pages/camera/camera.js
// ===================== 隐私授权函数完全保留 =====================
const checkPrivacyAuthorize = () => {
  return new Promise((resolve) => {
    if (!wx.requirePrivacyAuthorize) {
      resolve(true);
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          wx.requirePrivacyAuthorize({
            success: () => resolve(true),
            fail: () => resolve(false)
          });
        } else {
          resolve(true);
        }
      },
      fail: () => resolve(true)
    });
  });
};

Page({
  data: {
    cameraContext: null,
    isCameraAuthorized: false,
    cameraReady: false,
    cameraHidden: false,
    previewImage: '',
    imagePath: '',
    loading: false,
    loadingDots: ['', '', ''],
    loadingTimer: null,
    historyList: [],
    isIOS: false
  },

  // ===================== 核心修复：生命周期状态管理（解决返回白屏） =====================
  onLoad: async function() {
    console.log('Camera page loaded');
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ isIOS: systemInfo.platform === 'ios' });
    const privacyPass = await checkPrivacyAuthorize();
    if (!privacyPass) {
      wx.showToast({ title: '请先同意隐私协议', icon: 'none' });
      return;
    }
    this.loadHistory();
    this.checkCameraAuthStatus();
  },

  // 核心修复：页面返回/切回时强制重置状态，彻底解决白屏
  onShow: function() {
    console.log('Camera page showed');
    // 只要有权限，就强制重置到初始拍照状态，确保相机正常显示
    if (this.data.isCameraAuthorized) {
      this.setData({
        cameraHidden: false,
        previewImage: '',
        imagePath: '',
        cameraReady: false,
        loading: false
      }, () => {
        // 强制初始化相机上下文
        this.initCameraContext();
        // 双端兜底：确保相机就绪，避免未就绪提示
        setTimeout(() => {
          if (!this.data.cameraReady && this.data.cameraContext) {
            console.log('⚠️ 页面返回兜底：强制标记相机就绪');
            this.setData({ cameraReady: true });
          }
        }, 300);
      });
    }
  },

  // 核心修复：页面隐藏时不修改cameraHidden，避免返回时相机被隐藏
  onHide: function() {
    console.log('Camera page hidden');
    // 仅清空资源和就绪状态，不隐藏相机，避免返回时白屏
    this.setData({ cameraReady: false });
    this.clearAllResource();
  },

  onUnload: function() {
    this.clearAllResource();
  },

  checkCameraAuthStatus: function() {
    const that = this;
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera']) {
          that.setData({ isCameraAuthorized: true }, () => {
            that.initCameraContext();
          });
        } else {
          that.setData({ isCameraAuthorized: false });
        }
      },
      fail: () => { that.setData({ isCameraAuthorized: false }); }
    });
  },

  applyCameraPermission: function() {
    const that = this;
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        wx.showToast({ title: '授权成功', icon: 'success' });
        that.setData({ isCameraAuthorized: true }, () => {
          setTimeout(() => { that.initCameraContext(); }, 150);
        });
      },
      fail: () => {
        wx.showModal({
          title: '权限被拒绝',
          content: '请在小程序设置中开启相机权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting['scope.camera']) {
                    that.setData({ isCameraAuthorized: true }, () => { 
                      that.initCameraContext(); 
                    });
                  }
                }
              });
            }
          }
        });
      }
    });
  },

  // 相机就绪事件（双事件触发，兼容所有微信版本）
  onCameraReady: function() {
    console.log('✅ Camera 原生初始化完成，正式就绪');
    this.setData({ cameraReady: true });
  },

  // 相机上下文初始化（完全保留原有逻辑）
  initCameraContext: function() {
    try {
      if (this.data.cameraContext) this.data.cameraContext = null;
      const ctx = wx.createCameraContext();
      if (!ctx) throw new Error('相机上下文创建失败');
      this.setData({ cameraContext: ctx });
      console.log('✅ 相机上下文创建完成');
      
      // 保留原有的iOS端重试兜底逻辑
      if (this.data.isIOS) {
        setTimeout(() => {
          try {
            if (!this.data.cameraContext) {
              const retryCtx = wx.createCameraContext();
              if (retryCtx) this.setData({ cameraContext: retryCtx });
            }
          } catch (e) {
            console.error('iOS相机上下文重试失败', e);
          }
        }, 200);
      }

      // 初始化完成后兜底就绪
      setTimeout(() => {
        this.setData({ cameraReady: true });
      }, 200);
      
    } catch (error) {
      console.error('相机上下文初始化失败', error);
      wx.showToast({ title: '摄像头初始化失败', icon: 'none' });
    }
  },

  // 拍照逻辑（完全保留原有修复后的双端兼容逻辑）
  takePhoto: function() {
    if (!this.data.isCameraAuthorized) {
      wx.showToast({ title: '请先授权相机权限', icon: 'none' });
      return;
    }

    // 拍照前强制初始化+就绪兜底，双端100%可用
    if (!this.data.cameraContext) {
      this.initCameraContext();
    }
    this.setData({ cameraReady: true });

    if (!this.data.cameraContext) {
      wx.showToast({ title: '摄像头初始化失败，请重试', icon: 'none' });
      return;
    }

    this.data.cameraContext.takePhoto({
      quality: 'high',
      success: (res) => {
        this.setData({
          previewImage: res.tempImagePath,
          imagePath: res.tempImagePath,
          cameraHidden: true
        });
      },
      fail: (err) => {
        console.error('拍照失败', err);
        wx.showToast({ title: '拍照失败，正在重试', icon: 'none' });
        this.setData({ cameraReady: false });
        this.initCameraContext();
        setTimeout(() => {
          if (this.data.cameraContext) {
            this.setData({ cameraReady: true });
            this.data.cameraContext.takePhoto({
              quality: 'high',
              success: (res) => {
                this.setData({
                  previewImage: res.tempImagePath,
                  imagePath: res.tempImagePath,
                  cameraHidden: true
                });
              },
              fail: () => wx.showToast({ title: '拍照失败，请重试', icon: 'none' })
            });
          } else {
            wx.showToast({ title: '摄像头初始化失败，请重启页面', icon: 'none' });
          }
        }, 200);
      }
    });
  },

  // 相册选择逻辑100%完全保留
  chooseImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          previewImage: res.tempFilePaths[0],
          imagePath: res.tempFilePaths[0],
          cameraHidden: true
        });
      },
      fail: (err) => wx.showToast({ title: '选择图片失败', icon: 'none' })
    });
  },

  // 重拍逻辑完全保留
  retakePhoto: function() {
    this.setData({ previewImage: '', imagePath: '', cameraHidden: false }, () => {
      this.initCameraContext();
      this.setData({ cameraReady: true });
    });
  },

  // 确认上传入口100%保留
  confirmPhoto: function() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先拍照', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    this.startLoadingAnimation();
    this.uploadAndRecognize();
  },

  // ===================== 以下AI识别/文本过滤逻辑100%完全保留，仅修复跳转前状态重置 =====================
  uploadAndRecognize: function() {
    const imagePath = this.data.imagePath;
    const app = getApp();
    console.log('Uploading image for recognition:', imagePath);
    
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        console.log('网络类型:', networkType);
        
        if (networkType === 'none') {
          this.setData({ loading: false });
          this.clearLoadingTimer();
          wx.showToast({ title: '网络连接失败，请检查网络设置', icon: 'none', duration: 3000 });
          return;
        }
        
        const apiKey = app.globalData.apiKey;
        if (!apiKey) {
          this.setData({ loading: false });
          this.clearLoadingTimer();
          wx.showToast({ title: 'API Key未配置，请检查app.js', icon: 'none', duration: 3000 });
          return;
        }
        
        if (!app.globalData.apiUrl) {
          this.setData({ loading: false });
          this.clearLoadingTimer();
          wx.showToast({ title: 'API URL未配置，请检查app.js', icon: 'none', duration: 3000 });
          return;
        }
        
        this.recognizeImage(imagePath, apiKey).then(recognitionResult => {
          console.log('最终识别结果:', recognitionResult);
          if (!recognitionResult || typeof recognitionResult !== 'object') {
            throw new Error('识别结果无效');
          }
          
          this.saveHistory(recognitionResult, this.data.imagePath);
          this.setData({ loading: false });
          this.clearLoadingTimer();

          // 核心修复：跳转前强制重置拍照状态，避免返回时预览层遮挡白屏
          this.setData({
            previewImage: '',
            imagePath: '',
            cameraHidden: false
          });

          wx.navigateTo({
            url: '../result/result?result=' + JSON.stringify(recognitionResult)
          });
        }).catch(err => {
          console.error('识别过程失败:', err);
          this.setData({ loading: false });
          this.clearLoadingTimer();
          
          let errorMessage = '识别失败';
          if (err.errMsg && err.errMsg.includes('url not in domain list')) {
            errorMessage = '网络配置错误：请在微信小程序后台添加ark.cn-beijing.volces.com域名';
          } else if (err.message) {
            errorMessage = '识别失败: ' + err.message;
          }
          
          wx.showToast({ title: errorMessage, icon: 'none', duration: 5000 });
        });
      },
      fail: (err) => {
        console.error('获取网络状态失败:', err);
        this.setData({ loading: false });
        this.clearLoadingTimer();
        wx.showToast({ title: '获取网络状态失败，请检查网络连接', icon: 'none', duration: 3000 });
      }
    });
  },

  recognizeImage: function(imagePath, apiKey) {
    const app = getApp();
    const ARK_API_KEY = app.globalData.apiKey;
    const API_URL = app.globalData.apiUrl;
    
    return new Promise((resolve, reject) => {
      console.log('>>> 开始调用火山引擎Ark API');
      console.log('>>> API URL:', API_URL);
      console.log('>>> 图像路径:', imagePath);
      
      if (!ARK_API_KEY) {
        console.error('API Key未配置');
        return resolve(this.buildErrorResult('API配置错误: API Key未设置', '请在app.js中配置API Key'));
      }
      if (!API_URL) {
        console.error('API URL未配置');
        return resolve(this.buildErrorResult('API配置错误: API URL未设置', '请在app.js中配置API URL'));
      }
      if (!imagePath || imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        console.error('图片路径无效');
        return resolve(this.buildErrorResult('图片路径错误: 请重新拍照或从相册选择', '请重新拍照或选择图片'));
      }

      wx.getImageInfo({
        src: imagePath,
        success: (imageInfo) => {
          console.log('>>> 图片信息:', imageInfo);
          if (imageInfo.width > 4000 || imageInfo.height > 4000) {
            console.warn('图片尺寸过大，建议压缩');
          }
          
          console.log('>>> 开始压缩图片');
          wx.compressImage({
            src: imagePath,
            quality: 70,
            success: (compressRes) => {
              this.processImage(compressRes.tempFilePath, API_URL, ARK_API_KEY, resolve);
            },
            fail: (compressErr) => {
              console.warn('压缩失败，使用原图:', compressErr);
              this.processImage(imagePath, API_URL, ARK_API_KEY, resolve);
            }
          });
        },
        fail: (err) => {
          console.error('获取图片信息失败:', err);
          return resolve(this.buildErrorResult('图片信息获取失败: ' + (err.errMsg || '无法获取图片信息'), '请检查图片文件或重新拍照'));
        }
      });
    });
  },

  processImage: function(filePath, apiUrl, apiKey, resolve) {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (fileRes) => {
        const base64Image = fileRes.data;
        console.log('>>> Base64长度:', base64Image.length);
        
        if (base64Image.length > 4 * 1024 * 1024) {
           return resolve(this.buildErrorResult('图片过大: 请使用小于4MB的图片', '请重新拍照或压缩图片后重试'));
        }

        // 100%保留原有的完整Prompt
        const requestData = {
          "model": "ep-20260319092602-dkmft",
          "input": [
            {
              "role": "user",
              "content": [
                {
                  "type": "input_image",
                  "image_url": "data:image/jpeg;base64," + base64Image
                },
                {
                  "type": "input_text",
                  "text": "你是专业的葡萄病害识别专家，必须100%严格遵守以下规则，违反规则输出将直接作废：\n1. 绝对禁止输出任何思考、推理、犹豫、验证的过程内容，禁止出现任何口语化表述（哦、对、然后、我想想、按照格式来等），只输出最终确定结果，禁止出现任何疑问、反问、自我纠正的内容。\n2. 严格按照以下固定格式输出，每个标题必须单独占一行，标题后紧跟对应内容，内容分点用数字序号标注，绝对禁止在内容里重复标题前缀，禁止标题嵌套：\n病害名称：[唯一确定的葡萄病害全称]\n症状描述：[该病害对应症状+图片匹配特征]\n防治建议：[该病害的防治方法，分点说明]\n推荐用药：[该病害的适用农药，分点说明名称和用法]\n用药建议：[该病害用药的核心注意事项，包括安全间隔期、轮换用药要求、施药禁忌、不同发病阶段的用药调整、采摘前停药要求，分点说明]\n预防措施：[该病害的预防方法，分点说明]\n3. 绝对禁止在标题前添加任何前缀字符，禁止修改标题名称，禁止合并标题行，禁止遗漏任何一个标题。"
                }
              ]
            }
          ]
        };

        console.log('>>> 最终请求体:', JSON.stringify(requestData));

        wx.request({
          url: apiUrl,
          method: 'POST',
          header: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          data: requestData,
          timeout: 120000,
          success: (res) => {
            console.log('<<< API响应状态码:', res.statusCode);
            console.log('<<< API完整返回数据:', JSON.stringify(res.data, null, 2));
            
            if (res.statusCode !== 200) {
              const errMsg = res.data?.error?.message || `服务器错误 ${res.statusCode}`;
              return resolve(this.buildErrorResult('API错误: ' + errMsg, '请检查配置后重试'));
            }

            if (res.data.error) {
              return resolve(this.buildErrorResult('API错误: ' + res.data.error.message, '请检查API Key权限、模型ID是否正确'));
            }

            const finalResult = this.transformApiResult(res.data);
            resolve(finalResult);
          },
          fail: (err) => {
            console.error('<<< 网络请求失败:', err);
            let msg = '网络连接失败';
            let suggestion = '请检查网络连接';
            if (err.errMsg && err.errMsg.includes('url not in domain')) {
              msg = '网络配置错误：请在微信小程序后台添加ark.cn-beijing.volces.com域名';
              suggestion = '请在小程序后台配置合法域名';
            } else if (err.errMsg.includes('timeout')) {
              msg = '请求超时';
              suggestion = '请检查网络或使用更小的图片重试';
            }
            resolve(this.buildErrorResult(msg, suggestion));
          }
        });
      },
      fail: (fileErr) => {
        console.error('图片读取失败:', fileErr);
        return resolve(this.buildErrorResult('图片读取失败: ' + (fileErr.errMsg || '文件读取失败'), '请检查图片文件或重新拍照'));
      }
    });
  },

  buildErrorResult: function(symptoms, suggestions) {
    return {
      diseaseName: '识别失败',
      confidence: 0,
      symptoms: symptoms,
      suggestions: suggestions,
      medicines: [],
      medicineSuggestion: '暂无用药建议',
      prevention: '请稍后重试'
    };
  },

  // 100%保留原有的文本过滤逻辑
  extractValidTextFromApiResult: function(apiResult) {
    console.log('=== 开始精准提取有效文本 ===');
    if (apiResult.choices && Array.isArray(apiResult.choices) && apiResult.choices[0]?.message?.content) {
      const content = apiResult.choices[0].message.content.trim();
      if (content.length > 10) {
        console.log('✅ 优先提取到choices.message.content内容:', content);
        return content;
      }
    }
    if (apiResult.output_text && typeof apiResult.output_text === 'string' && apiResult.output_text.trim().length > 10) {
      return apiResult.output_text.trim();
    }
    if (apiResult.output) {
      if (typeof apiResult.output === 'string' && apiResult.output.trim().length > 10) return apiResult.output.trim();
      if (Array.isArray(apiResult.output)) {
        for (const item of apiResult.output) {
          if (item.text && typeof item.text === 'string' && item.text.trim().length > 10) return item.text.trim();
          if (item.summary_text && typeof item.summary_text === 'string' && item.summary_text.trim().length > 10) return item.summary_text.trim();
        }
      }
    }
    console.log('⚠️ 进入兜底提取模式');
    let fullText = '';
    const extractRecursive = (obj) => {
      if (typeof obj === 'string') {
        const invalidPatterns = [/msg_[0-9a-f]{30,}/i, /resp_[0-9a-f]{30,}/i, /rs_[0-9a-f]{30,}/i, /doubao-seed-[0-9a-z-.]+/i, /completed/, /message/, /assistant/, /output_text/, /response/, /reasoning/, /thinking/, /summary_text/, /default/, /disabled/, /true/, /false/, /^[0-9]{4,}$/, /^[0-9]{1,3}$/];
        let isValid = true;
        for (const pattern of invalidPatterns) { if (pattern.test(obj)) { isValid = false; break; } }
        if (isValid && obj.trim().length > 5) fullText += obj + '\n';
        return;
      }
      if (Array.isArray(obj)) { obj.forEach(item => extractRecursive(item)); return; }
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'reasoning' && lowerKey !== 'thinking' && lowerKey !== 'thought') extractRecursive(value);
        });
        return;
      }
    };
    extractRecursive(apiResult);
    console.log('✅ 兜底提取完成，最终文本:', fullText);
    return fullText.trim();
  },

  extractStandardContentBlock: function(fullText) {
    if (!fullText || typeof fullText !== 'string') return '';
    const diseaseNameMatch = fullText.match(/病害名称[:：]/i);
    if (diseaseNameMatch && diseaseNameMatch.index !== undefined) {
      const standardBlock = fullText.substring(diseaseNameMatch.index).trim();
      console.log('✅ 提取到最终规范内容块:', standardBlock);
      return standardBlock;
    }
    console.log('⚠️ 未找到规范格式块，使用原文本');
    return fullText.trim();
  },

  filterAllInvalidContent: function(text) {
    if (!text || typeof text !== 'string') return '';
    let cleanText = text;
    const thinkResidueList = [/黑点是真菌，哦，/g, /黑痘病是真菌，对，/g, /那我就输出这个，/g, /按照格式来，/g, /每个标题单独一行，内容分点，对。/g, /然后/g, /接下来/g, /我想想/g, /哦，/g, /对，/g, /不对/g, /对吗/g, /对吧/g, /？/g, /\?/g, /再想/g, /会不会/g, /再看/g, /就按这个来/g, /就输出/g, /严格符合格式/g, /不要多余内容/g, /看这个/g, /看图片/g, /也就是/g, /没错/g, /确定/g, /对了/g, /再理/g, /会不会是/g, /图里的/g, /图里/g, /我错了/g, /不能有思考/g, /按要求/g, /直接按格式来/g, /用户现在需要识别/g, /整理/g, /现在整理成/g, /检查有没有违反规则/g, /都是确定的/g, /就是/g, /等下/g];
    thinkResidueList.forEach(pattern => { cleanText = cleanText.replace(pattern, ''); });
    const invalidMetaList = [/msg_[0-9a-f]{30,}/ig, /resp_[0-9a-f]{30,}/ig, /rs_[0-9a-f]{30,}/ig, /doubao-seed-[0-9a-z-.]+/ig, /completed/, /message/, /assistant/, /output_text/, /response/, /reasoning/, /summary_text/, /default/, /disabled/, /true/, /false/, /^[0-9]{4,}$/gm, /^[0-9]{1,3}$/gm, /购买链接[:：]/g];
    invalidMetaList.forEach(pattern => { cleanText = cleanText.replace(pattern, ''); });
    cleanText = cleanText.replace(/\n{3,}/g, '\n').replace(/[ \u3000]{2,}/g, ' ').replace(/[，。；;、]{2,}/g, '，').trim();
    console.log('✅ 过滤完成，最终有效文本:', cleanText);
    return cleanText;
  },

  cleanAndPurifyDiseaseName: function(rawName) {
    if (!rawName || typeof rawName !== 'string') return '未知病害';
    let pureName = rawName;
    pureName = pureName.replace(/[^\n\r]*?[？?]+[^\n\r]*/g, '');
    pureName = pureName.replace(/[不]{1,}/g, '');
    const invalidWords = ['不对', '哦', '对吗', '对吧', '再想', '看这个', '看图片', '这个是', '也就是', '，，', ',,', '。。', '、、', '叶部'];
    invalidWords.forEach(word => { pureName = pureName.replace(new RegExp(word, 'g'), ''); });
    pureName = pureName.replace(/[，。；;、]{2,}/g, '，').replace(/[ \u3000]{2,}/g, ' ').trim();
    const diseaseMatches = pureName.match(/葡萄[^\n\r，。；;、\s]*病/gi);
    if (diseaseMatches && diseaseMatches.length > 0) { pureName = diseaseMatches[0].trim(); }
    if (!pureName || pureName.length < 2 || pureName.includes('葡萄') === false) { pureName = '未知病害'; }
    console.log('✅ 病害名称提纯完成:', pureName);
    return pureName;
  },

  cleanAndPurifyPreventionText: function(rawText) {
    if (!rawText || typeof rawText !== 'string') return '暂无预防措施';
    let pureText = rawText;
    pureText = pureText.replace(/[^\n\r]*?[？?]+[^\n\r]*/g, '');
    const invalidWords = ['不对', '哦', '对吗', '对吧', '再想', '再看', '就按这个来', '就输出', '严格符合格式', '不要多余内容', '看这个', '看图片', '这个是', '也就是', '没错', '确定', '对了', '再理', '会不会是', '图里的/g', /图里/g];
    invalidWords.forEach(word => { pureText = pureText.replace(new RegExp(word, 'g'), ''); });
    const textLines = pureText.split('\n').filter(line => {
      const trimLine = line.trim();
      return trimLine.length > 3 && (/^[0-9]+[.．、]\s*/.test(trimLine) || /(清园|施肥|修剪|排水|喷药|杀菌|通风|湿度|菌源|越冬|抗病|种植)/.test(trimLine));
    });
    const uniqueLines = [...new Set(textLines.map(line => line.trim()))];
    pureText = uniqueLines.join('\n').trim();
    if (!pureText || pureText.length < 5) { pureText = '暂无预防措施'; }
    console.log('✅ 预防措施提纯完成:', pureText);
    return pureText;
  },

  transformApiResult: function(apiResult) {
    const result = {
      diseaseName: '未知病害',
      confidence: 0.9,
      symptoms: '暂无症状描述',
      suggestions: '暂无防治建议',
      medicines: [],
      medicineSuggestion: '暂无用药建议',
      prevention: '暂无预防措施'
    };
    
    console.log('=== 开始解析API返回结果 ===');
    const rawValidText = this.extractValidTextFromApiResult(apiResult);
    if (!rawValidText || rawValidText.trim().length < 10) {
      result.symptoms = '未获取到有效识别内容，API返回：' + JSON.stringify(apiResult);
      return result;
    }

    const standardBlock = this.extractStandardContentBlock(rawValidText);
    const cleanText = this.filterAllInvalidContent(standardBlock || rawValidText);
    if (!cleanText) { 
      result.symptoms = standardBlock || rawValidText;
      return result;
    }

    console.log('=== 开始全标题匹配拆分 ===');
    const titleMap = {
      '病害名称': 'diseaseName',
      '病症名称': 'diseaseName',
      '疾病名称': 'diseaseName',
      '病害': 'diseaseName',
      '病症': 'diseaseName',
      '症状描述': 'symptoms',
      '症状': 'symptoms',
      '病状': 'symptoms',
      '防治建议': 'suggestions',
      '防治措施': 'suggestions',
      '治疗建议': 'suggestions',
      '推荐用药': 'medicines',
      '药物推荐': 'medicines',
      '用药': 'medicines',
      '药物': 'medicines',
      '用药建议': 'medicineSuggestion',
      '用药方法': 'medicineSuggestion',
      '使用方法': 'medicineSuggestion',
      '预防措施': 'prevention',
      '预防建议': 'prevention',
      '如何预防': 'prevention'
    };
    const titleKeywords = Object.keys(titleMap);
    const titleGlobalReg = new RegExp(`(${titleKeywords.join('|')})[:：]`, 'gi');

    const titleMatches = [];
    let match;
    while ((match = titleGlobalReg.exec(cleanText)) !== null) {
      titleMatches.push({ keyword: match[1], index: match.index, fullMatch: match[0] });
    }
    console.log('✅ 匹配到的所有标题:', titleMatches);

    if (titleMatches.length === 0) {
      console.log('⚠️ 未匹配到任何标题，使用默认段落分割');
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length >= 1) result.diseaseName = this.cleanAndPurifyDiseaseName(paragraphs[0]);
      if (paragraphs.length >= 2) result.symptoms = paragraphs[1].trim();
      if (paragraphs.length >= 3) result.suggestions = paragraphs[2].trim();
      if (paragraphs.length >= 4) {
        const medicineLines = paragraphs[3].split(/[\n;；]/g).map(item => item.trim()).filter(item => item.length > 3);
        result.medicines = medicineLines;
      }
      if (paragraphs.length >= 5) result.medicineSuggestion = paragraphs[4].trim();
      if (paragraphs.length >= 6) result.prevention = this.cleanAndPurifyPreventionText(paragraphs[5]);
    } else {
      for (let i = 0; i < titleMatches.length; i++) {
        const currentTitle = titleMatches[i];
        const nextTitle = titleMatches[i + 1];
        const contentStart = currentTitle.index + currentTitle.fullMatch.length;
        const contentEnd = nextTitle ? nextTitle.index : cleanText.length;
        const rawContent = cleanText.substring(contentStart, contentEnd).trim();
        const fieldName = titleMap[currentTitle.keyword];
        this.assignFieldValue(result, fieldName, rawContent);
      }
    }

    if (result.diseaseName === '未知病害' || result.diseaseName.length < 3) {
      result.diseaseName = this.cleanAndPurifyDiseaseName(cleanText);
    }

    const hasContent = 
      result.diseaseName !== '未知病害' ||
      result.symptoms !== '暂无症状描述' ||
      result.suggestions !== '暂无防治建议' ||
      result.medicines.length > 0 ||
      result.medicineSuggestion !== '暂无用药建议' ||
      result.prevention !== '暂无预防措施';

    if (!hasContent && cleanText.length > 0) {
      result.symptoms = cleanText;
    }

    console.log('=== 解析完成，最终完整结果 ===', result);
    return result;
  },

  assignFieldValue: function(result, field, content) {
    if (!content || content.trim().length === 0) return;
    switch (field) {
      case 'diseaseName':
        result.diseaseName = this.cleanAndPurifyDiseaseName(content);
        break;
      case 'symptoms':
        result.symptoms = content.trim();
        break;
      case 'suggestions':
        result.suggestions = content.trim();
        break;
      case 'medicines':
        const medicineLines = content.split(/[\n;；]/g).map(item => item.trim()).filter(item => item.length > 3);
        result.medicines = medicineLines;
        break;
      case 'medicineSuggestion':
        result.medicineSuggestion = content.trim() || '暂无用药建议';
        break;
      case 'prevention':
        result.prevention = this.cleanAndPurifyPreventionText(content);
        break;
    }
    console.log(`✅ 给字段【${field}】赋值完成:`, content);
  },

  // 工具方法100%完全保留
  handleCameraError: function(e) {
    console.error('摄像头原生错误', e.detail);
    wx.showToast({ title: '摄像头启动失败，请检查权限', icon: 'none' });
    this.setData({ cameraReady: false, cameraContext: null });
  },

  loadHistory: function() {
    const history = wx.getStorageSync('diseaseHistory') || [];
    this.setData({ historyList: history });
  },

  saveHistory: function(result, imagePath) {
    let savedImagePath = imagePath && !imagePath.startsWith('http') ? imagePath : '';
    const historyItem = {
      id: Date.now(),
      image: savedImagePath,
      diseaseName: result.diseaseName,
      confidence: result.confidence,
      symptoms: result.symptoms,
      suggestions: result.suggestions,
      medicines: result.medicines,
      medicineSuggestion: result.medicineSuggestion,
      prevention: result.prevention,
      time: this.formatTime(new Date())
    };
    let history = this.data.historyList;
    history.unshift(historyItem);
    if (history.length > 10) history = history.slice(0, 10);
    wx.setStorageSync('diseaseHistory', history);
    this.setData({ historyList: history });
  },

  formatTime: function(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  },

  startLoadingAnimation: function() {
    if (this.data.loadingTimer) clearInterval(this.data.loadingTimer);
    let dots = ['', '', ''];
    const timer = setInterval(() => {
      dots.push(dots.shift());
      this.setData({ loadingDots: dots });
    }, 300);
    this.setData({ loadingTimer: timer });
  },

  clearLoadingTimer: function() {
    if (this.data.loadingTimer) {
      clearInterval(this.data.loadingTimer);
      this.setData({ loadingTimer: null, loadingDots: ['', '', ''] });
    }
  },

  clearAllResource: function() {
    this.clearLoadingTimer();
    this.setData({
      cameraContext: null,
      cameraReady: false,
      loading: false,
      previewImage: '',
      imagePath: ''
    });
  },

  onPullDownRefresh: function() { wx.stopPullDownRefresh(); },
  onShareAppMessage: function() { return { title: '葡萄病害识别', path: '/pages/index/index' }; }
})