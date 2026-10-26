import { db } from '../db'
import { computePhash, hamming, MATCH_THRESHOLD } from './phash'

const THEME = {
  umbrella: { bg: '#2563eb', glyph: '伞' },
  keys: { bg: '#d97706', glyph: '钥' },
  card: { bg: '#059669', glyph: '卡' },
  electronics: { bg: '#0284c7', glyph: '机' },
  cup: { bg: '#7c3aed', glyph: '杯' },
  book: { bg: '#dc2626', glyph: '书' },
  bag: { bg: '#92400e', glyph: '包' },
  clothes: { bg: '#64748b', glyph: '衣' },
  jewelry: { bg: '#db2777', glyph: '饰' },
  other: { bg: '#475569', glyph: '物' },
}

const hour = 3600 * 1000
const MIN = 60 * 1000
const CAMPUS_GEO = { lat: 39.96912, lng: 116.31851 }

async function makeImage(text, bg, tilt = 0, offset = 0) {
  const c = document.createElement('canvas')
  c.width = 640
  c.height = 480
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#e8ecf2'
  ctx.fillRect(0, 0, 640, 480)
  ctx.save()
  ctx.translate(320 + offset, 240 + offset)
  ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(0,0,0,.25)'
  ctx.shadowBlur = 24
  ctx.fillStyle = bg
  ctx.fillRect(-150, -95, 300, 190)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 96px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 6)
  ctx.restore()
  return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85))
}

async function toThumb(blob) {
  const bitmap = await createImageBitmap(blob)
  const thumb = document.createElement('canvas')
  thumb.width = 240
  thumb.height = 180
  thumb.getContext('2d').drawImage(bitmap, 0, 0, 240, 180)
  bitmap.close?.()
  return thumb.toDataURL('image/jpeg', 0.7)
}

async function addSeed(post) {
  if (!post.imageBlob) {
    const { bg, glyph } = THEME[post.category]
    post.imageBlob = await makeImage(glyph, bg, post.tilt || 0, post.offset || 0)
    post.phash = await computePhash(post.imageBlob)
  }
  post.thumbDataUrl = await toThumb(post.imageBlob)
  delete post.tilt
  delete post.offset
  if (post.claimPhoto === undefined) post.claimPhoto = null
  return db.posts.add(post)
}

async function addClaimedSeed(post, { answer, closed = false }) {
  const { bg, glyph } = THEME[post.category]
  const claimBlob = await makeImage(glyph, bg, 0, 0)
  const id = await addSeed(post)
  const full = await db.posts.get(id)
  const updates = {
    claimPhoto: claimBlob,
    claimAnswer: answer,
    claimDistance: hamming(full.phash, await computePhash(claimBlob)),
    claimedAt: post.createdAt + 2 * hour,
  }
  if (closed) updates.closedAt = post.createdAt + 3 * hour
  await db.posts.update(id, updates)
  return id
}

async function addTwin(foundId, lostPost) {
  const found = await db.posts.get(foundId)
  const { bg, glyph } = THEME[lostPost.category]
  const candidates = [0.06, 0.055, 0.065, 0.048, 0.07, 0.075, 0.085, 0.1, 0]
  let fallback = null
  let pick = null
  for (const tilt of candidates) {
    const blob = await makeImage(glyph, bg, tilt, 0)
    const phash = await computePhash(blob)
    const d = hamming(found.phash, phash)
    if (d > 0 && d <= MATCH_THRESHOLD) {
      pick = { blob, phash, distance: d }
      break
    }
    if (d === 0 && !fallback) fallback = { blob, phash, distance: 0 }
  }
  if (!pick) pick = fallback
  lostPost.imageBlob = pick.blob
  lostPost.phash = pick.phash
  const id = await addSeed(lostPost)
  await db.matchLogs.add({
    postId: id,
    matchId: foundId,
    distance: pick.distance,
    createdAt: lostPost.createdAt + 30 * MIN,
  })
  return id
}

export async function seedIfEmpty() {
  const count = await db.posts.count()
  if (count > 0) return
  const now = Date.now()

  // ---- 普通进行中 ----
  const umbrellaFound = await addSeed({
    type: 'found', title: '捡到一把黑色长柄伞', category: 'umbrella', color: '黑色',
    placeTag: '图书馆', status: 'open', isMine: false, createdAt: now - 26 * hour,
    tilt: 0.05, offset: 0,
  })
  const keysFound = await addSeed({
    type: 'found', title: '食堂二楼捡到一串钥匙', category: 'keys', color: '银色',
    placeTag: '食堂', status: 'open', isMine: false, createdAt: now - 8 * hour,
  })
  const cupFound = await addSeed({
    type: 'found', title: '操场看台捡到紫色水杯', category: 'cup', color: '紫色',
    placeTag: '操场', status: 'open', isMine: false, createdAt: now - 3 * hour,
  })
  await addSeed({ type: 'found', title: '捡到一本高数课本', category: 'book', color: '红色', placeTag: '教学楼', status: 'open', isMine: false, createdAt: now - 1 * hour })
  await addSeed({ type: 'found', title: '三教捡到蓝牙耳机（左耳）', category: 'electronics', color: '蓝色', placeTag: '教学楼', status: 'open', isMine: false, createdAt: now - 30 * MIN, geo: { ...CAMPUS_GEO } })
  await addSeed({ type: 'lost', title: '白色 iPad 丢失，内有笔记', category: 'electronics', color: '白色', placeTag: '图书馆', status: 'open', isMine: false, createdAt: now - 45 * MIN })
  await addSeed({ type: 'lost', title: '棕色钱包丢失，内有身份证', category: 'bag', color: '棕色', placeTag: '食堂', status: 'open', isMine: false, createdAt: now - 2 * hour })
  await addSeed({ type: 'found', title: '操场捡到灰色连帽卫衣', category: 'clothes', color: '灰色', placeTag: '操场', status: 'open', isMine: false, createdAt: now - 4 * hour })
  await addSeed({ type: 'found', title: '体育馆捡到银色细手链', category: 'jewelry', color: '银色', placeTag: '体育馆', status: 'open', isMine: false, createdAt: now - 7 * hour })
  await addSeed({ type: 'lost', title: '黄色棒球帽丢在球场了', category: 'clothes', color: '黄色', placeTag: '操场', status: 'open', isMine: false, createdAt: now - 12 * hour })
  await addSeed({ type: 'found', title: '宿舍楼下捡到粉色小水杯', category: 'cup', color: '粉色', placeTag: '宿舍', status: 'open', isMine: false, createdAt: now - 5 * hour })
  await addSeed({ type: 'lost', title: '黑色双肩包丢失，内有电脑', category: 'bag', color: '黑色', placeTag: '路上', status: 'open', isMine: false, createdAt: now - 18 * hour })
  await addSeed({ type: 'found', title: '捡到黑框眼镜一副', category: 'other', color: '黑色', placeTag: '其他', status: 'open', isMine: false, createdAt: now - 36 * hour })
  await addSeed({ type: 'lost', title: '彩色文具袋丢失，内有笔记', category: 'other', color: '其他', placeTag: '教学楼', status: 'open', isMine: false, createdAt: now - 15 * hour })
  await addSeed({ type: 'lost', title: '蓝色校园卡不见了，急用', category: 'card', color: '蓝色', placeTag: '图书馆', status: 'open', isMine: false, createdAt: now - 5 * hour })

  // ---- 我的（演示用） ----
  await addSeed({
    type: 'lost', title: '我的蓝色运动水杯丢了', category: 'cup', color: '蓝色',
    placeTag: '体育馆', status: 'open', isMine: true, createdAt: now - 6 * hour,
    secret: '杯底有一道裂痕',
  })
  await addSeed({
    type: 'found', title: '校门口捡到粉色折叠伞', category: 'umbrella', color: '粉色',
    placeTag: '校门口', status: 'open', isMine: true, createdAt: now - 9 * hour,
  })

  // ---- 匹配对（真实计算距离） ----
  await addTwin(umbrellaFound, {
    type: 'lost', title: '黑色自动伞丢在自习室了', category: 'umbrella', color: '黑色',
    placeTag: '教学楼', status: 'open', isMine: false, createdAt: now - 20 * hour,
  })
  await addTwin(keysFound, {
    type: 'lost', title: '一串银色钥匙丢在体育馆', category: 'keys', color: '银色',
    placeTag: '体育馆', status: 'open', isMine: false, createdAt: now - 10 * hour,
  })
  await addTwin(cupFound, {
    type: 'lost', title: '紫色保温杯找不到了', category: 'cup', color: '紫色',
    placeTag: '教学楼', status: 'open', isMine: false, createdAt: now - 2.5 * hour,
  })

  // ---- 待确认（可演示发布者审核面板） ----
  await addClaimedSeed(
    {
      type: 'found', title: '宿舍楼下捡到绿色保温杯', category: 'cup', color: '绿色',
      placeTag: '宿舍', status: 'pending', isMine: true, createdAt: now - 10 * hour,
      secret: '杯底有一只猫的贴纸',
    },
    { answer: '杯底有一只猫的贴纸' }
  )
  await addClaimedSeed(
    {
      type: 'found', title: '校门口捡到蓝色饭卡一张', category: 'card', color: '蓝色',
      placeTag: '校门口', status: 'pending', isMine: true, createdAt: now - 22 * hour,
      secret: '卡号尾号是 2014',
    },
    { answer: '卡号尾号是 2014' }
  )

  // ---- 已完成（沉底展示） ----
  await addClaimedSeed(
    {
      type: 'found', title: '校门口捡到饭卡，已归还', category: 'card', color: '蓝色',
      placeTag: '校门口', status: 'closed', isMine: false, createdAt: now - 50 * hour,
      secret: '卡面右下角有星星贴纸',
    },
    { answer: '卡面右下角有星星贴纸', closed: true }
  )
  await addClaimedSeed(
    {
      type: 'found', title: '黑色钱包已物归原主', category: 'bag', color: '黑色',
      placeTag: '图书馆', status: 'closed', isMine: false, createdAt: now - 70 * hour,
      secret: '钱包夹层有公交卡',
    },
    { answer: '钱包夹层有公交卡', closed: true }
  )
}
