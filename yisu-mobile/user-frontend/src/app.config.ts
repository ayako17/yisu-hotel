export default {
    pages: [
        'pages/login/index',
        'pages/home/index',
        'pages/order/index',
        'pages/profile/index',
        'pages/list/index',
        'pages/hotel/index',
    ],
    window: {
        backgroundTextStyle: 'light',
        navigationBarBackgroundColor: '#fff',
        navigationBarTitleText: '酒s店预订',
        navigationBarTextStyle: 'black'
    },
    tabBar: {
        color: '#999',
        selectedColor: '#258fec',
        backgroundColor: '#fff',
        borderStyle: 'black',
        list: [
            {
                pagePath: 'pages/home/index',
                text: '首页',
                iconPath: 'assets/icons/home.png',
                selectedIconPath: 'assets/icons/home-active.png'
            },
            {
                pagePath: 'pages/order/index',
                text: '订单',
                iconPath: 'assets/icons/order.png',
                selectedIconPath: 'assets/icons/order-active.png'
            },
            {
                pagePath: 'pages/profile/index',
                text: '我的',
                iconPath: 'assets/icons/profile.png',
                selectedIconPath: 'assets/icons/profile-active.png'
            }
        ]
    }
};