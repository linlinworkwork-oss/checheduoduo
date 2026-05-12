const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '未登录' };

  const { code } = event;
  if (!code) return { code: 400, message: '缺少授权码' };

  try {
    const result = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    const phone = result?.phoneInfo?.phoneNumber;

    if (!phone) {
      return { code: 400, message: '获取手机号失败' };
    }

    // Save phone to user profile
    await db.collection('users').where({ openid: OPENID }).update({
      data: { phone },
    });

    return { code: 0, phone };
  } catch (err) {
    console.error('[getPhoneNumber] Error:', err);
    return { code: 500, message: '授权失败' };
  }
};
