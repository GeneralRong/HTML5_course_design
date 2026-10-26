export async function decodeImage(blob) {
  try {
    return await createImageBitmap(blob)
  } catch (e) {
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } catch (e2) {
      throw new Error('IMAGE_DECODE_FAILED')
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

async function drawScaled(blob, maxDim, type, quality) {
  const source = await decodeImage(blob)
  const w0 = source.width || source.videoWidth
  const h0 = source.height || source.videoHeight
  const scale = Math.min(1, maxDim / Math.max(w0, h0))
  const w = Math.round(w0 * scale)
  const h = Math.round(h0 * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(source, 0, 0, w, h)
  source.close?.()
  if (type === 'dataurl') return canvas.toDataURL('image/jpeg', quality)
  return await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', quality))
}

export function compressImage(blob, maxDim = 1280, quality = 0.82) {
  return drawScaled(blob, maxDim, 'blob', quality)
}

export function makeThumb(blob, dim = 360, quality = 0.7) {
  return drawScaled(blob, dim, 'dataurl', quality)
}
