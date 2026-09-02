/**
 * 数据迁移：把云开发（微信云函数数据库）导出的 JSON 导入本地/自建 MongoDB。
 *
 * 前置：在微信开发者工具 -> 云开发控制台 -> 数据库，
 *       分别导出 users、trips 两个集合为 JSON 文件，放到本目录下：
 *       server/data/users.json
 *       server/data/trips.json
 *
 * 说明：
 * - 云开发导出的每个文档含 _id（字符串）。迁移时保留原 _id 字符串作为
 *   Mongo 文档 _id（Mongo 允许任意类型的 _id；字符串可被 $in/等值查询，
 *   与现有 API 的字符串 id 语义一致）。
 * - 老 trips 可能缺 departureEndTime（时区修复前的历史数据），按
 *   北京时间显式解析 departureDate + departureTimeEnd 补算绝对时间戳。
 * - users.openid 字段：小程序用户是微信 OPENID，网站匿名用户是 uid，
 *   统一存 openid 字段，迁移原样保留。
 *
 * 用法：npm run migrate   （默认读 server/data/*.json）
 * 环境变量 MIGRATE_USERS/MIGRATE_TRIPS 可指定文件路径。
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connect } = require('../src/db');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const { resolveEndTimeMs } = require('../src/utils/time');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pinche';

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`[migrate] 解析失败 ${file}:`, e.message);
    return null;
  }
  // 云开发导出可能是数组，或 { data: [...] }
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  console.error(`[migrate] 无法识别的格式: ${file}（期望数组或 {data:[...]}）`);
  return null;
}

async function migrateUsers(docs) {
  if (!docs || docs.length === 0) {
    console.log('[migrate] users: 无数据，跳过');
    return 0;
  }
  let inserted = 0;
  for (const doc of docs) {
    const existed = await User.exists({ openid: doc.openid || doc._id });
    if (existed) continue;
    await User.create({
      openid: doc.openid || doc._id,
      avatarUrl: doc.avatarUrl || '',
      nickName: doc.nickName || '',
      phone: doc.phone || '',
      gender: doc.gender || 'female',
      studentId: doc.studentId || '',
      wechatId: doc.wechatId || '',
      createdAt: Number(doc.createdAt) || Date.now(),
    });
    inserted += 1;
  }
  console.log(`[migrate] users: 导入 ${inserted} 条，跳过重复 ${docs.length - inserted} 条`);
  return inserted;
}

async function migrateTrips(docs) {
  if (!docs || docs.length === 0) {
    console.log('[migrate] trips: 无数据，跳过');
    return 0;
  }
  let inserted = 0;
  let backfilled = 0;
  for (const doc of docs) {
    const id = String(doc._id);
    const existed = await Trip.exists({ _id: id });
    if (existed) continue;

    const trip = {
      _id: id, // 保留原云开发 _id 字符串
      creatorId: doc.creatorId || '',
      creator: doc.creator || {},
      departureDate: doc.departureDate || '',
      departureTimeStart: doc.departureTimeStart || '',
      departureTimeEnd: doc.departureTimeEnd || '',
      departureEndTime: Number(doc.departureEndTime) || 0,
      departureLocation: doc.departureLocation || {},
      arrivalLocation: doc.arrivalLocation || {},
      ticketTime: doc.ticketTime || '',
      maxPassengers: Number(doc.maxPassengers) || 1,
      currentPassengers: Number(doc.currentPassengers) || 1,
      status: doc.status || 'open',
      passengers: Array.isArray(doc.passengers) ? doc.passengers : [],
      completedBy: Array.isArray(doc.completedBy) ? doc.completedBy : [],
      note: doc.note || '',
      createdAt: Number(doc.createdAt) || Date.now(),
    };

    // 时区修复 backfill：老数据缺 departureEndTime 时按北京时间补算
    if (!(trip.departureEndTime > 0)) {
      const ms = resolveEndTimeMs(trip);
      if (!Number.isNaN(ms)) {
        trip.departureEndTime = ms;
        backfilled += 1;
      }
    }

    await Trip.create(trip);
    inserted += 1;
  }
  console.log(
    `[migrate] trips: 导入 ${inserted} 条，跳过重复 ${docs.length - inserted} 条，` +
      `backfill departureEndTime ${backfilled} 条`,
  );
  return inserted;
}

async function main() {
  const dataDir = path.resolve(__dirname, '../data');
  const usersFile = process.env.MIGRATE_USERS || path.join(dataDir, 'users.json');
  const tripsFile = process.env.MIGRATE_TRIPS || path.join(dataDir, 'trips.json');

  await connect(MONGODB_URI);

  const usersDocs = readJson(usersFile);
  if (usersDocs) await migrateUsers(usersDocs);

  const tripsDocs = readJson(tripsFile);
  if (tripsDocs) await migrateTrips(tripsDocs);

  if (!usersDocs && !tripsDocs) {
    console.error(
      '[migrate] 未找到数据文件。请先从云开发控制台导出 users/trips 集合，\n' +
        '          放到 server/data/users.json 与 server/data/trips.json 后重试。',
    );
  }

  await mongoose.disconnect();
  console.log('[migrate] 完成');
}

main().catch((err) => {
  console.error('[migrate] 失败:', err);
  process.exit(1);
});
