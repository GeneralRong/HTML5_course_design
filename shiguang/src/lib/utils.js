export function fmtTime(ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function blobUrl(blob) {
  return URL.createObjectURL(blob)
}

export function orderPosts(posts) {
  const active = posts.filter(p => p.status !== 'closed')
  const closed = posts.filter(p => p.status === 'closed')
  return [...active, ...closed]
}
