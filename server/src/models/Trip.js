const mongoose = require('mongoose');

/** 生成类云开发的字符串 _id（前端把 _id 当纯字符串使用，保持一致性） */
function genId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8)
  );
}

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
  },
  { _id: false, versionKey: false },
);

/** 发起人快照（仅基础资料，与云函数 createTrip 结构一致） */
const creatorSnapshotSchema = new mongoose.Schema(
  {
    nickName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    studentId: { type: String, default: '' },
    wechatId: { type: String, default: '' },
  },
  { _id: false, versionKey: false },
);

const personSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: String, default: '' },
    nickName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    luggageSize: { type: String, default: 'none' },
    studentId: { type: String, default: '' },
    wechatId: { type: String, default: '' },
    joinedAt: { type: Number, default: Date.now },
  },
  { _id: false, versionKey: false },
);

/**
 * 行程（trips）。结构与云开发集合一致：
 * - _id 为字符串（兼容云开发导出的旧数据，前端按纯字符串使用）
 * - creator/passengers 为发布/加入时的人物快照
 * - departureEndTime 为前端按设备时区算好的绝对时间戳（ms），
 *   后端所有时间过滤只比较数字，不做字符串解析 —— 无时区坑
 * - completedBy 记录谁标记了完成；含 creatorId 表示行程已完成
 */
const tripSchema = new mongoose.Schema(
  {
    _id: { type: String, default: genId },
    creatorId: { type: String, required: true, index: true },
    creator: { type: creatorSnapshotSchema, default: () => ({}) },
    departureDate: { type: String, required: true },
    departureTimeStart: { type: String, required: true },
    departureTimeEnd: { type: String, required: true },
    departureEndTime: { type: Number, default: 0 },
    departureLocation: { type: locationSchema, default: () => ({}) },
    arrivalLocation: { type: locationSchema, default: () => ({}) },
    ticketTime: { type: String, default: '' },
    maxPassengers: { type: Number, default: 1 },
    currentPassengers: { type: Number, default: 1 },
    status: { type: String, enum: ['open', 'full', 'cancelled'], default: 'open', index: true },
    passengers: { type: [personSnapshotSchema], default: [] },
    completedBy: { type: [String], default: [] },
    note: { type: String, default: '' },
    createdAt: { type: Number, default: Date.now, index: true },
  },
  { versionKey: false, timestamps: false },
);

module.exports = mongoose.model('Trip', tripSchema);
