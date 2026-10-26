<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showImagePreview } from 'vant'
import { usePostsStore } from '../stores/posts'
import { CATEGORIES, STATUS, textOf } from '../lib/constants'
import { fmtTime } from '../lib/utils'
import { compressImage } from '../lib/image'
import { computePhash, hamming, MATCH_THRESHOLD } from '../lib/phash'

const route = useRoute()
const router = useRouter()
const store = usePostsStore()

const post = ref(null)
const url = ref('')
const claimPhotoUrl = ref('')
const matched = ref([])
const claimFile = ref(null)
const claimUrl = ref('')
const claimAnswer = ref('')
const claimAiDist = ref(null)
const showClaim = ref(false)
const claiming = ref(false)

onMounted(async () => {
  post.value = await store.getById(Number(route.params.id))
  if (!post.value) {
    showToast('帖子不存在')
    return router.replace('/')
  }
  url.value = post.value._url
  if (post.value.claimPhoto) claimPhotoUrl.value = URL.createObjectURL(post.value.claimPhoto)
  matched.value = await store.matchesFor(post.value.id)
})

onBeforeUnmount(() => {
  if (url.value?.startsWith('blob:')) URL.revokeObjectURL(url.value)
  if (claimPhotoUrl.value) URL.revokeObjectURL(claimPhotoUrl.value)
})

function preview() {
  showImagePreview([url.value])
}

async function onClaimPhoto(e) {
  const f = e.target.files?.[0]
  if (!f) return
  claimFile.value = f
  claimUrl.value = URL.createObjectURL(f)
  e.target.value = ''
  const blob = await compressImage(f)
  const h = await computePhash(blob)
  claimAiDist.value = hamming(h, post.value.phash)
}

const claimAiText = computed(() => {
  if (claimAiDist.value == null) return null
  const d = claimAiDist.value
  if (d <= MATCH_THRESHOLD) return { text: `AI 相似度：高（距离 ${d}）`, type: 'success' }
  if (d <= 20) return { text: `AI 相似度：中（距离 ${d}）`, type: 'warning' }
  return { text: `AI 相似度：低（距离 ${d}），疑似不匹配`, type: 'danger' }
})

async function submitClaim() {
  if (!claimFile.value) return showToast('请拍摄手中物品照片')
  if (post.value.secret && !claimAnswer.value.trim()) return showToast('请回答验证暗号')
  claiming.value = true
  try {
    const blob = await compressImage(claimFile.value)
    await store.applyClaim(post.value.id, {
      claimPhoto: blob,
      claimAnswer: claimAnswer.value.trim(),
      claimDistance: claimAiDist.value,
    })
    post.value = await store.getById(post.value.id)
    claimPhotoUrl.value = URL.createObjectURL(post.value.claimPhoto)
    showClaim.value = false
    showToast('认领申请已提交，等待发布者确认')
  } catch (err) {
    showToast(
      err?.message === 'IMAGE_DECODE_FAILED'
        ? '图片格式不支持解码，请重新拍摄'
        : '提交失败：' + (err?.message || err)
    )
  } finally {
    claiming.value = false
  }
}

async function confirmClaim() {
  await showConfirmDialog({ title: '确认归还？', message: '确认后订单完成，不可撤销' })
  await store.confirmClaim(post.value.id)
  post.value = await store.getById(post.value.id)
  showToast('已确认，订单完成')
}

async function rejectClaim() {
  await showConfirmDialog({ title: '拒绝该认领申请？' })
  await store.rejectClaim(post.value.id)
  post.value = await store.getById(post.value.id)
  if (claimPhotoUrl.value) {
    URL.revokeObjectURL(claimPhotoUrl.value)
    claimPhotoUrl.value = ''
  }
  showToast('已拒绝，帖子恢复为进行中')
}

async function del() {
  await showConfirmDialog({ title: '删除该帖子？' })
  await store.remove(post.value.id)
  showToast('已删除')
  router.replace('/')
}
</script>

<template>
  <div class="page page--nav" v-if="post">
    <van-nav-bar title="详情" left-arrow @click-left="router.back()" />

    <div class="img-wrap" @click="preview">
      <img :src="url" />
      <span class="img-hint">点击查看大图</span>
    </div>

    <van-cell-group inset class="mt">
      <van-cell>
        <template #title>
          <div class="head">
            <van-tag :type="post.type === 'lost' ? 'danger' : 'primary'">
              {{ post.type === 'lost' ? '失物' : '招领' }}
            </van-tag>
            <span class="head__title">{{ post.title }}</span>
          </div>
        </template>
      </van-cell>
      <van-cell title="类别" :value="textOf(CATEGORIES, post.category)" />
      <van-cell title="颜色" :value="post.color" />
      <van-cell title="地点" :value="post.placeTag" />
      <van-cell v-if="post.geo" title="经纬度" :value="`${post.geo.lat}, ${post.geo.lng}`" />
      <van-cell title="发布时间" :value="fmtTime(post.createdAt)" />
      <van-cell title="状态">
        <template #value>
          <van-tag :type="STATUS[post.status].type" size="large">{{ STATUS[post.status].text }}</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <div v-if="matched.length" class="panel">
      <div class="panel__title">
        <van-icon name="exchange" />
        AI 匹配结果（{{ matched.length }}）
      </div>
      <div
        v-for="m in matched"
        :key="m.log.id"
        class="matched__item"
        @click="router.push(`/detail/${m.other.id}`)"
      >
        <img :src="m.other._url" />
        <div class="matched__info">
          <div class="matched__name van-ellipsis">{{ m.other.title }}</div>
          <div class="matched__sub">
            {{ m.other.type === 'lost' ? '失物' : '招领' }} · {{ m.other.placeTag }}
          </div>
        </div>
        <van-tag type="success">距离 {{ m.log.distance }}</van-tag>
      </div>
    </div>

    <div v-if="post.isMine && post.status === 'pending'" class="panel">
      <div class="panel__title"><van-icon name="todo-list-o" /> 收到认领申请</div>
      <img class="claim-img" :src="claimPhotoUrl" />
      <div class="verify">
        <van-tag :type="claimAiText?.type || 'default'" size="large">
          {{ claimAiText?.text || `AI 距离 ${post.claimDistance}` }}
        </van-tag>
      </div>
      <div v-if="post.secret" class="verify__answer">
        <div class="verify__row"><span class="verify__label">我的暗号</span>{{ post.secret }}</div>
        <div class="verify__row"><span class="verify__label">对方回答</span>{{ post.claimAnswer || '（未回答）' }}</div>
      </div>
      <div class="verify__btns">
        <van-button type="primary" round icon="passed" @click="confirmClaim">确认归还</van-button>
        <van-button plain type="danger" round icon="close" @click="rejectClaim">拒绝认领</van-button>
      </div>
    </div>

    <div v-if="post.status === 'closed' && claimPhotoUrl" class="panel">
      <div class="panel__title"><van-icon name="passed" /> 认领凭证</div>
      <img class="claim-img" :src="claimPhotoUrl" />
    </div>

    <div class="actions">
      <van-button
        v-if="post.status === 'open'"
        type="primary"
        round
        block
        icon="award"
        @click="showClaim = true"
      >
        {{ post.type === 'found' ? '我是失主，申请认领' : '我捡到了，去归还' }}
      </van-button>
      <van-button v-if="post.isMine" plain type="danger" round block icon="delete-o" @click="del">
        删除
      </van-button>
    </div>

    <van-popup v-model:show="showClaim" round position="bottom">
      <div class="claim">
        <div class="claim__title">认领验证</div>
        <div class="claim__desc">
          请拍摄一张「物品在手」的照片，系统将自动与原帖照片做 AI 相似度比对
        </div>
        <img v-if="claimUrl" class="claim__preview" :src="claimUrl" />
        <div v-if="claimAiText" class="claim__ai">
          <van-tag :type="claimAiText.type" size="large">{{ claimAiText.text }}</van-tag>
        </div>
        <van-button block plain type="primary" icon="photograph" @click="$refs.claimCamera.click()">
          {{ claimUrl ? '重新拍摄' : '拍摄手中物品照片' }}
        </van-button>
        <input ref="claimCamera" type="file" accept="image/*" capture="environment" hidden @change="onClaimPhoto" />

        <van-field
          v-if="post.secret"
          v-model="claimAnswer"
          label="验证暗号"
          placeholder="请输入物品细节暗号"
          class="claim__field"
        />
        <div v-else class="claim__nosecret">发布者未设置暗号</div>

        <van-button
          class="claim__btn"
          type="primary"
          round
          block
          :loading="claiming"
          loading-text="提交中..."
          @click="submitClaim"
        >
          提交认领申请
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.mt {
  margin-top: 12px;
}
.img-wrap {
  position: relative;
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.img-wrap img {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
}
.img-hint {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  padding: 3px 8px;
  border-radius: 10px;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.head__title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.panel {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
}
.panel__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.matched__item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
}
.matched__item img {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
}
.matched__info {
  flex: 1;
  min-width: 0;
}
.matched__name {
  font-size: 14px;
  font-weight: 600;
}
.matched__sub {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}
.claim-img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  background: #f7f8fa;
}
.verify {
  margin-top: 10px;
}
.verify__answer {
  margin-top: 10px;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 10px;
}
.verify__row {
  font-size: 13px;
  line-height: 1.8;
}
.verify__label {
  display: inline-block;
  width: 64px;
  color: #969799;
}
.verify__btns {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.verify__btns .van-button {
  flex: 1;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 12px;
}
.claim {
  padding: 20px 16px;
}
.claim__title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}
.claim__desc {
  font-size: 12px;
  color: #969799;
  margin: 8px 0 12px;
  text-align: center;
}
.claim__preview {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  background: #f7f8fa;
  margin-bottom: 10px;
}
.claim__ai {
  text-align: center;
  margin-bottom: 10px;
}
.claim__field {
  margin-top: 10px;
  background: #f7f8fa;
  border-radius: 8px;
}
.claim__nosecret {
  margin-top: 10px;
  font-size: 12px;
  color: #c8c9cc;
  text-align: center;
}
.claim__btn {
  margin-top: 14px;
}
</style>
