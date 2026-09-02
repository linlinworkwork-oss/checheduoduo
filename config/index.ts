import fs from 'fs';
import path from 'path';
import { defineConfig } from '@tarojs/cli';

/**
 * Taro 4.1.9 不会自动加载 .env 文件，这里手动加载（仅构建期生效，
 * 产物里不会残留任何 process 引用）。优先级：已存在的环境变量 > .env。
 */
function loadEnvFile(): void {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

loadEnvFile();

// H5 编译输出到 web/，小程序编译输出到 dist/，互不覆盖
const isH5 = process.env.TARO_ENV === 'h5';

const config = defineConfig({
  projectName: 'pinche',
  date: '2026-5-11',
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    375: 2,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: isH5 ? 'web' : 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  // 构建期把 process.env.TARO_APP_* 替换为字面量，避免产物残留
  // process 引用（小程序运行时没有 process 全局变量）。
  // 方案 B：TARO_APP_API_BASE 指向自建后端；为空则走同源相对路径 /api
  defineConstants: {
    'process.env.TARO_APP_CLOUD_ENV': JSON.stringify(process.env.TARO_APP_CLOUD_ENV || ''),
    'process.env.TARO_APP_API_BASE': JSON.stringify(process.env.TARO_APP_API_BASE || ''),
  },
  copy: {
    patterns: [
      { from: 'src/assets/', to: `${isH5 ? 'web' : 'dist'}/assets/` },
    ],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    // hash 路由：任意静态托管都能直接部署，无需服务器 rewrite
    router: {
      mode: 'hash',
    },
  },
});

export default config;
