import puppeteer from 'puppeteer-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const badPng = 'C:\\Users\\33298\\AppData\\Local\\Temp\\opencode\\test.png'

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox'],
})

const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:5173/#/publish', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))

async function fillAndSubmit(file, title) {
  const inputs = await page.$$('input[type=file]')
  await inputs[1].uploadFile(file)
  await new Promise(r => setTimeout(r, 600))
  await page.type('.van-field input[placeholder="如：黑色自动伞"]', title)
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
}

// case 1: createImageBitmap-incompatible image -> should publish via <img> fallback
await fillAndSubmit(badPng, '坏图测试')
await new Promise(r => setTimeout(r, 3000))
let dialog1 = await page.evaluate(() => {
  const d = [...document.querySelectorAll('.van-dialog')].find(
    x => getComputedStyle(x).display !== 'none'
  )
  return d ? d.textContent.slice(0, 40) : null
})
let toast1 = await page.evaluate(() =>
  [...document.querySelectorAll('.van-toast')].map(t => t.textContent).join(' | ') || null
)
console.log('case1 dialog:', dialog1, '| toast:', toast1)

// full reload to reset form state
await page.goto('about:blank')
await page.goto('http://localhost:5173/#/publish', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))

// case 2: valid image -> expect result dialog
await fillAndSubmit('C:\\Users\\33298\\AppData\\Local\\Temp\\opencode\\valid.jpg', '好图测试')
await new Promise(r => setTimeout(r, 4000))
const dialog = await page.evaluate(() => {
  const d = [...document.querySelectorAll('.van-dialog')].find(
    x => getComputedStyle(x).display !== 'none'
  )
  return d ? d.textContent.slice(0, 80) : null
})
console.log('case2 dialog:', dialog)
console.log('--- pageerrors ---')
console.log(errors.length ? errors.join('\n') : '(none)')
await browser.close()
