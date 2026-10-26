import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

// wipe DB so new seeds regenerate
await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0' })
await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('ShiGuangDB')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  await new Promise(res => {
    const tx = db.transaction(['posts', 'matchLogs'], 'readwrite')
    tx.objectStore('posts').clear()
    tx.objectStore('matchLogs').clear()
    tx.oncomplete = res
  })
})

await page.reload({ waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 2500))

const stats = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('ShiGuangDB')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return await new Promise(res => {
    const tx = db.transaction('posts', 'readonly')
    const req = tx.objectStore('posts').getAll()
    req.onsuccess = () => {
      const posts = req.result
      res({
        total: posts.length,
        open: posts.filter(p => p.status === 'open').length,
        pending: posts.filter(p => p.status === 'pending').length,
        closed: posts.filter(p => p.status === 'closed').length,
        pendingIsMine: posts.find(p => p.status === 'pending')?.isMine,
        closedHasClaim: !!posts.find(p => p.status === 'closed')?.claimPhoto,
        claimDistances: posts.filter(p => p.claimDistance != null).map(p => p.claimDistance),
        categories: [...new Set(posts.map(p => p.category))],
      })
    }
  })
})
console.log('seed stats:', JSON.stringify(stats, null, 2))

const matchInfo = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('ShiGuangDB')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return await new Promise(res => {
    const tx = db.transaction('matchLogs', 'readonly')
    const req = tx.objectStore('matchLogs').getAll()
    req.onsuccess = () => res(req.result.map(l => l.distance))
  })
})
console.log('matchLog distances:', JSON.stringify(matchInfo))

// check home renders and closed at bottom
const order = await page.evaluate(() =>
  [...document.querySelectorAll('.card')].map(c => [...c.querySelectorAll('.van-tag')].at(-1)?.textContent.trim())
)
console.log('home status order:', JSON.stringify(order))
console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
