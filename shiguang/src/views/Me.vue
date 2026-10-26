<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { usePostsStore } from '../stores/posts'
import { CATEGORIES, STATUS, textOf } from '../lib/constants'
import { fmtTime, orderPosts } from '../lib/utils'

const router = useRouter()
const store = usePostsStore()

const mine = computed(() => orderPosts(store.mine))
const stats = computed(() => ({
  mine: mine.value.length,
  open: mine.value.filter(p => p.status === 'open').length,
  closed: mine.value.filter(p => p.status === 'closed').length,
}))

onMounted(() => store.load())

async function clearAll() {
  await showConfirmDialog({
    title: '清空全部数据？',
    message: '包括种子数据和所有帖子，用于演示重置',
  })
  await store.clearAll()
  showToast('已清空')
}
</script>

<template>
  <div class="page page--nav">
    <van-nav-bar title="我的" />

    <div class="stats">
      <div class="stats__item">
        <div class="stats__num">{{ stats.mine }}</div>
        <div class="stats__label">我发布的</div>
      </div>
      <div class="stats__item">
        <div class="stats__num">{{ stats.open }}</div>
        <div class="stats__label">进行中</div>
      </div>
      <div class="stats__item">
        <div class="stats__num">{{ stats.closed }}</div>
        <div class="stats__label">已完成</div>
      </div>
    </div>

    <van-cell-group inset class="mt" title="我发布的帖子">
      <template v-if="mine.length">
        <van-cell
          v-for="p in mine"
          :key="p.id"
          :title="p.title"
          :label="`${textOf(CATEGORIES, p.category)} · ${p.placeTag} · ${fmtTime(p.createdAt)}`"
          is-link
          @click="router.push(`/detail/${p.id}`)"
        >
          <template #value>
            <van-tag :type="STATUS[p.status].type">{{ STATUS[p.status].text }}</van-tag>
          </template>
        </van-cell>
      </template>
      <van-cell v-else title="还没有发布过帖子" label="去「发布」页拍一张试试" is-link to="/publish" />
    </van-cell-group>

    <van-cell-group inset class="mt" title="工具">
      <van-cell title="清空演示数据" icon="replay" is-link @click="clearAll" />
      <van-cell title="关于" icon="info-o" value="拾光 v1.0 · HTML5 课程项目" />
    </van-cell-group>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 16px 0;
}
.stats__item {
  flex: 1;
  text-align: center;
}
.stats__num {
  font-size: 22px;
  font-weight: 700;
  color: #1989fa;
}
.stats__label {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}
.mt {
  margin-top: 12px;
}
</style>
