// Builds web-optimised theme images and every app icon from design/orma-brain-source.png: `npm run icons`.
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'design/orma-brain-source.png')
const BG = '#050403'

async function out(file) {
  const target = path.join(root, file)
  await mkdir(path.dirname(target), { recursive: true })
  return target
}

// Full artwork (with the area labels) for splash, sign-in and website.
for (const width of [800, 1462]) {
  await sharp(source)
    .resize({ width })
    .webp({ quality: 84 })
    .toFile(await out(`public/brand/orma-brain-${width}.webp`))
}

// Full-bleed splash backdrop (desktop and phone sizes).
for (const width of [960, 1672]) {
  await sharp(path.join(root, 'design/orma-splash-source.png'))
    .resize({ width })
    .webp({ quality: 82 })
    .toFile(await out(`public/brand/orma-splash-${width}.webp`))
}

// Square crop of just the brain, clear of the label pills, for icons.
const crop = () => sharp(source).extract({ left: 410, top: 235, width: 670, height: 670 })

async function squareIcon(size, file, inset = 1) {
  const inner = Math.round(size * inset)
  const art = await crop().resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 3, background: BG } })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(await out(file))
}

await squareIcon(192, 'public/icons/icon-192.png')
await squareIcon(512, 'public/icons/icon-512.png')
await squareIcon(512, 'public/icons/icon-maskable-512.png', 0.78)
await squareIcon(180, 'public/icons/apple-touch-icon.png', 0.9)
await squareIcon(64, 'public/icons/favicon-64.png')
await squareIcon(1024, 'build/icon.png', 0.88)
console.log('Brand images and icons generated.')
