const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { code: 401, message: '未获取到用户身份' };
  }

  try {
    const users = db.collection('users');
    const { data: existing } = await users.where({ openid: OPENID }).get();

    if (existing.length > 0) {
      return { code: 0, user: existing[0] };
    }

    // New user — create profile with defaults
    const newUser = {
      openid: OPENID,
      avatarUrl: '',
      nickName: '',
      phone: '',
      gender: 'female',
      createdAt: Date.now(),
    };

    const { _id } = await users.add({ data: newUser });
    return { code: 0, user: { ...newUser, _id } };
  } catch (err) {
    console.error('[login] Error:', err);
    return { code: 500, message: '登录失败' };
  }
};
