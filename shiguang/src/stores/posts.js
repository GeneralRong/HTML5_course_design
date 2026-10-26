import { defineStore } from 'pinia'
import { db } from '../db'
import { hamming, MATCH_THRESHOLD } from '../lib/phash'

export const usePostsStore = defineStore('posts', {
  state: () => ({ posts: [] }),
  getters: {
    mine: s => s.posts.filter(p => p.isMine),
    stats: s => ({
      total: s.posts.length,
      open: s.posts.filter(p => p.status === 'open').length,
      closed: s.posts.filter(p => p.status === 'closed').length,
    }),
  },
  actions: {
    async load() {
      const posts = await db.posts.orderBy('createdAt').reverse().toArray()
      for (const p of posts) {
        p._url = p.thumbDataUrl || URL.createObjectURL(p.imageBlob)
      }
      this.posts = posts
    },
    async getById(id) {
      const p = await db.posts.get(id)
      if (p) p._url = p.imageBlob ? URL.createObjectURL(p.imageBlob) : p.thumbDataUrl
      return p
    },
    async findMatches(post) {
      const opposite = post.type === 'lost' ? 'found' : 'lost'
      const pool = await db.posts
        .where('type')
        .equals(opposite)
        .filter(p => p.status === 'open' && p.category === post.category && p.id !== post.id)
        .toArray()
      return pool
        .map(p => ({ post: p, distance: hamming(post.phash, p.phash) }))
        .filter(m => m.distance <= MATCH_THRESHOLD)
        .sort((a, b) => a.distance - b.distance)
    },
    async addPost(data) {
      const id = await db.posts.add(data)
      const post = { ...data, id }
      const matches = await this.findMatches(post)
      if (matches.length) {
        await db.matchLogs.bulkAdd(
          matches.map(m => ({
            postId: post.type === 'lost' ? id : m.post.id,
            matchId: post.type === 'lost' ? m.post.id : id,
            distance: m.distance,
            createdAt: Date.now(),
          }))
        )
      }
      await this.load()
      return { id, matches }
    },
    async applyClaim(id, { claimPhoto, claimAnswer, claimDistance }) {
      await db.posts.update(id, {
        status: 'pending',
        claimPhoto,
        claimAnswer,
        claimDistance,
        claimedAt: Date.now(),
      })
      await this.load()
    },
    async confirmClaim(id) {
      await db.posts.update(id, { status: 'closed', closedAt: Date.now() })
      await this.load()
    },
    async rejectClaim(id) {
      await db.posts.update(id, {
        status: 'open',
        claimPhoto: null,
        claimAnswer: '',
        claimDistance: null,
        claimedAt: null,
      })
      await this.load()
    },
    async remove(id) {
      await db.posts.delete(id)
      await db.matchLogs.where('postId').equals(id).delete()
      await db.matchLogs.where('matchId').equals(id).delete()
      await this.load()
    },
    async matchesFor(postId) {
      const logs = await db.matchLogs.where('postId').equals(postId).or('matchId').equals(postId).toArray()
      const out = []
      for (const log of logs) {
        const otherId = log.postId === postId ? log.matchId : log.postId
        const other = await db.posts.get(otherId)
        if (other) {
          other._url = other.thumbDataUrl || URL.createObjectURL(other.imageBlob)
          out.push({ log, other })
        }
      }
      return out.sort((a, b) => a.log.distance - b.log.distance)
    },
    async allLogs() {
      const logs = await db.matchLogs.orderBy('createdAt').reverse().toArray()
      const out = []
      for (const log of logs) {
        const a = await db.posts.get(log.postId)
        const b = await db.posts.get(log.matchId)
        if (a && b) {
          a._url = a.thumbDataUrl || URL.createObjectURL(a.imageBlob)
          b._url = b.thumbDataUrl || URL.createObjectURL(b.imageBlob)
          out.push({ ...log, post: a, match: b })
        }
      }
      return out
    },
    async clearAll() {
      await db.posts.clear()
      await db.matchLogs.clear()
      this.posts = []
    },
  },
})
