<template>
  <router-view />
  <van-tabbar route fixed placeholder safe-area-inset-bottom>
    <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
    <van-tabbar-item to="/publish" icon="photograph">发布</van-tabbar-item>
    <van-tabbar-item to="/match" icon="exchange">匹配</van-tabbar-item>
    <van-tabbar-item to="/me" icon="user-o">我的</van-tabbar-item>
  </van-tabbar>
</template>
