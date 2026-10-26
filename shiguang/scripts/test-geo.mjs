import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const context = browser.defaultBrowserContext()
await context.overridePermissions('http://localhost:5173', ['geolocation'])

const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
await page.setGeolocation({ latitude: 39.9042, longitude: 116.4074 })

await page.goto('http://localhost:5173/#/publish', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))

// tap 获取位置
await page.evaluate(() => {
  const fields = [...document.querySelectorAll('.van-field')]
  const f = fields.find(x => x.querySelector('.van-field__label')?.textContent === '定位')
  const btn = [...f.querySelectorAll('.van-button')].find(b => b.textContent.includes('获取位置'))
  btn?.click()
})
await new Promise(r => setTimeout(r, 1500))
const geoTag = await page.evaluate(() => {
  const fields = [...document.querySelectorAll('.van-field')]
  const f = fields.find(x => x.querySelector('.van-field__label')?.textContent === '定位')
  return f?.querySelector('.van-tag')?.textContent || null
})
console.log('geo tag:', geoTag)

// image + title + category
const inputs = await page.$$('input[type=file]')
await inputs[1].uploadFile('C:\\Users\\33298\\AppData\\Local\\Temp\\opencode\\valid.jpg')
await new Promise(r => setTimeout(r, 600))
await page.type('.van-field input[placeholder="如：黑色自动伞"]', '带定位的发布')
await page.evaluate(() => {
  const fields = [...document.querySelectorAll('.van-field')]
  fields.find(x => x.querySelector('.van-field__label')?.textContent === '类别')
    ?.querySelector('.van-field__control')?.click()
})
await new Promise(r => setTimeout(r, 500))
await page.evaluate(() => {
  ;[...document.querySelectorAll('.van-picker__confirm')]
    .find(x => getComputedStyle(x).display !== 'none')?.click()
})
await new Promise(r => setTimeout(r, 400))

await page.evaluate(() => {
  ;[...document.querySelectorAll('.van-button')]
    .find(x => x.textContent.includes('发布并自动匹配'))?.click()
})
await new Promise(r => setTimeout(r, 4000))

const dialog = await page.evaluate(() => {
  const d = [...document.querySelectorAll('.van-dialog')].find(
    x => getComputedStyle(x).display !== 'none'
  )
  return d ? d.textContent.slice(0, 50) : null
})
console.log('dialog:', dialog)

const last = await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const req = indexedDB.open('ShiGuangDB')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
  return await new Promise(res => {
    const tx = db.transaction('posts', 'readonly')
    const req = tx.objectStore('posts').getAll()
    req.onsuccess = () => {
      const p = req.result.at(-1)
      res({ title: p?.title, geo: p?.geo, phashLen: p?.phash?.length, hasBlob: p?.imageBlob instanceof Blob })
    }
  })
})
console.log('last post:', JSON.stringify(last))
console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
