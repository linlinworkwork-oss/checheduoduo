const { fail } = require('../utils/response');

/**
 * 网站端鉴权：读取 x-uid 请求头作为用户身份标识。
 * （匿名 uid 模式可被伪造，校园互助场景可接受；见 PLAN-B.md 风险章节）
 */
function requireUid(req, res, next) {
  const uid = (req.get('x-uid') || '').trim();
  if (!uid) return fail(res, 401, '请先登录');
  req.uid = uid;
  return next();
}

module.exports = { requireUid };
