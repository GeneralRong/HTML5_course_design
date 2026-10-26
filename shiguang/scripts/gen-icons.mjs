import puppeteer from 'puppeteer-core'
import { writeFileSync } from 'fs'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const OUT = 'C:\\Users\\33298\\Desktop\\DSA\\HTML5\\shiguang\\public'

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto('about:blank')

async function genIcon(size, { maskable = false } = {}) {
  return await page.evaluate(
    (size, maskable) => {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')

      const g = ctx.createLinearGradient(0, 0, size, size)
      g.addColorStop(0, '#3aa2ff')
      g.addColorStop(1, '#0f6fd6')
      ctx.fillStyle = g

      if (maskable) {
        ctx.fillRect(0, 0, size, size)
      } else {
        const r = size * 0.19
        ctx.beginPath()
        ctx.moveTo(r, 0)
        ctx.arcTo(size, 0, size, size, r)
        ctx.arcTo(size, size, 0, size, r)
        ctx.arcTo(0, size, 0, 0, r)
        ctx.arcTo(0, 0, size, 0, r)
        ctx.closePath()
        ctx.fill()
      }

      const inner = maskable ? size * 0.62 : size * 0.8
      const cx = size / 2
      const cy = size / 2

      // 胶囊图案：失物招领
      ctx.save()
      ctx.translate(cx, cy - inner * 0.08)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      const bw = inner * 0.82
      const bh = inner * 0.30
      const br = bh / 2
      ctx.moveTo(-bw / 2 + br, -bh / 2)
      ctx.arcTo(bw / 2, -bh / 2, bw / 2, bh / 2, br)
      ctx.arcTo(bw / 2, bh / 2, -bw / 2, bh / 2, br)
      ctx.arcTo(-bw / 2, bh / 2, -bw / 2, -bh / 2, br)
      ctx.arcTo(-bw / 2, -bh / 2, bw / 2, -bh / 2, br)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#0f6fd6'
      ctx.font = `bold ${bh * 0.62}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('拾光', 0, bh * 0.04)
      ctx.restore()

      // 底部小相机点
      ctx.beginPath()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.arc(cx, cy + inner * 0.3, inner * 0.055, 0, Math.PI * 2)
      ctx.fill()

      return c.toDataURL('image/png').split(',')[1]
    },
    size,
    maskable
  )
}

const jobs = [
  ['pwa-192x192.png', 192, false],
  ['pwa-512x512.png', 512, false],
  ['pwa-512x512-maskable.png', 512, true],
]
for (const [name, size, maskable] of jobs) {
  const b64 = await genIcon(size, { maskable })
  writeFileSync(`${OUT}\\${name}`, Buffer.from(b64, 'base64'))
  console.log('written', name)
}
await browser.close()
