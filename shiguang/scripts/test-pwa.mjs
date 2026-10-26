import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:4173'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

await page.goto(BASE + '/#/', { waitUntil: 'networkidle0' })

// wait for SW active
const swState = await page.waitForFunction(
  async () => {
    const reg = await navigator.serviceWorker?.getRegistration()
    return reg?.active ? 'active' : reg?.installing || reg?.waiting ? 'installing' : 'none'
  },
  { timeout: 15000, polling: 500 }
)
console.log('service worker:', await swState.jsonValue())

// manifest check
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel=manifest]')
  if (!link) return null
  const res = await fetch(link.href)
  const json = await res.json()
  return { name: json.name, icons: json.icons.length, display: json.display }
})
console.log('manifest:', JSON.stringify(manifest))

// precache count via caches API
const precache = await page.evaluate(async () => {
  const names = await caches.keys()
  const all = await Promise.all(names.map(async n => (await caches.open(n)).keys().length))
  return names.map((n, i) => `${n}: ${all[i]} entries`)
})
console.log('caches:', JSON.stringify(precache))

// offline reload test
await page.setOfflineMode(true)
await page.reload({ waitUntil: 'domcontentloaded' })
await new Promise(r => setTimeout(r, 2000))
const offline = await page.evaluate(() => ({
  title: document.title,
  hasApp: !!document.querySelector('#app .van-tabbar, #app .van-nav-bar, #app .van-tab'),
  cards: document.querySelectorAll('.card').length,
}))
console.log('offline render:', JSON.stringify(offline))
await page.setOfflineMode(false)

console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
