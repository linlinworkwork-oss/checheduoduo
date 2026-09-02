const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { ok, fail } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { resolveEndTimeMs } = require('../utils/time');

const router = express.Router();

const VALID_LUGGAGE = ['none', 'small', 'medium', 'large', 'xlarge'];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ---------------- POST /api/trips —— 对应 createTrip 云函数 ---------------- */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const {
      departureDate,
      departureTimeStart,
      departureTimeEnd,
      departureLocation,
      arrivalLocation,
      ticketTime,
      maxPassengers,
      luggageSize,
      note,
    } = req.body;

    if (
      !departureDate ||
      !departureTimeStart ||
      !departureTimeEnd ||
      !departureLocation ||
      !arrivalLocation ||
      !maxPassengers ||
      !luggageSize
    ) {
      return fail(res, 400, '请填写完整行程信息');
    }
    if (!VALID_LUGGAGE.includes(luggageSize)) {
      return fail(res, 400, '请选择行李大小');
    }

    const creator = await User.findOne({ openid: uid }).lean();
    if (!creator) return fail(res, 404, '用户不存在');

    const trip = await Trip.create({
      creatorId: uid,
      creator: {
        nickName: creator.nickName || '',
        avatarUrl: creator.avatarUrl || '',
        phone: creator.phone || '',
        gender: creator.gender || 'female',
        studentId: creator.studentId || '',
        wechatId: creator.wechatId || '',
      },
      departureDate,
      departureTimeStart,
      departureTimeEnd,
      // 前端算好的绝对时间戳；缺失时按北京时间兜底解析（见 utils/time.js）
      departureEndTime:
        Number(req.body.departureEndTime) ||
        resolveEndTimeMs({ departureDate, departureTimeEnd }) ||
        0,
      departureLocation,
      arrivalLocation,
      ticketTime: ticketTime || '',
      maxPassengers: Number(maxPassengers),
      currentPassengers: 1,
      status: 'open',
      passengers: [
        {
          userId: uid,
          nickName: creator.nickName || '',
          avatarUrl: creator.avatarUrl || '',
          phone: creator.phone || '',
          gender: creator.gender || 'female',
          luggageSize,
          studentId: creator.studentId || '',
          wechatId: creator.wechatId || '',
          joinedAt: Date.now(),
        },
      ],
      note: note || '',
      createdAt: Date.now(),
    });

    return ok(res, { trip: trip.toObject() });
  }),
);

/* ---------------- GET /api/trips —— 对应 listTrips 云函数 ---------------- */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const {
      departureDate,
      keyword,
      hideFull,
      page = 1,
      pageSize = 20,
    } = req.query;
    // Express 扩展解析下重复参数得到数组；单值时兜底转数组
    const departureNames = parseListParam(req.query.departureNames);
    const arrivalNames = parseListParam(req.query.arrivalNames);

    const andArr = [];
    if (hideFull === 'true' || hideFull === true) {
      andArr.push({ status: 'open' });
    } else {
      andArr.push({ status: { $in: ['open', 'full'] } });
    }
    if (departureDate) andArr.push({ departureDate });

    if (departureNames.length > 0) {
      andArr.push({
        $or: departureNames.map((name) => ({
          'departureLocation.name': new RegExp(`^${escapeRegex(name)}`, 'i'),
        })),
      });
    }
    if (arrivalNames.length > 0) {
      andArr.push({
        $or: arrivalNames.map((name) => ({
          'arrivalLocation.name': new RegExp(`^${escapeRegex(name)}`, 'i'),
        })),
      });
    }
    if (keyword) {
      const kwRegex = new RegExp(escapeRegex(keyword), 'i');
      andArr.push({
        $or: [{ 'departureLocation.name': kwRegex }, { 'arrivalLocation.name': kwRegex }],
      });
    }

    const query = Trip.find(andArr.length ? { $and: andArr } : {}).sort({ createdAt: -1 });

    // 与原云函数一致的「拉取稍多 + 内存过滤」策略：
    // completedBy 排除、时间过期判断都在内存里做（依赖数字时间戳或兜底解析）。
    const FETCH_CAP = 500; // 校园场景数据量小，安全上限即可
    const docs = await query.limit(FETCH_CAP).lean();

    const now = Date.now();
    const filtered = docs.filter((trip) => {
      if (uid && trip.completedBy && trip.completedBy.includes(uid)) return false;
      if (trip.completedBy && trip.creatorId && trip.completedBy.includes(trip.creatorId))
        return false;
      if (!trip.departureDate || !trip.departureTimeEnd) return true;
      const endTime = resolveEndTimeMs(trip);
      return !Number.isNaN(endTime) && endTime > now;
    });

    const start = (Number(page) - 1) * Number(pageSize);
    const trips = filtered.slice(start, start + Number(pageSize));
    const hasMore = start + trips.length < filtered.length;

    return ok(res, { trips, hasMore });
  }),
);

/* ---------------- GET /api/trips/:id —— 对应 getTrip 云函数 ---------------- */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) return fail(res, 400, '缺少行程ID');

    const trip = await Trip.findOne({ _id: id }).lean();
    if (!trip) return fail(res, 404, '行程不存在');
    return ok(res, { trip });
  }),
);

/* ---------------- POST /api/trips/:id/join —— 对应 joinTrip 云函数 ---------------- */
router.post(
  '/:id/join',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const { id } = req.params;
    const { luggageSize } = req.body;
    if (!id) return fail(res, 400, '缺少行程ID');
    if (!VALID_LUGGAGE.includes(luggageSize)) return fail(res, 400, '请选择行李大小');

    const trip = await Trip.findOne({ _id: id });
    if (!trip) return fail(res, 404, '行程不存在');

    if (trip.status !== 'open') return fail(res, 400, '该行程已满员或已取消');
    if (trip.creatorId === uid) return fail(res, 400, '不能加入自己创建的行程');
    if (trip.passengers.some((p) => p.userId === uid)) return fail(res, 400, '已加入该行程');
    if (trip.currentPassengers >= trip.maxPassengers) return fail(res, 400, '该行程已满员');

    const user = await User.findOne({ openid: uid }).lean();
    if (!user) return fail(res, 404, '用户不存在');

    const passenger = {
      userId: uid,
      nickName: user.nickName || '',
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || '',
      gender: user.gender || 'female',
      luggageSize,
      studentId: user.studentId || '',
      wechatId: user.wechatId || '',
      joinedAt: Date.now(),
    };

    trip.passengers.push(passenger);
    trip.currentPassengers += 1;
    if (trip.currentPassengers >= trip.maxPassengers) trip.status = 'full';
    await trip.save();

    return ok(res, { trip: trip.toObject() });
  }),
);

/* ---------------- POST /api/trips/:id/leave —— 对应 leaveTrip 云函数 ---------------- */
router.post(
  '/:id/leave',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const { id } = req.params;
    if (!id) return fail(res, 400, '缺少行程ID');

    const trip = await Trip.findOne({ _id: id });
    if (!trip) return fail(res, 404, '行程不存在');

    if (trip.creatorId === uid) return fail(res, 400, '创建者不能退出，请取消行程');

    const before = trip.passengers.length;
    trip.passengers = trip.passengers.filter((p) => p.userId !== uid);
    if (trip.passengers.length === before) return fail(res, 400, '你未加入该行程');

    trip.currentPassengers -= 1;
    trip.status = 'open';
    await trip.save();

    return ok(res, { trip: trip.toObject() });
  }),
);

/* ---------------- POST /api/trips/:id/cancel —— 对应 cancelTrip 云函数 ---------------- */
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const { id } = req.params;
    if (!id) return fail(res, 400, '缺少行程ID');

    const trip = await Trip.findOne({ _id: id });
    if (!trip) return fail(res, 404, '行程不存在');
    if (trip.creatorId !== uid) return fail(res, 403, '只能取消自己创建的行程');

    trip.status = 'cancelled';
    await trip.save();
    return ok(res, { message: '行程已取消' });
  }),
);

/* ---------------- POST /api/trips/:id/complete —— 对应 completeTrip 云函数 ---------------- */
router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const uid = req.uid;
    const { id } = req.params;
    if (!id) return fail(res, 400, '缺少行程ID');

    const trip = await Trip.findOne({ _id: id });
    if (!trip) return fail(res, 404, '行程不存在');

    const isCreator = trip.creatorId === uid;
    const isPassenger = trip.passengers.some((p) => p.userId === uid);
    if (!isCreator && !isPassenger) return fail(res, 403, '只有行程参与者才能标记完成');

    if ((trip.completedBy || []).includes(uid)) {
      return ok(res, { message: '已标记完成', completedBy: trip.completedBy });
    }

    trip.completedBy = [...(trip.completedBy || []), uid];
    await trip.save();
    return ok(res, { completedBy: trip.completedBy });
  }),
);

function parseListParam(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').filter(Boolean);
}

module.exports = router;
