import { createPortal } from 'react-dom';

/**
 * H5 专用 Portal：把弹层挂到 document.body 顶层，
 * 脱离 Taro 页面容器（.taro-tabbar__panel）。
 *
 * 背景：页面内任何 position:fixed 弹窗，即使 z-index 再高，
 * 也压不过 Taro 底部导航栏（.weui-tabbar z-index:500），
 * 弹窗下半部分会被导航栏挡住点不到。
 * 挂到 body 后，z-index:12000 即可正常覆盖导航栏。
 *
 * 小程序端无 document，退化为直接渲染子节点。
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document !== 'undefined') {
    return createPortal(children, document.body);
  }
  return <>{children}</>;
}
