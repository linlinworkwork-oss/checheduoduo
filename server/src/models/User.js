const mongoose = require('mongoose');

/** 生成类云开发的字符串 _id（前端把 _id 当纯字符串使用，保持一致性） */
function genId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * 用户档案。openid 字段承载身份标识：
 * - 网站端：前端生成的匿名 uid（x-uid 头）
 * - 小程序端：微信 OPENID
 * 为了兼容既有云开发数据结构，统一存到 openid 字段。
 */
const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: genId },
    openid: { type: String, required: true, unique: true, index: true },
    avatarUrl: { type: String, default: '' },
    nickName: { type: String, default: '' },
    phone: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female'], default: 'female' },
    studentId: { type: String, default: '' },
    wechatId: { type: String, default: '' },
    createdAt: { type: Number, default: Date.now },
  },
  { versionKey: false, timestamps: false },
);

module.exports = mongoose.model('User', userSchema);
