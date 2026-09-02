const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  // Web 端（CloudBase SDK 匿名登录）拿不到微信 OPENID，用前端传入的 _uid 兜底
  const { OPENID: wxOpenid } = cloud.getWXContext();
  const OPENID = wxOpenid || event._uid;
  if (!OPENID) return { code: 401, message: '请先登录' };

  const { code } = event;
  if (!code) return { code: 400, message: '缺少 code' };

  try {
    // 通过 button open-type="getPhoneNumber" 拿到的动态令牌换取手机号
    const res = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    return { code: 0, phoneInfo: res.phoneInfo };
  } catch (err) {
    console.error('[getPhoneNumber] Error:', err);
    return { code: 500, message: '获取手机号失败' };
  }
};
