import Taro from '@tarojs/taro';

/**
 * 网络层（方案 B：自建 Express + MongoDB 后端）。
 *
 * 设计目标：保持原 `callCloudFunction(name, payload)` 接口签名不变，
 * 内部把「云函数名调用」映射为 REST 请求 —— store/页面代码零改动。
 *
 * - 身份：不再依赖 CloudBase 匿名登录，本地生成持久 uid（localStorage/StorageSync），
 *   每个请求带 `x-uid` 请求头，服务端以此识别用户。
 * - 地址：构建期注入 process.env.TARO_APP_API_BASE（见 config/index.ts），
 *   为空时走同源相对路径 /api（由后端托管 web/ 静态文件的最简部署）。
 */

const UID_KEY = 'pinche_anon_uid_v1';
const API_TIMEOUT = 25000;

// 构建期注入；为空字符串则使用相对路径（同源部署）
const API_BASE = (process.env.TARO_APP_API_BASE || '').replace(/\/+$/, '');

let uid: string | null = null;

function randomUid(): string {
  return (
    'u_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

/** 初始化 API 客户端：确保本地存在持久匿名 uid。 */
export async function initCloud(): Promise<void> {
  if (uid) return;
  try {
    const stored = Taro.getStorageSync(UID_KEY);
    if (stored && typeof stored === 'string') {
      uid = stored;
      return;
    }
  } catch (err) {
    console.warn('[Api] 读取本地 uid 失败:', err);
  }
  const fresh = randomUid();
  try {
    Taro.setStorageSync(UID_KEY, fresh);
  } catch (err) {
    console.warn('[Api] 保存本地 uid 失败:', err);
  }
  uid = fresh;
}

/** 当前匿名用户 uid（未初始化时为 null）。 */
export function getUid(): string | null {
  return uid;
}

interface ApiResult {
  code?: number;
  message?: string;
  [key: string]: unknown;
}

/** 把云函数名调用映射为 REST 端点。 */
function resolveEndpoint(name: string, payload: Record<string, unknown>) {
  const tripId = payload?.tripId ? String(payload.tripId) : '';
  switch (name) {
    case 'login':
      return { method: 'GET' as const, url: '/api/auth' };
    case 'updateProfile':
      return { method: 'PATCH' as const, url: '/api/profile' };
    case 'createTrip':
      return { method: 'POST' as const, url: '/api/trips' };
    case 'listTrips': {
      // 手写 query 拼接（不依赖 URLSearchParams，兼容小程序端 wx.request）
      const parts: string[] = [];
      const add = (k: string, v: unknown) => {
        if (v === undefined || v === null || v === '') return;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      };
      add('departureDate', payload.departureDate);
      add('keyword', payload.keyword);
      add('hideFull', payload.hideFull);
      add('page', payload.page);
      add('pageSize', payload.pageSize);
      // 数组参数追加多次（后端 parseListParam 支持数组/逗号两种）
      if (Array.isArray(payload.departureNames)) {
        payload.departureNames.forEach((n) => add('departureNames', n));
      }
      if (Array.isArray(payload.arrivalNames)) {
        payload.arrivalNames.forEach((n) => add('arrivalNames', n));
      }
      const qs = parts.join('&');
      return { method: 'GET' as const, url: `/api/trips${qs ? `?${qs}` : ''}` };
    }
    case 'getTrip':
      return { method: 'GET' as const, url: `/api/trips/${tripId}` };
    case 'joinTrip':
      return { method: 'POST' as const, url: `/api/trips/${tripId}/join` };
    case 'leaveTrip':
      return { method: 'POST' as const, url: `/api/trips/${tripId}/leave` };
    case 'cancelTrip':
      return { method: 'POST' as const, url: `/api/trips/${tripId}/cancel` };
    case 'completeTrip':
      return { method: 'POST' as const, url: `/api/trips/${tripId}/complete` };
    case 'getMyTrips':
      return { method: 'GET' as const, url: '/api/my-trips' };
    default:
      throw new Error(`[Api] 未知接口: ${name}`);
  }
}

/**
 * 调用后端（原 callCloudFunction 签名）。
 * @param name 云函数名（自动映射 REST 端点）
 * @param payload 调用参数
 * @returns 后端 body（{ code: 0, ... }），code !== 0 时抛 Error(message)
 */
export async function callCloudFunction<T = ApiResult>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  if (!uid) await initCloud();
  if (!uid) throw new Error('[Api] 用户身份初始化失败');

  const { method, url } = resolveEndpoint(name, payload || {});

  // 从 payload 中剔除路由占位字段（tripId），其余作 body。
  // 注意：departureDate 等查询字段只被 listTrips(GET) 消费，不在此剔除，
  // 否则 createTrip(POST) 的请求体会丢失必填的 departureDate。
  const BODY_EXCLUDE = new Set(['tripId']);
  let body: string | undefined;
  if (method === 'POST' || method === 'PATCH') {
    const rest: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload || {})) {
      if (!BODY_EXCLUDE.has(k)) rest[k] = v;
    }
    body = JSON.stringify(rest);
  }

  const fullUrl = `${API_BASE}${url}`;
  let response: Taro.request.SuccessCallbackResult;
  try {
    response = await Taro.request({
      url: fullUrl,
      method,
      data: body,
      header: {
        'content-type': 'application/json',
        'x-uid': uid,
      },
      timeout: API_TIMEOUT,
    });
  } catch (err) {
    console.error(`[Api] ${name} 网络失败:`, err);
    throw new Error(`网络请求失败，请检查后端服务是否启动`);
  }

  const result = response.data as ApiResult | undefined;
  if (!result || typeof result !== 'object') {
    throw new Error(`[Api] ${name} 返回格式错误`);
  }
  if (result.code !== undefined && result.code !== 0) {
    throw new Error(result.message || `[Api] ${name} 调用失败`);
  }
  return result as T;
}
