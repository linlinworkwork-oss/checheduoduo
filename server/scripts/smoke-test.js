/**
 * 全流程冒烟测试：mongodb-memory-server 起内存 MongoDB，
 * 模拟前端调用链跑通 P0 后端所有端点。
 *
 * 运行：npm run smoke
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');

const BASE = 'http://127.0.0.1:3901';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

async function api(method, path, { uid, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(uid ? { 'x-uid': uid } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, data };
}

function beijingTimeAhead(hours) {
  // 构造 N 小时后的北京时间字符串
  const now = new Date(Date.now() + hours * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

function sampleTrip(overrides = {}) {
  const d = beijingTimeAhead(5);
  return {
    departureDate: d.date,
    departureTimeStart: d.time,
    departureTimeEnd: d.time,
    departureEndTime: Date.now() + 6 * 3600 * 1000,
    departureLocation: { name: '东门', address: '东门公交站', latitude: 1, longitude: 1 },
    arrivalLocation: { name: '高铁站', address: 'xx高铁站', latitude: 2, longitude: 2 },
    ticketTime: '10:30 高铁 G123',
    maxPassengers: 2,
    luggageSize: 'small',
    note: '顺风车拼座',
    ...overrides,
  };
}

async function main() {
  console.log('== 冒烟测试：启动内存 MongoDB ==');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  const app = createApp({ corsOrigins: [] });
  const server = app.listen(3901);
  console.log(`== 测试服务已启动 ${BASE} ==\n`);

  try {
    console.log('\n[1] 健康检查');
    const health = await api('GET', '/api/health');
    assert(health.status === 200 && health.data.code === 0, 'GET /api/health → ok');

    console.log('\n[2] 鉴权：无 x-uid 拒绝');
    const noUid = await api('GET', '/api/auth');
    assert(noUid.status === 401, 'GET /api/auth 无 uid → 401');

    console.log('\n[3] 登录（login）：两个匿名用户自动建档案');
    const u1 = await api('GET', '/api/auth', { uid: 'user-1' });
    const u2 = await api('GET', '/api/auth', { uid: 'user-2' });
    assert(u1.data.code === 0 && u1.data.user.openid === 'user-1', 'user-1 档案创建');
    assert(u2.data.code === 0 && u2.data.user.openid === 'user-2', 'user-2 档案创建');
    const reLogin = await api('GET', '/api/auth', { uid: 'user-1' });
    assert(
      reLogin.data.user._id === u1.data.user._id,
      '再次 login 返回同一档案（幂等）',
    );

    console.log('\n[4] 更新资料（updateProfile）');
    const upd = await api('PATCH', '/api/profile', {
      uid: 'user-1',
      body: { nickName: '小明', phone: '13800001111', gender: 'male', studentId: '2021001' },
    });
    assert(upd.data.code === 0 && upd.data.user.nickName === '小明', '资料更新成功');
    const badPhone = await api('PATCH', '/api/profile', {
      uid: 'user-1',
      body: { phone: '123' },
    });
    assert(badPhone.status === 400, '非法手机号 → 400');
    const badGender = await api('PATCH', '/api/profile', {
      uid: 'user-1',
      body: { gender: 'x' },
    });
    assert(badGender.status === 400, '非法性别 → 400');
    await api('PATCH', '/api/profile', {
      uid: 'user-2',
      body: { nickName: '小红', phone: '13800002222', gender: 'female' },
    });

    console.log('\n[5] 创建行程（createTrip）');
    const missing = await api('POST', '/api/trips', {
      uid: 'user-1',
      body: { departureDate: '2026-01-01' },
    });
    assert(missing.status === 400, '缺字段 → 400');
    const created = await api('POST', '/api/trips', {
      uid: 'user-1',
      body: sampleTrip(),
    });
    assert(created.data.code === 0 && created.data.trip.creatorId === 'user-1', '行程创建成功');
    const tripId = created.data.trip._id;
    assert(created.data.trip.currentPassengers === 1, '创建者计入 passengers=1');
    assert(created.data.trip.creator.nickName === '小明', 'creator 快照含最新资料');
    assert(created.data.trip.creator.studentId === '2021001', 'creator 快照含学号');

    console.log('\n[6] 广场列表（listTrips）含未过期行程');
    const list1 = await api('GET', '/api/trips?hideFull=true', { uid: 'user-2' });
    assert(
      list1.data.code === 0 && list1.data.trips.some((t) => t._id === tripId),
      'hideFull 列表包含新行程',
    );

    console.log('\n[7] 过期行程不出现在广场');
    const expired = await api('POST', '/api/trips', {
      uid: 'user-1',
      body: sampleTrip({ departureEndTime: Date.now() - 3600 * 1000 }),
    });
    const expId = expired.data.trip._id;
    const list2 = await api('GET', '/api/trips', { uid: 'user-2' });
    assert(!list2.data.trips.some((t) => t._id === expId), '已过期行程被过滤');

    console.log('\n[8] 地点/关键字过滤');
    const kw = await api('GET', `/api/trips?keyword=${encodeURIComponent('高铁站')}`, {
      uid: 'user-2',
    });
    assert(kw.data.trips.some((t) => t._id === tripId), 'keyword 命中 arrivalLocation.name');
    const noHit = await api('GET', `/api/trips?keyword=${encodeURIComponent('机场')}`, {
      uid: 'user-2',
    });
    assert(!noHit.data.trips.some((t) => t._id === tripId), '无关 keyword 不命中');

    console.log('\n[9] 查看详情（getTrip）');
    const detail = await api('GET', `/api/trips/${tripId}`, { uid: 'user-2' });
    assert(detail.data.code === 0 && detail.data.trip._id === tripId, '详情返回行程');
    const detail404 = await api('GET', '/api/trips/000000000000000000000000', { uid: 'user-2' });
    assert(detail404.status === 404, '不存在的 id → 404');

    console.log('\n[10] 加入行程（joinTrip）');
    const noLug = await api('POST', `/api/trips/${tripId}/join`, { uid: 'user-2', body: {} });
    assert(noLug.status === 400, '缺 luggageSize → 400');
    const joined = await api('POST', `/api/trips/${tripId}/join`, {
      uid: 'user-2',
      body: { luggageSize: 'medium' },
    });
    assert(joined.data.code === 0 && joined.data.trip.currentPassengers === 2, '加入成功 passengers=2');
    assert(joined.data.trip.passengers.some((p) => p.userId === 'user-2'), 'passengers 含 user-2');
    assert(joined.data.trip.status === 'full', '达到 maxPassengers=2 → full');
    const dupJoin = await api('POST', `/api/trips/${tripId}/join`, {
      uid: 'user-2',
      body: { luggageSize: 'medium' },
    });
    assert(dupJoin.status === 400, '重复加入 → 400');
    const selfJoin = await api('POST', `/api/trips/${tripId}/join`, {
      uid: 'user-1',
      body: { luggageSize: 'small' },
    });
    assert(selfJoin.status === 400, '发起人加入自己行程 → 400');
    const fullJoin = await api('POST', `/api/trips/${tripId}/join`, {
      uid: 'user-3',
      body: { luggageSize: 'large' },
    });
    assert(fullJoin.status === 400, '满员后加入 → 400');

    console.log('\n[11] 退出行程（leaveTrip）');
    // user-3 登录
    await api('GET', '/api/auth', { uid: 'user-3' });
    const notIn = await api('POST', `/api/trips/${tripId}/leave`, { uid: 'user-3' });
    assert(notIn.status === 400, '未加入退出 → 400');
    const left = await api('POST', `/api/trips/${tripId}/leave`, { uid: 'user-2' });
    assert(left.data.code === 0 && left.data.trip.currentPassengers === 1, '退出成功 passengers=1');
    assert(left.data.trip.status === 'open', '退出后状态恢复 open');
    const creatorLeave = await api('POST', `/api/trips/${tripId}/leave`, { uid: 'user-1' });
    assert(creatorLeave.status === 400, '发起人退出 → 400');

    console.log('\n[12] 标记完成（completeTrip）');
    const nonPart = await api('POST', `/api/trips/${tripId}/complete`, { uid: 'user-3' });
    assert(nonPart.status === 403, '非参与者标记完成 → 403');
    // user-1 完成（发起人）
    const comp1 = await api('POST', `/api/trips/${tripId}/complete`, { uid: 'user-1' });
    assert(comp1.data.completedBy.includes('user-1'), '发起人标记完成');
    const compDup = await api('POST', `/api/trips/${tripId}/complete`, { uid: 'user-1' });
    assert(compDup.data.completedBy.length === 1, '重复标记幂等');

    console.log('\n[13] 完成后的行程从广场消失');
    const listAfter = await api('GET', '/api/trips', { uid: 'user-2' });
    assert(!listAfter.data.trips.some((t) => t._id === tripId), '发起人已完成的行程被过滤');

    console.log('\n[14] 我的行程（getMyTrips）');
    const my1 = await api('GET', '/api/my-trips', { uid: 'user-1' });
    assert(my1.data.created.some((t) => t._id === tripId), 'user-1 created 含该行程');
    assert(my1.data.completed.some((t) => t._id === tripId), 'user-1 completed 含该行程（已标记）');
    const my2 = await api('GET', '/api/my-trips', { uid: 'user-2' });
    assert(!my2.data.joined.some((t) => t._id === tripId), 'user-2 退出后 joined 不含');

    console.log('\n[15] 自动完成：过期超 2 小时出现在 completed');
    const oldTrip = await api('POST', '/api/trips', {
      uid: 'user-1',
      body: sampleTrip({
        departureEndTime: Date.now() - 3 * 3600 * 1000, // 3 小时前已结束
        maxPassengers: 4,
      }),
    });
    const oldId = oldTrip.data.trip._id;
    const my1b = await api('GET', '/api/my-trips', { uid: 'user-1' });
    assert(!my1b.data.created.some((t) => t._id === oldId), '超时行程移出 created');
    assert(my1b.data.completed.some((t) => t._id === oldId), '超时行程自动进入 completed');

    console.log('\n[16] 取消行程（cancelTrip）');
    const toCancel = await api('POST', '/api/trips', {
      uid: 'user-2',
      body: sampleTrip(),
    });
    const cancelId = toCancel.data.trip._id;
    const notCreator = await api('POST', `/api/trips/${cancelId}/cancel`, { uid: 'user-1' });
    assert(notCreator.status === 403, '非发起人取消 → 403');
    const cancelled = await api('POST', `/api/trips/${cancelId}/cancel`, { uid: 'user-2' });
    assert(cancelled.data.code === 0, '发起人取消成功');
    const listAfterCancel = await api('GET', '/api/trips', { uid: 'user-1' });
    assert(!listAfterCancel.data.trips.some((t) => t._id === cancelId), '已取消行程不出现在广场');

    console.log('\n[17] 未知 API 404');
    const unknown = await api('GET', '/api/nope', { uid: 'user-1' });
    assert(unknown.status === 404, '未知接口 → 404');

    console.log(`\n== 结果: ${passed} passed, ${failed} failed ==`);
  } finally {
    server.close();
    await mongoose.disconnect();
    await mongod.stop();
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
