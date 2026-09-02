const express = require('express');
const Trip = require('../models/Trip');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { shouldAutoComplete } = require('../utils/time');

const router = express.Router();

/**
 * GET /api/my-trips —— 对应 getMyTrips 云函数
 * 返回 created / joined / completed 三组；
 * 出发窗口结束超 2 小时未标记完成的行程，自动进入 completed。
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    if (!uid) return fail(res, 401, '请先登录');

    const [createdRaw, joinedRaw, completedDocs] = await Promise.all([
      Trip.find({ creatorId: uid, status: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 })
        .lean(),
      Trip.find({
        'passengers.userId': uid,
        creatorId: { $ne: uid },
        status: { $ne: 'cancelled' },
      })
        .sort({ createdAt: -1 })
        .lean(),
      Trip.find({ completedBy: uid, status: { $ne: 'cancelled' } })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const created = [];
    const joined = [];
    const autoCompleted = [];

    for (const t of createdRaw) {
      if (shouldAutoComplete(t, uid)) {
        await Trip.updateOne({ _id: t._id }, { $addToSet: { completedBy: uid } });
        t.completedBy = [...(t.completedBy || []), uid];
        autoCompleted.push(t);
      } else {
        created.push(t);
      }
    }

    for (const t of joinedRaw) {
      if (shouldAutoComplete(t, uid)) {
        await Trip.updateOne({ _id: t._id }, { $addToSet: { completedBy: uid } });
        t.completedBy = [...(t.completedBy || []), uid];
        autoCompleted.push(t);
      } else {
        joined.push(t);
      }
    }

    // 去重合并 autoCompleted + 已标记 completed 的行程
    const seen = new Set();
    const completed = [...autoCompleted, ...completedDocs].filter((t) => {
      if (seen.has(String(t._id))) return false;
      seen.add(String(t._id));
      return true;
    });

    return ok(res, { created, joined, completed });
  }),
);

module.exports = router;
