<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { usePostsStore } from '../stores/posts'
import { compressImage, makeThumb } from '../lib/image'
import { computePhash } from '../lib/phash'
import { CATEGORIES, COLORS, PLACES, textOf } from '../lib/constants'

const router = useRouter()
const store = usePostsStore()

const type = ref('lost')
const rawFile = ref(null)
const previewUrl = ref('')
const title = ref('')
const category = ref('')
const color = ref('')
const placeTag = ref('')
const secret = ref('')
const geo = ref(null)
const submitting = ref(false)

const showPicker = ref(false)
const pickerField = ref('')
const pickerColumns = ref([])

const pickerMap = {
  category: { options: CATEGORIES.map(o => ({ text: o.text, value: o.value })), label: '物品类别' },
  color: { options: COLORS.map(t => ({ text: t, value: t })), label: '颜色' },
  place: { options: PLACES.map(t => ({ text: t, value: t })), label: '地点' },
}

function onCamera(e) {
  takeFile(e)
}
function onGallery(e) {
  takeFile(e)
}
function takeFile(e) {
  const file = e.target.files?.[0]
  if (file) {
    rawFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
  e.target.value = ''
}

function openPicker(field) {
  pickerField.value = field
  pickerColumns.value = pickerMap[field].options
  showPicker.value = true
}
function onPickerConfirm({ selectedOptions }) {
  const v = selectedOptions[0]?.value
  if (pickerField.value === 'category') category.value = v
  if (pickerField.value === 'color') color.value = v
  if (pickerField.value === 'place') placeTag.value = v
  showPicker.value = false
}

const MOCK_GEO = { lat: 39.96912, lng: 116.31851 }

function useMockGeo(reason) {
  geo.value = { ...MOCK_GEO }
  showToast(reason)
}

function locate() {
  if (!navigator.geolocation) return useMockGeo('设备不支持定位，已使用演示定位')
  if (!window.isSecureContext) return useMockGeo('HTTP 环境无法定位，已使用演示定位')
  showToast('定位中...')
  navigator.geolocation.getCurrentPosition(
    pos => {
      geo.value = {
        lat: +pos.coords.latitude.toFixed(5),
        lng: +pos.coords.longitude.toFixed(5),
      }
      showToast('定位成功')
    },
    () => useMockGeo('定位失败，已使用演示定位')
  )
}

const showResult = ref(false)
const resultMatches = ref([])

async function submit() {
  if (!rawFile.value) return showToast('请先拍照或选择图片')
  if (!title.value.trim()) return showToast('请填写物品名称')
  if (!category.value) return showToast('请选择物品类别')

  submitting.value = true
  try {
    const blob = await compressImage(rawFile.value)
    const thumbDataUrl = await makeThumb(rawFile.value)
    const phash = await computePhash(blob)
    const { matches } = await store.addPost({
      type: type.value,
      title: title.value.trim(),
      category: category.value,
      color: color.value || '其他',
      placeTag: placeTag.value || '其他',
      secret: secret.value.trim(),
      geo: geo.value ? { ...geo.value } : null,
      imageBlob: blob,
      thumbDataUrl,
      phash,
      status: 'open',
      isMine: true,
      claimPhoto: null,
      createdAt: Date.now(),
    })
    resultMatches.value = matches
    showResult.value = true
  } catch (err) {
    showToast(
      err?.message === 'IMAGE_DECODE_FAILED'
        ? '图片格式不支持解码，请换一张或重新拍摄'
        : '发布失败：' + (err?.message || err)
    )
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  rawFile.value = null
  previewUrl.value = ''
  title.value = ''
  category.value = ''
  color.value = ''
  placeTag.value = ''
  secret.value = ''
  geo.value = null
}

function goMatch() {
  showResult.value = false
  router.push('/match')
}
function goHome() {
  showResult.value = false
  resetForm()
  router.push('/')
}
</script>

<template>
  <div class="page page--nav">
    <van-nav-bar title="发布" />

    <div class="form">
      <div class="block">
        <div class="block__label">类型</div>
        <van-radio-group v-model="type" direction="horizontal">
          <van-radio name="lost">我丢了东西</van-radio>
          <van-radio name="found">我捡到了东西</van-radio>
        </van-radio-group>
      </div>

      <div class="block">
        <div class="block__label">物品照片</div>
        <div class="shot">
          <img v-if="previewUrl" class="shot__preview" :src="previewUrl" />
          <div v-else class="shot__empty">拍照后自动进行 AI 匹配</div>
          <div class="shot__actions">
            <van-button size="small" type="primary" icon="photograph" @click="$refs.camera.click()">
              拍照
            </van-button>
            <van-button size="small" plain type="primary" icon="records" @click="$refs.gallery.click()">
              相册
            </van-button>
          </div>
        </div>
        <input ref="camera" type="file" accept="image/*" capture="environment" hidden @change="onCamera" />
        <input ref="gallery" type="file" accept="image/*" hidden @change="onGallery" />
      </div>

      <van-cell-group inset>
        <van-field v-model="title" label="名称" placeholder="如：黑色自动伞" maxlength="20" />
        <van-field
          :model-value="textOf(CATEGORIES, category)"
          label="类别"
          readonly
          is-link
          placeholder="必选"
          @click="openPicker('category')"
        />
        <van-field
          :model-value="color || '未选'"
          label="颜色"
          readonly
          is-link
          @click="openPicker('color')"
        />
        <van-field
          :model-value="placeTag || '未选'"
          label="地点"
          readonly
          is-link
          @click="openPicker('place')"
        />
        <van-field label="定位" readonly>
          <template #button>
            <van-tag v-if="geo" type="success">已定位 {{ geo.lat }}, {{ geo.lng }}</van-tag>
            <van-button size="small" icon="location-o" @click="locate">获取位置</van-button>
          </template>
        </van-field>
        <van-field
          v-model="secret"
          label="验证暗号"
          placeholder="选填，如：伞柄有熊猫贴纸"
          maxlength="30"
        />
      </van-cell-group>

      <div class="submit">
        <van-button type="primary" round block :loading="submitting" loading-text="匹配中..." @click="submit">
          发布并自动匹配
        </van-button>
      </div>
    </div>

    <van-popup v-model:show="showPicker" round position="bottom">
      <van-picker
        :columns="pickerColumns"
        :title="pickerMap[pickerField]?.label"
        @confirm="onPickerConfirm"
        @cancel="showPicker = false"
      />
    </van-popup>

    <van-dialog
      v-model:show="showResult"
      :show-cancel-button="false"
      confirm-button-text="完成"
      @confirm="goHome"
    >
      <template #title>
        <div class="result__title">{{ resultMatches.length ? '发现疑似匹配!' : '发布成功' }}</div>
      </template>
      <div class="result">
        <template v-if="resultMatches.length">
          <div
            v-for="m in resultMatches"
            :key="m.post.id"
            class="result__item"
            @click="goMatch"
          >
            <img class="result__thumb" :src="m.post._url || m.post.thumbDataUrl" />
            <div class="result__info">
              <div class="result__name van-ellipsis">{{ m.post.title }}</div>
              <div class="result__dist">
                <van-tag type="success">相似度匹配 · 距离 {{ m.distance }}</van-tag>
              </div>
            </div>
          </div>
          <div class="result__tip">已在「匹配中心」生成记录，点击卡片查看</div>
        </template>
        <template v-else>
          <div class="result__none">暂未找到相似物品，有新匹配时会出现在「匹配中心」</div>
        </template>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.form {
  padding: 12px;
}
.block {
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}
.block__label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.shot__preview {
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 8px;
  background: #f2f3f5;
}
.shot__empty {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #969799;
  font-size: 13px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 10px;
}
.shot__actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.submit {
  margin-top: 20px;
}
.result {
  padding: 8px 16px 16px;
  max-height: 300px;
  overflow: auto;
}
.result__title {
  padding-top: 6px;
  font-weight: 600;
}
.result__item {
  display: flex;
  gap: 10px;
  align-items: center;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px;
  margin-top: 8px;
}
.result__thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
}
.result__info {
  min-width: 0;
}
.result__name {
  font-size: 14px;
  font-weight: 600;
}
.result__dist {
  margin-top: 4px;
}
.result__tip {
  margin-top: 10px;
  font-size: 12px;
  color: #969799;
  text-align: center;
}
.result__none {
  padding: 20px 0;
  font-size: 13px;
  color: #969799;
  text-align: center;
}
</style>
