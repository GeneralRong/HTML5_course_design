import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 2000))

// close two seed posts directly in IDB
const closedCount = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('ShiGuangDB')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return await new Promise(res => {
    const tx = db.transaction('posts', 'readwrite')
    const store = tx.objectStore('posts')
    const req = store.getAll()
    req.onsuccess = () => {
      const targets = req.result.filter(p => p.status === 'open').slice(0, 2)
      targets.forEach(p => store.put({ ...p, status: 'closed' }))
      res(targets.length)
    }
  })
})
console.log('closed seed posts:', closedCount)

await page.reload({ waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 2000))

const order = await page.evaluate(() =>
  [...document.querySelectorAll('.card')].map(c => {
    const tags = [...c.querySelectorAll('.van-tag')]
    const statusTag = tags.at(-1)
    return statusTag?.textContent.trim()
  })
)
console.log('status order in list:', JSON.stringify(order))
const firstClosed = order.indexOf('已完成')
console.log('first 已完成 at index:', firstClosed, '/ total', order.length)
console.log(
  'all completed at bottom:',
  firstClosed === -1 || order.slice(firstClosed).every(s => s === '已完成')
)
console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
