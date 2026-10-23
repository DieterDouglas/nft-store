import sharp from 'sharp'
// Extracts NFT artwork from the Figma home export (2880px wide). Usage: node scripts/extract-assets.mjs <home.png> public/nfts
const src = process.argv[2], out = process.argv[3]
const s = 3.669
// [name, x, y, w, h] in display coords (785px wide preview), inset to skip rounded corners
const crops = [
  ['emerald', 478, 59, 238, 238],
  ['sage', 426, 398, 128, 128],
  ['ivory', 585, 397, 128, 128],
  ['golden', 267, 859, 128, 128],
]
for (const [name, x, y, w, h] of crops) {
  await sharp(src)
    .extract({ left: Math.round(x * s), top: Math.round(y * s), width: Math.round(w * s), height: Math.round(h * s) })
    .resize(600, 600)
    .webp({ quality: 82 })
    .toFile(`${out}/${name}.webp`)
}
console.log('done')
