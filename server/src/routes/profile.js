const express = require('express');
const User = require('../models/User');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const ALLOWED_FIELDS = ['nickName', 'avatarUrl', 'phone', 'gender', 'studentId', 'wechatId'];

/**
 * PATCH /api/profile —— 对应 updateProfile 云函数
 * 白名单字段更新，校验手机号/性别，返回更新后的用户。
 */
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (Object.keys(updateData).length === 0) {
      return fail(res, 400, '没有需要更新的字段');
    }
    if (updateData.phone && !/^1\d{10}$/.test(String(updateData.phone))) {
      return fail(res, 400, '请输入正确的手机号');
    }
    if (updateData.gender && !['male', 'female'].includes(updateData.gender)) {
      return fail(res, 400, '无效的性别');
    }

    const updated = await User.findOneAndUpdate(
      { openid: uid },
      { $set: updateData },
      { new: true },
    ).lean();
    if (!updated) return fail(res, 404, '用户不存在');
    return ok(res, { user: updated });
  }),
);

module.exports = router;
