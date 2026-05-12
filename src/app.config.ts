export default defineAppConfig({
  lazyCodeLoading: 'requiredComponents',
  pages: [
    'pages/plaza/index',
    'pages/create/index',
    'pages/detail/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '校园拼车',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f5f7',
  },
  permission: {
    'scope.userLocation': {
      desc: '需要获取你的位置来显示附近的出发地点',
    },
  },
  requiredPrivateInfos: ['getLocation', 'chooseLocation'],
  tabBar: {
    color: '#86868b',
    selectedColor: '#007aff',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/plaza/index',
        text: '行程广场',
        iconPath: 'assets/tab/plaza.png',
        selectedIconPath: 'assets/tab/plaza-active.png',
      },
      {
        pagePath: 'pages/create/index',
        text: '发布行程',
        iconPath: 'assets/tab/create.png',
        selectedIconPath: 'assets/tab/create-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
