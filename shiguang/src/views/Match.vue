<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '../stores/posts'
import { fmtTime } from '../lib/utils'

const router = useRouter()
const store = usePostsStore()
const logs = ref([])

onMounted(async () => {
  await store.load()
  logs.value = await store.allLogs()
})
</script>

<template>
  <div class="page page--nav">
    <van-nav-bar title="匹配中心" />

    <div class="list">
      <div v-for="log in logs" :key="log.id" class="pair">
        <div class="pair__side" @click="router.push(`/detail/${log.post.id}`)">
          <img :src="log.post._url" />
          <van-tag type="danger">{{ log.post.type === 'lost' ? '失物' : '招领' }}</van-tag>
          <div class="pair__name van-ellipsis">{{ log.post.title }}</div>
        </div>
        <div class="pair__mid">
          <van-icon name="exchange" size="20" color="#1989fa" />
          <van-tag type="success" class="pair__dist">距离 {{ log.distance }}</van-tag>
          <span class="pair__time">{{ fmtTime(log.createdAt) }}</span>
        </div>
        <div class="pair__side" @click="router.push(`/detail/${log.match.id}`)">
          <img :src="log.match._url" />
          <van-tag type="primary">{{ log.match.type === 'lost' ? '失物' : '招领' }}</van-tag>
          <div class="pair__name van-ellipsis">{{ log.match.title }}</div>
        </div>
      </div>

      <van-empty v-if="!logs.length" description="暂无匹配记录，发布帖子后自动比对" />
    </div>
  </div>
</template>

<style scoped>
.list {
  padding: 12px;
}
.pair {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
}
.pair__side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pair__side img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
}
.pair__name {
  font-size: 12px;
  width: 100%;
  text-align: center;
  font-weight: 600;
}
.pair__mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pair__time {
  font-size: 10px;
  color: #c8c9cc;
  white-space: nowrap;
}
</style>
