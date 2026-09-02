/**
 * 统一响应格式，与云函数返回值对齐：
 * 成功：{ code: 0, ...data }，HTTP 200
 * 失败：{ code: <http状态码>, message }, HTTP 状态码一致
 * 前端 fetch 层解析 body，code !== 0 时抛出 Error(message)。
 */

function ok(res, data = {}) {
  return res.status(200).json({ code: 0, ...data });
}

function fail(res, status, message) {
  return res.status(status).json({ code: status, message });
}

module.exports = { ok, fail };
