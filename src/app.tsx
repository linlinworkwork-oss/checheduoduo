import { PropsWithChildren } from 'react';
import Taro, { useLaunch } from '@tarojs/taro';
import { useUserStore } from './stores/userStore';
import { initCloud } from './lib/cloud';
import './app.scss';

function App({ children }: PropsWithChildren) {
  const { initUser } = useUserStore();

  useLaunch(() => {
    // Suppress WeChat internal timeout — harmless, not from our code
    Taro.onError((err) => {
      const msg = typeof err === 'string' ? err : String(err);
      if (msg.includes('timeout') && !msg.includes('[Cloud]')) return;
      console.error('[App] Unhandled error:', err);
    });

    // 方案 B：初始化 API 客户端（生成/读取本地匿名 uid），再拉取用户档案
    initCloud().finally(() => initUser());
  });

  return children;
}

export default App;
