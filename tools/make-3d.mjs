/**
 * 캐릭터 PNG → AR용 3D 파일 (GLB + USDZ)
 *
 *   npm run ar
 *
 * 왜 두 가지인가
 *   안드로이드 Scene Viewer 는 GLB 를, iOS AR Quick Look 은 USDZ 를 받습니다.
 *   둘 다 OS가 바닥 인식을 대신 해주므로 우리가 SLAM을 구현할 필요가 없습니다.
 *
 * 만드는 모양
 *   캐릭터를 잘라 세운 "입간판(standee)" 한 장입니다. 양면으로 보이게 하고
 *   바닥(y=0)에 서도록 원점을 발밑에 둡니다. 상자 캐릭터라 정면 컷만으로도
 *   충분히 그럴듯하고, 무엇보다 지금 가진 투명 PNG만으로 만들 수 있습니다.
 *
 * 라이브러리를 쓰지 않는 이유
 *   glTF는 JSON + 이진 덩어리, USDZ는 무압축 ZIP입니다. 둘 다 직접 쓰는 편이
 *   의존성을 늘리는 것보다 안전합니다. (행사까지 9일입니다)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { CHARACTERS } from '../src/data/characters.js'

const OUT = 'public/ar'
const HEIGHT_M = 0.45 // 실제 공간에서 세워질 높이 (45cm)
const TEX_MAX = 512 // 텍스처 한 변 최대 — AR에서 이 이상은 낭비입니다

await mkdir(OUT, { recursive: true })

/* ── glTF(GLB) ──────────────────────────────────────────── */

function pad4(n) {
  return (4 - (n % 4)) % 4
}

function buildGLB(png, halfW, h) {
  // 정점: 발밑이 y=0, 정면은 +Z를 바라봅니다.
  const positions = new Float32Array([
    -halfW, 0, 0,
    halfW, 0, 0,
    halfW, h, 0,
    -halfW, h, 0,
  ])
  // glTF의 UV는 좌상단이 (0,0)입니다.
  const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])

  const parts = []
  let offset = 0
  const view = (buf, target) => {
    const pad = pad4(offset)
    if (pad) {
      parts.push(Buffer.alloc(pad))
      offset += pad
    }
    const v = { buffer: 0, byteOffset: offset, byteLength: buf.length }
    if (target) v.target = target
    parts.push(Buffer.from(buf))
    offset += buf.length
    return v
  }

  const vPos = view(Buffer.from(positions.buffer), 34962)
  const vUv = view(Buffer.from(uvs.buffer), 34962)
  const vIdx = view(Buffer.from(indices.buffer), 34963)
  const vImg = view(png)

  const bin = Buffer.concat(parts)

  const json = {
    asset: { version: '2.0', generator: 'popkuz' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'popkku' }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, TEXCOORD_0: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0,
          roughnessFactor: 0.9,
        },
        alphaMode: 'BLEND',
        doubleSided: true,
      },
    ],
    textures: [{ sampler: 0, source: 0 }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    images: [{ bufferView: 3, mimeType: 'image/png' }],
    bufferViews: [vPos, vUv, vIdx, vImg],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        min: [-halfW, 0, 0],
        max: [halfW, h, 0],
      },
      { bufferView: 1, componentType: 5126, count: 4, type: 'VEC2' },
      { bufferView: 2, componentType: 5123, count: 6, type: 'SCALAR' },
    ],
    buffers: [{ byteLength: bin.length }],
  }

  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
  const jsonPad = Buffer.alloc(pad4(jsonBuf.length), 0x20) // 공백으로 채움
  const binPad = Buffer.alloc(pad4(bin.length), 0)

  const jsonChunk = Buffer.concat([jsonBuf, jsonPad])
  const binChunk = Buffer.concat([bin, binPad])

  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0) // "glTF"
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8)

  const jsonHead = Buffer.alloc(8)
  jsonHead.writeUInt32LE(jsonChunk.length, 0)
  jsonHead.writeUInt32LE(0x4e4f534a, 4) // "JSON"

  const binHead = Buffer.alloc(8)
  binHead.writeUInt32LE(binChunk.length, 0)
  binHead.writeUInt32LE(0x004e4942, 4) // "BIN\0"

  return Buffer.concat([header, jsonHead, jsonChunk, binHead, binChunk])
}

/* ── USDZ ───────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function usda(halfW, h, texName) {
  // USD는 Y축이 위, 단위는 미터입니다. 발밑을 원점에 둡니다.
  return `#usda 1.0
(
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root"
{
    def Mesh "Card"
    {
        uniform bool doubleSided = 1
        float3[] extent = [(${-halfW}, 0, 0), (${halfW}, ${h}, 0)]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        point3f[] points = [(${-halfW}, 0, 0), (${halfW}, 0, 0), (${halfW}, ${h}, 0), (${-halfW}, ${h}, 0)]
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        rel material:binding = </Root/Mat>
        uniform token subdivisionScheme = "none"
    }

    def Material "Mat"
    {
        token outputs:surface.connect = </Root/Mat/Surface.outputs:surface>

        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Root/Mat/Tex.outputs:rgb>
            float inputs:opacity.connect = </Root/Mat/Tex.outputs:a>
            float inputs:metallic = 0
            float inputs:roughness = 0.9
            token outputs:surface
        }

        def Shader "Tex"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @${texName}@
            float2 inputs:st.connect = </Root/Mat/UV.outputs:result>
            token inputs:wrapS = "clamp"
            token inputs:wrapT = "clamp"
            float3 outputs:rgb
            float outputs:a
        }

        def Shader "UV"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            uniform token inputs:varname = "st"
            float2 outputs:result
        }
    }
}
`
}

/**
 * USDZ = 무압축 ZIP.
 * 애플은 각 파일의 실제 데이터가 64바이트 경계에서 시작하기를 요구합니다.
 * 로컬 헤더의 extra 필드를 늘려 그 위치를 맞춥니다.
 */
function buildUSDZ(files) {
  const chunks = []
  const central = []
  let offset = 0

  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8')
    const headerLen = 30 + nameBuf.length
    let extraLen = (64 - ((offset + headerLen) % 64)) % 64
    // extra 필드는 최소 4바이트(id 2 + size 2)가 필요합니다.
    if (extraLen > 0 && extraLen < 4) extraLen += 64

    const extra = Buffer.alloc(extraLen)
    if (extraLen >= 4) {
      extra.writeUInt16LE(0x1987, 0) // 임의의 id — 뷰어는 모르는 id를 무시합니다
      extra.writeUInt16LE(extraLen - 4, 2)
    }

    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0, 6) // flags
    local.writeUInt16LE(0, 8) // method = store
    local.writeUInt16LE(0, 10) // time
    local.writeUInt16LE(0, 12) // date
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(extraLen, 28)

    const localOffset = offset
    chunks.push(local, nameBuf, extra, data)
    offset += 30 + nameBuf.length + extraLen + data.length

    const cen = Buffer.alloc(46)
    cen.writeUInt32LE(0x02014b50, 0)
    cen.writeUInt16LE(20, 4) // version made by
    cen.writeUInt16LE(20, 6) // version needed
    cen.writeUInt16LE(0, 8)
    cen.writeUInt16LE(0, 10)
    cen.writeUInt16LE(0, 12)
    cen.writeUInt16LE(0, 14)
    cen.writeUInt32LE(crc, 16)
    cen.writeUInt32LE(data.length, 20)
    cen.writeUInt32LE(data.length, 24)
    cen.writeUInt16LE(nameBuf.length, 28)
    cen.writeUInt16LE(0, 30) // central extra len
    cen.writeUInt16LE(0, 32) // comment
    cen.writeUInt16LE(0, 34) // disk
    cen.writeUInt16LE(0, 36) // internal attrs
    cen.writeUInt32LE(0, 38) // external attrs
    cen.writeUInt32LE(localOffset, 42)
    central.push(cen, nameBuf)
  }

  const centralBuf = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(files.length, 8)
  end.writeUInt16LE(files.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([...chunks, centralBuf, end])
}

/* ── 실행 ───────────────────────────────────────────────── */

for (const c of CHARACTERS) {
  const src = `public/characters/${c.id}.webp`
  const png = await sharp(src)
    .resize({ width: TEX_MAX, height: TEX_MAX, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const meta = await sharp(png).metadata()

  const h = HEIGHT_M
  const halfW = +((HEIGHT_M * (meta.width / meta.height)) / 2).toFixed(4)

  const glb = buildGLB(png, halfW, h)
  await writeFile(path.join(OUT, `${c.id}.glb`), glb)

  const texName = `${c.id}.png`
  const usdz = buildUSDZ([
    { name: `${c.id}.usda`, data: Buffer.from(usda(halfW, h, texName), 'utf8') },
    { name: texName, data: png },
  ])
  await writeFile(path.join(OUT, `${c.id}.usdz`), usdz)

  console.log(
    `  ✓ ${c.name.padEnd(4)} ${c.id.padEnd(9)} glb ${String(Math.round(glb.length / 1024)).padStart(4)}KB · usdz ${String(
      Math.round(usdz.length / 1024)
    ).padStart(4)}KB · ${(halfW * 2 * 100).toFixed(0)}×${(h * 100).toFixed(0)}cm`
  )
}

console.log(`\n  ${CHARACTERS.length}종 생성 완료 → ${OUT}/\n`)
