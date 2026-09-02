const express = require('express');
const User = require('../models/User');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * GET /api/auth —— 对应 login 云函数
 * 用 x-uid 头查/建用户档案（网站端无微信 OPENID，匿名 uid 即身份）。
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    if (!uid) return fail(res, 401, '未获取到用户身份');

    let user = await User.findOne({ openid: uid }).lean();
    if (user) return ok(res, { user });

    // 新用户，创建默认档案（结构同云函数 login）
    const created = await User.create({
      openid: uid,
      avatarUrl: '',
      nickName: '',
      phone: '',
      gender: 'female',
      createdAt: Date.now(),
    });
    return ok(res, { user: created.toObject() });
  }),
);

module.exports = router;
