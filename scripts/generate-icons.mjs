/**
 * generate-icons.mjs
 * Creates PNG icons for the Chrome extension using only Node.js built-ins.
 * Output: public/icons/icon{16,32,48,128}.png
 */
import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '../public/icons')
mkdirSync(ICONS_DIR, { recursive: true })

// ── CRC32 ──────────────────────────────────────────────────────
function makeCRCTable() {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c
  }
  return table
}
const CRC_TABLE = makeCRCTable()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

// ── PNG chunk ──────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = crc32(Buffer.concat([typeBytes, data]))
  const crcBytes = Buffer.alloc(4)
  crcBytes.writeUInt32BE(crcBuf)
  return Buffer.concat([len, typeBytes, data, crcBytes])
}

// ── Generate PNG from RGBA pixel callback ──────────────────────
function makePNG(size, getPixel) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  // ihdr[10..12] = 0 (compression, filter, interlace)

  // Raw pixel data
  const raw = Buffer.alloc(size * (1 + size * 4))
  let off = 0
  for (let y = 0; y < size; y++) {
    raw[off++] = 0 // filter byte
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = getPixel(x, y, size)
      raw[off++] = r; raw[off++] = g; raw[off++] = b; raw[off++] = a
    }
  }

  const compressed = zlib.deflateSync(raw)

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Icon pixel function ────────────────────────────────────────
function iconPixel(x, y, size) {
  const nx = x / size   // 0..1
  const ny = y / size   // 0..1
  const cx = nx - 0.5  // -0.5..0.5
  const cy = ny - 0.5  // -0.5..0.5

  // Rounded rect mask (radius 0.22)
  const R = 0.22
  const ax = Math.abs(cx), ay = Math.abs(cy)
  const inRect = ax < 0.5 && ay < 0.5
  const inCorner = ax > (0.5 - R) && ay > (0.5 - R)
  const cornerDist = Math.sqrt((ax - (0.5 - R)) ** 2 + (ay - (0.5 - R)) ** 2)
  if (!inRect || (inCorner && cornerDist > R)) return [0, 0, 0, 0] // transparent

  // Background gradient: deep navy #080c16 → slightly lighter #121830
  const t = (nx + ny) * 0.5
  const bgR = Math.round(8 + t * 10)
  const bgG = Math.round(12 + t * 12)
  const bgB = Math.round(22 + t * 20)

  // ── Draw a briefcase shape ──
  // Briefcase body: centered rectangle from (0.15,0.35) to (0.85,0.82)
  const bx1 = 0.15, by1 = 0.35, bx2 = 0.85, by2 = 0.82
  // Handle: (0.35,0.25) to (0.65,0.35)
  const hx1 = 0.35, hy1 = 0.25, hx2 = 0.65, hy2 = 0.35
  // Handle hole inner (0.38,0.27) to (0.62,0.33)
  const hi1x = 0.38, hi1y = 0.27, hi2x = 0.62, hi2y = 0.33

  const inBody = nx >= bx1 && nx <= bx2 && ny >= by1 && ny <= by2
  const inHandle = nx >= hx1 && nx <= hx2 && ny >= hy1 && ny <= hy2
  const inHoleInner = nx >= hi1x && nx <= hi2x && ny >= hi1y && ny <= hi2y

  const inBriefcase = (inBody || (inHandle && !inHoleInner))

  // ── Draw lightning bolt on briefcase ──
  // Simplified bolt: two triangles forming ⚡
  // Upper part: from (0.58,0.42) to (0.42,0.60)
  // Lower part: from (0.55,0.58) to (0.38,0.76)
  const boltColor = [255, 255, 255]
  let onBolt = false

  function lineProximity(px, py, x1, y1, x2, y2, w) {
    const dx = x2 - x1, dy = y2 - y1
    const len2 = dx * dx + dy * dy
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
    const projX = x1 + t * dx, projY = y1 + t * dy
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2) <= w
  }

  const lw = size < 32 ? 0.065 : 0.055
  if (inBody) {
    // Upper bolt stroke
    if (lineProximity(nx, ny, 0.58, 0.44, 0.46, 0.60, lw)) onBolt = true
    // Middle bar
    if (nx >= 0.42 && nx <= 0.60 && ny >= 0.565 && ny <= 0.575 + lw) onBolt = true
    // Lower bolt stroke
    if (lineProximity(nx, ny, 0.54, 0.585, 0.42, 0.76, lw)) onBolt = true
  }

  if (onBolt) {
    // Yellow/white gradient bolt
    const boltT = (ny - 0.44) / (0.76 - 0.44)
    const r = Math.round(255 - boltT * 20)
    const g = Math.round(255 - boltT * 30)
    const b = Math.round(200 - boltT * 50)
    return [r, g, b, 255]
  }

  if (inBriefcase) {
    // Indigo gradient for briefcase body
    const bT = (nx - bx1) / (bx2 - bx1)
    const bV = (ny - by1) / (by2 - by1)
    const r = Math.round(99 + bT * 40)    // 99 → 139 (indigo → purple R)
    const g = Math.round(102 - bT * 10)   // 102 → 92
    const b = Math.round(241 - bV * 100)  // 241 → 141
    return [r, g, b, 255]
  }

  return [bgR, bgG, bgB, 255]
}

// ── Generate all sizes ─────────────────────────────────────────
const SIZES = [16, 32, 48, 128]

for (const size of SIZES) {
  const png = makePNG(size, iconPixel)
  const path = join(ICONS_DIR, `icon${size}.png`)
  const ws = createWriteStream(path)
  ws.write(png)
  ws.end()
  console.log(`✓ Generated icons/icon${size}.png (${png.length} bytes)`)
}
