const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  // Web 端（CloudBase SDK 匿名登录）拿不到微信 OPENID，用前端传入的 _uid 兜底
  const { OPENID: wxOpenid } = cloud.getWXContext();
  const OPENID = wxOpenid || event._uid;
  if (!OPENID) return { code: 401, message: '请先登录' };

  const allowedFields = ['nickName', 'avatarUrl', 'phone', 'gender', 'studentId', 'wechatId'];
  const updateData = {};

  allowedFields.forEach((field) => {
    if (event[field] !== undefined) {
      updateData[field] = event[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    return { code: 400, message: '没有需要更新的字段' };
  }

  // Validate phone (simple Chinese mobile check)
  if (updateData.phone && !/^1\d{10}$/.test(updateData.phone)) {
    return { code: 400, message: '请输入正确的手机号' };
  }

  // Validate gender
  if (updateData.gender && !['male', 'female'].includes(updateData.gender)) {
    return { code: 400, message: '无效的性别' };
  }

  try {
    const users = db.collection('users');
    await users.where({ openid: OPENID }).update({
      data: updateData,
    });

    // Return updated user
    const { data: updated } = await users.where({ openid: OPENID }).get();
    return { code: 0, user: updated[0] };
  } catch (err) {
    console.error('[updateProfile] Error:', err);
    return { code: 500, message: '更新资料失败' };
  }
};
