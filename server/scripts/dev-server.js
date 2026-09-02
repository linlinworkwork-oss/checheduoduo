/**
 * 本地联调/预览启动器：mongodb-memory-server 常驻内存 MongoDB，
 * 再启动 API 服务（托管 ../web 静态产物，同源访问）。
 *
 * 首次启动数据库为空时会自动插入演示数据（用户 + 未来行程），
 * 方便直接在浏览器里体验完整流程。数据仅存内存，重启即清空。
 *
 * 用法：node scripts/dev-server.js   （Ctrl+C 退出）
 * 打开：http://localhost:3900
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');

const PORT = Number(process.env.PORT) || 3900;

/** N 小时后（绝对时间戳）→ { date:'YYYY-MM-DD', time:'HH:MM', ms }，字符串按北京时间(UTC+8) */
function beijingLater(hours) {
  const ts = Date.now() + hours * 3600 * 1000;
  const d = new Date(ts + 8 * 3600 * 1000); // 平移视角到 UTC+8
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    ms: ts,
  };
}

async function seedDemoData() {
  const userCount = await User.estimatedDocumentCount();
  if (userCount > 0) return;

  console.log('[dev] 首次启动，插入演示数据 ...');

  const demoUsers = [
    {
      _id: 'demo-user-1',
      openid: 'demo-user-1',
      nickName: '林晓',
      avatarUrl: '',
      phone: '13800000001',
      gender: 'female',
      studentId: '2021001',
      wechatId: 'linxiao_2021',
    },
    {
      _id: 'demo-user-2',
      openid: 'demo-user-2',
      nickName: '陈默',
      avatarUrl: '',
      phone: '13800000002',
      gender: 'male',
      studentId: '2021002',
      wechatId: 'chenmo_carpool',
    },
    {
      _id: 'demo-user-3',
      openid: 'demo-user-3',
      nickName: '周扬',
      avatarUrl: '',
      phone: '13800000003',
      gender: 'male',
      studentId: '2020003',
      wechatId: 'zhou_yang',
    },
  ];
  await User.insertMany(demoUsers);

  const mk = (u, from, to, max, opts = {}) => {
    const d1 = beijingLater(from);
    const d2 = beijingLater(to);
    return {
      creatorId: u._id,
      creator: {
        nickName: u.nickName,
        avatarUrl: u.avatarUrl,
        phone: u.phone,
        gender: u.gender,
        studentId: u.studentId,
        wechatId: u.wechatId,
      },
      departureDate: d1.date,
      departureTimeStart: d1.time,
      departureTimeEnd: d2.time,
      departureEndTime: d2.ms,
      departureLocation: { name: opts.from || '东门', address: '南大东门公交站', latitude: 32.06, longitude: 118.79 },
      arrivalLocation: { name: opts.to || '南京南站', address: '雨花台区玉兰路', latitude: 31.97, longitude: 118.8 },
      ticketTime: opts.ticket || '',
      maxPassengers: max,
      currentPassengers: 1,
      status: 'open',
      passengers: [
        {
          userId: u._id,
          nickName: u.nickName,
          avatarUrl: u.avatarUrl,
          phone: u.phone,
          gender: u.gender,
          luggageSize: opts.luggage || 'small',
          studentId: u.studentId,
          wechatId: u.wechatId,
          joinedAt: Date.now() - 3600 * 1000,
        },
      ],
      completedBy: [],
      note: opts.note || '',
      createdAt: Date.now() - (opts.ageHours || 1) * 3600 * 1000,
    };
  };

  const demo = [
    mk(demoUsers[0], 3, 3.5, 3, { from: '东门', to: '禄口机场', ticket: '15:30 航班', note: '三人拼车去机场，行李别太多～' }),
    mk(demoUsers[1], 5, 6, 4, { from: '仙林校区', to: '南京南站', luggage: 'medium', note: '清明回家，还有 3 个空位' }),
    mk(demoUsers[2], 8, 8.5, 2, { from: '鼓楼校区', to: '南京站', luggage: 'large', note: '周六出游，行李多可以放后备箱' }),
    mk(demoUsers[0], 26, 27, 4, { from: '东门', to: '南京南站', note: '周日返校拼车' }),
  ];
  await Trip.insertMany(demo);
  console.log(`[dev] 演示数据就绪：${demoUsers.length} 个用户，${demo.length} 条行程`);
}

async function main() {
  console.log('[dev] 启动内存 MongoDB ...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log(`[dev] MongoDB ready: ${uri}`);

  await seedDemoData();

  const app = createApp({
    corsOrigins: ['http://localhost:10086'],
    serveWeb: true,
  });
  app.listen(PORT, () => {
    console.log(`\n[dev] ✅ 请在浏览器打开:  http://localhost:${PORT}`);
    console.log('[dev] 网页(web/) 与 API(/api) 同源，无跨域问题');
    console.log('[dev] Ctrl+C 退出（内存数据将清空）\n');
  });

  process.on('SIGINT', async () => {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[dev] 启动失败:', err);
  process.exit(1);
});
