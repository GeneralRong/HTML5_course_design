const SIZE = 32
const LOW = 8

import { decodeImage } from './image'

function dct1d(vec) {
  const N = vec.length
  const out = new Float64Array(N)
  for (let k = 0; k < N; k++) {
    let sum = 0
    for (let n = 0; n < N; n++) {
      sum += vec[n] * Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N))
    }
    out[k] = sum
  }
  return out
}

function dct2d(matrix) {
  const N = matrix.length
  const rows = new Array(N)
  for (let i = 0; i < N; i++) rows[i] = dct1d(matrix[i])
  const cols = new Array(N)
  for (let j = 0; j < N; j++) {
    const col = new Float64Array(N)
    for (let i = 0; i < N; i++) col[i] = rows[i][j]
    cols[j] = dct1d(col)
  }
  return cols
}

export async function computePhash(blob) {
  const bitmap = await decodeImage(blob)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, SIZE, SIZE)
  bitmap.close?.()
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

  const gray = new Array(SIZE)
  for (let i = 0; i < SIZE; i++) {
    gray[i] = new Float64Array(SIZE)
    for (let j = 0; j < SIZE; j++) {
      const o = (i * SIZE + j) * 4
      gray[i][j] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
    }
  }

  const freq = dct2d(gray)
  const lows = []
  for (let i = 0; i < LOW; i++) {
    for (let j = 0; j < LOW; j++) lows.push(freq[j][i])
  }

  const sorted = [...lows].sort((a, b) => a - b)
  const median = sorted[32]
  let bits = ''
  for (let k = 0; k < 64; k++) bits += lows[k] > median ? '1' : '0'
  return bits
}

export function hamming(a, b) {
  let d = 0
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++
  return d
}

export const MATCH_THRESHOLD = 12
