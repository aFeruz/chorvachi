// Ikonkalarni favicon.svg dan yaratish: PWA va Android uchun
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg', 'utf8')
const render = (size, src = svg) => new Resvg(src, { fitTo: { mode: 'width', value: size } }).render().asPng()

writeFileSync('public/icon-192.png', render(192))
writeFileSync('public/icon-512.png', render(512))

// Android: kvadrat (rx=0) foreground bilan
const square = svg.replace('rx="14"', 'rx="0"')
const round = svg.replace('rx="14"', 'rx="32"')
const res = 'android/app/src/main/res'
if (existsSync(res)) {
  const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
  for (const [d, s] of Object.entries(sizes)) {
    const dir = `${res}/mipmap-${d}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}/ic_launcher.png`, render(s))
    writeFileSync(`${dir}/ic_launcher_round.png`, render(s, round))
    // adaptive icon foreground: 108dp, kontent markazda 72dp
    const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-22 -22 108 108">${square.replace(/^<svg[^>]*>/, '').replace('</svg>', '')}</svg>`
    writeFileSync(`${dir}/ic_launcher_foreground.png`, render(Math.round(s * 1.5), fg))
  }
  console.log('android icons ok')
}
console.log('icons ok')

// Splash ekranlar: mavjud o'lchamda yashil fon + logo
import { readdirSync } from 'node:fs'
if (existsSync(res)) {
  for (const d of readdirSync(res).filter((x) => x.startsWith('drawable'))) {
    const p = `${res}/${d}/splash.png`
    if (!existsSync(p)) continue
    const buf = readFileSync(p)
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    const s = Math.min(w, h) * 0.32
    const inner = svg.replace(/^<svg[^>]*>/, '').replace('</svg>', '')
    const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" fill="#f5f5f4"/>
      <g transform="translate(${(w - s) / 2},${(h - s) / 2}) scale(${s / 64})">${inner}</g></svg>`
    writeFileSync(p, new Resvg(splash).render().asPng())
  }
  console.log('splash ok')
}
