import Dexie from 'dexie'

export const db = new Dexie('ShiGuangDB')

db.version(1).stores({
  posts: '++id, type, category, color, placeTag, status, createdAt, isMine',
  matchLogs: '++id, postId, matchId, createdAt',
})
