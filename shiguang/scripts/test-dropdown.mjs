import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 2000))

const titles = await page.evaluate(() =>
  [...document.querySelectorAll('.van-dropdown-menu__title')].map(t => t.textContent.trim())
)
console.log('dropdown titles:', JSON.stringify(titles))

// click the place dropdown
await page.evaluate(() => {
  ;[...document.querySelectorAll('.van-dropdown-menu__title')]
    .find(t => t.textContent.includes('地点'))?.click()
})
await new Promise(r => setTimeout(r, 800))
const options = await page.evaluate(() =>
  [...document.querySelectorAll('.van-dropdown-item__option')].map(o => o.textContent.trim())
)
console.log('place options:', JSON.stringify(options))

// also check category dropdown
await page.evaluate(() => {
  ;[...document.querySelectorAll('.van-dropdown-menu__title')]
    .find(t => t.textContent.includes('类别'))?.click()
})
await new Promise(r => setTimeout(r, 800))
const catOpts = await page.evaluate(() =>
  [...document.querySelectorAll('.van-dropdown-item__option')].map(o => o.textContent.trim())
)
console.log('category options:', JSON.stringify(catOpts))
console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
