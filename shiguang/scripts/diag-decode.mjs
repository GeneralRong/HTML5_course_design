import puppeteer from 'puppeteer-core'
import { readFileSync } from 'fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => console.log('CONSOLE[' + m.type() + ']:', m.text()))

await page.goto('about:blank')
const b64 = readFileSync('C:\\Users\\33298\\AppData\\Local\\Temp\\opencode\\test.png').toString('base64')
const result = await page.evaluate(async b64 => {
  const res = await fetch('data:image/png;base64,' + b64)
  const blob = await res.blob()
  const out = {}
  try {
    const bmp = await createImageBitmap(blob)
    out.createImageBitmap = 'OK ' + bmp.width + 'x' + bmp.height
  } catch (e) {
    out.createImageBitmap = 'FAIL: ' + e.message
  }
  try {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    out.imgDecode = 'OK ' + img.naturalWidth + 'x' + img.naturalHeight
  } catch (e) {
    out.imgDecode = 'FAIL: ' + e.message
  }
  return out
}, b64)
console.log('decode results:', JSON.stringify(result))
console.log('pageerrors:', errors.length ? errors.join('\n') : '(none)')
await browser.close()
