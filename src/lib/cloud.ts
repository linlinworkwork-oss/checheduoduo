import Taro from '@tarojs/taro';

const CLOUD_FN_TIMEOUT = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number, fnName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[Cloud] ${fnName} 超时`)), ms)),
  ]);
}

export async function callCloudFunction<T = any>(
  name: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  try {
    const { result } = await withTimeout(
      Taro.cloud.callFunction({ name, data: payload }),
      CLOUD_FN_TIMEOUT,
      name,
    );
    if (result && (result as any).code !== undefined && (result as any).code !== 0) {
      throw new Error((result as any).message || `[Cloud] ${name} 调用失败`);
    }
    return result as T;
  } catch (err) {
    console.error(`[Cloud] ${name} failed:`, err);
    throw err;
  }
}

export function initCloud(): void {
  Taro.cloud.init({ env: 'cloud1-d8gz749otb17f1b3b' });
}
