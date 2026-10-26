<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '../stores/posts'
import { CATEGORIES, PLACES, STATUS, textOf } from '../lib/constants'
import { fmtTime, orderPosts } from '../lib/utils'

const router = useRouter()
const store = usePostsStore()

const tab = ref('all')
const cat = ref('')
const place = ref('')
const refreshing = ref(false)

const catOptions = [{ value: '', text: '全部类别' }, ...CATEGORIES]
const placeOptions = [{ value: '', text: '全部地点' }, ...PLACES.map(t => ({ text: t, value: t }))]

const filtered = computed(() =>
  orderPosts(
    store.posts.filter(p => {
      if (tab.value !== 'all' && p.type !== tab.value) return false
      if (cat.value && p.category !== cat.value) return false
      if (place.value && p.placeTag !== place.value) return false
      return true
    })
  )
)

onMounted(() => store.load())

async function onRefresh() {
  await store.load()
  refreshing.value = false
}
</script>

<template>
  <div class="page page--nav">
    <van-nav-bar title="拾光 · AI 失物招领" />

    <van-tabs v-model:active="tab" sticky>
      <van-tab title="全部" name="all" />
      <van-tab title="失物" name="lost" />
      <van-tab title="招领" name="found" />
    </van-tabs>

    <van-dropdown-menu>
      <van-dropdown-item v-model="cat" :options="catOptions" />
      <van-dropdown-item v-model="place" :options="placeOptions" />
    </van-dropdown-menu>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div class="list">
        <div v-for="p in filtered" :key="p.id" class="card" @click="router.push(`/detail/${p.id}`)">
          <img class="card__thumb" :src="p._url" />
          <div class="card__body">
            <div class="card__title">
              <van-tag :type="p.type === 'lost' ? 'danger' : 'primary'">
                {{ p.type === 'lost' ? '失物' : '招领' }}
              </van-tag>
              <span class="card__name van-ellipsis">{{ p.title }}</span>
            </div>
            <div class="card__tags">
              <van-tag plain type="primary">{{ textOf(CATEGORIES, p.category) }}</van-tag>
              <van-tag plain>{{ p.color }}</van-tag>
              <van-tag plain type="warning">{{ p.placeTag }}</van-tag>
            </div>
            <div class="card__foot">
              <span class="card__time">{{ fmtTime(p.createdAt) }}</span>
              <van-tag :type="STATUS[p.status].type">{{ STATUS[p.status].text }}</van-tag>
            </div>
          </div>
        </div>

        <van-empty v-if="!filtered.length" description="暂无相关帖子，下拉试试" />
      </div>
    </van-pull-refresh>
  </div>
</template>

<style scoped>
.list {
  padding: 10px 12px;
}
.card {
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 10px;
}
.card__thumb {
  width: 86px;
  height: 86px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}
.card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card__title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card__name {
  font-size: 15px;
  font-weight: 600;
}
.card__tags {
  display: flex;
  gap: 6px;
}
.card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card__time {
  font-size: 12px;
  color: #969799;
}
</style>
