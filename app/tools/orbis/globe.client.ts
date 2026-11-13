import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DataTexture,
  DirectionalLight,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  RedFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { type Field, type FlowKind, Particles } from './flow'
import type { Heights, Surface } from './paint'

const PEAK_METRES = 9000
const EXAGGERATION = 0.025
const CLOSE_ENOUGH_FOR_DETAIL = 1.5

export type Look = { u: number; v: number; distance: number }

export type Tile = {
  key: string
  heights: Float32Array
  cells: number
  from: number
  to: number
  /** Where a cell centre of the tile lies on the map, as texture coordinates. */
  uv: (cx: number, cy: number) => [number, number]
  image: ImageData
}

export type Globe = {
  show(surface: Surface, ground: Heights): void
  light(declinationDegrees: number, subsolarU: number): void
  flow(kind: FlowKind, field: Field | null): void
  pick(clientX: number, clientY: number): { u: number; v: number } | null
  tile(tile: Tile): void
  hasTile(key: string): boolean
  clearTiles(): void
  facing(): number
  dispose(): void
}

function onSphere(u: number, v: number, radius: number): Vector3 {
  const lon = u * Math.PI * 2
  const lat = Math.PI / 2 - v * Math.PI
  return new Vector3(
    -Math.cos(lon) * Math.cos(lat) * radius,
    Math.sin(lat) * radius,
    Math.sin(lon) * Math.cos(lat) * radius,
  )
}

function lifted(metres: number) {
  return (Math.min(Math.max(metres, 0), PEAK_METRES) / PEAK_METRES) * EXAGGERATION
}

const atmosphereShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 sunDirection;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    void main() {
      float rim = pow(clamp(0.72 + dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 3.0);
      float day = smoothstep(-0.35, 0.45, dot(vWorldNormal, sunDirection));
      gl_FragColor = vec4(vec3(0.32, 0.58, 1.0) * rim * day * 1.6, 1.0);
    }
  `,
}

export function createGlobe(canvas: HTMLCanvasElement, onLook: (look: Look) => void): Globe {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.005, 100)
  camera.position.set(0, 0.8, 3.4)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 1.08
  controls.maxDistance = 8
  controls.rotateSpeed = 0.45
  controls.zoomSpeed = 0.8

  scene.add(new AmbientLight(0x8899bb, 0.12))
  const sun = new DirectionalLight(0xfff4e6, 2.6)
  scene.add(sun)
  const sunDirection = new Vector3(1, 0, 0)

  const colorCanvas = document.createElement('canvas')
  const roughCanvas = document.createElement('canvas')
  const map = new CanvasTexture(colorCanvas)
  map.colorSpace = SRGBColorSpace
  map.wrapS = RepeatWrapping
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  const roughnessMap = new CanvasTexture(roughCanvas)
  roughnessMap.wrapS = RepeatWrapping
  let displacement: DataTexture | undefined
  const material = new MeshStandardMaterial({ map, roughnessMap, roughness: 1, metalness: 0 })
  const planet = new Mesh(new SphereGeometry(1, 512, 256), material)
  scene.add(planet)

  const atmosphere = new Mesh(
    new SphereGeometry(1.045, 96, 48),
    new ShaderMaterial({
      ...atmosphereShader,
      uniforms: { sunDirection: { value: sunDirection } },
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  )
  scene.add(atmosphere)

  const flows = {
    winds: new Particles(3000, 1.05, [0.9, 0.95, 1]),
    currents: new Particles(3500, 1.004, [0.45, 0.95, 1]),
  }
  const flowLines = new LineSegments(
    new BufferGeometry(),
    new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(flowLines)
  let flowing: Particles | null = null

  const tiles = new Group()
  scene.add(tiles)
  const tileKeys = new Set<string>()

  const resize = () => {
    const { clientWidth, clientHeight } = canvas
    renderer.setSize(clientWidth, clientHeight, false)
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  const raycaster = new Raycaster()
  const lookAt = (point: Vector2) => {
    raycaster.setFromCamera(point, camera)
    const hit = raycaster.intersectObject(planet)[0]
    return hit?.uv ? { u: hit.uv.x, v: 1 - hit.uv.y } : null
  }

  let lastLook = ''
  const look = () => {
    const distance = camera.position.length()
    tiles.visible = distance < CLOSE_ENOUGH_FOR_DETAIL + 0.1
    if (distance >= CLOSE_ENOUGH_FOR_DETAIL) return
    const centre = lookAt(new Vector2(0, 0))
    if (!centre) return
    const key = `${centre.u.toFixed(3)},${centre.v.toFixed(3)}`
    if (key === lastLook) return
    lastLook = key
    onLook({ ...centre, distance })
  }
  controls.addEventListener('end', look)

  let previous = performance.now()
  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const seconds = Math.min((now - previous) / 1000, 0.1)
    previous = now
    controls.update()
    controls.rotateSpeed = 0.45 * Math.min(camera.position.length() - 1, 1)
    if (flowing) {
      flowing.step(seconds)
      const geometry = flowLines.geometry
      ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true
      ;(geometry.getAttribute('color') as BufferAttribute).needsUpdate = true
    }
    renderer.render(scene, camera)
  })

  return {
    show({ color, roughness }, ground) {
      for (const [canvasOf, image, texture] of [
        [colorCanvas, color, map],
        [roughCanvas, roughness, roughnessMap],
      ] as const) {
        canvasOf.width = image.width
        canvasOf.height = image.height
        canvasOf.getContext('2d')?.putImageData(image, 0, 0)
        texture.dispose()
        texture.needsUpdate = true
      }
      const { width, height, heights } = ground
      const raised = new Uint8Array(width * height)
      for (let y = 0; y < height; y++) {
        const from = (height - 1 - y) * width
        for (let x = 0; x < width; x++) {
          raised[y * width + x] = Math.round((lifted(heights[from + x] ?? 0) / EXAGGERATION) * 255)
        }
      }
      displacement?.dispose()
      displacement = new DataTexture(raised, width, height, RedFormat)
      displacement.wrapS = RepeatWrapping
      displacement.magFilter = LinearFilter
      displacement.minFilter = LinearFilter
      displacement.needsUpdate = true
      material.displacementMap = displacement
      material.displacementScale = EXAGGERATION
      material.needsUpdate = true
    },
    light(declinationDegrees, subsolarU) {
      sunDirection.copy(onSphere(subsolarU, 0.5 - declinationDegrees / 180, 1)).normalize()
      sun.position.copy(sunDirection).multiplyScalar(10)
    },
    flow(kind, field) {
      flowing = kind === 'none' ? null : flows[kind]
      flowLines.visible = flowing !== null
      if (!flowing) return
      flowing.follow(field)
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(flowing.positions, 3))
      geometry.setAttribute('color', new BufferAttribute(flowing.colors, 3))
      flowLines.geometry.dispose()
      flowLines.geometry = geometry
    },
    pick(clientX, clientY) {
      const bounds = canvas.getBoundingClientRect()
      return lookAt(
        new Vector2(
          ((clientX - bounds.left) / bounds.width) * 2 - 1,
          -((clientY - bounds.top) / bounds.height) * 2 + 1,
        ),
      )
    },
    tile({ key, heights, cells, from, to, uv, image }) {
      tileKeys.add(key)
      const side = to - from + 1
      const positions = new Float32Array(side * side * 3)
      const uvs = new Float32Array(side * side * 2)
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const cx = Math.min(from + x, cells - 1)
          const cy = Math.min(from + y, cells - 1)
          const [u, v] = uv(from + x - 0.5, from + y - 0.5)
          const h = heights[cy * cells + cx] ?? 0
          const point = onSphere(u, v, 1.0015 + lifted(h))
          positions.set([point.x, point.y, point.z], (y * side + x) * 3)
          uvs.set([x / (side - 1), 1 - y / (side - 1)], (y * side + x) * 2)
        }
      }
      const index: number[] = []
      for (let y = 0; y < side - 1; y++) {
        for (let x = 0; x < side - 1; x++) {
          const a = y * side + x
          index.push(a, a + side, a + 1, a + 1, a + side, a + side + 1)
        }
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(positions, 3))
      geometry.setAttribute('uv', new BufferAttribute(uvs, 2))
      geometry.setIndex(index)
      geometry.computeVertexNormals()
      const surface = document.createElement('canvas')
      surface.width = image.width
      surface.height = image.height
      surface.getContext('2d')?.putImageData(image, 0, 0)
      const texture = new CanvasTexture(surface)
      texture.colorSpace = SRGBColorSpace
      const mesh = new Mesh(
        geometry,
        new MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 }),
      )
      mesh.name = key
      tiles.add(mesh)
    },
    hasTile(key) {
      return tileKeys.has(key)
    },
    clearTiles() {
      for (const child of [...tiles.children]) {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          child.material.map?.dispose()
          child.material.dispose()
        }
        tiles.remove(child)
      }
      tileKeys.clear()
    },
    facing() {
      const toCamera = camera.position.clone().normalize()
      const lon = Math.atan2(toCamera.z, -toCamera.x)
      return (((lon / (Math.PI * 2)) % 1) + 1) % 1
    },
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      displacement?.dispose()
      map.dispose()
      roughnessMap.dispose()
      material.dispose()
      planet.geometry.dispose()
      atmosphere.geometry.dispose()
      flowLines.geometry.dispose()
      for (const child of tiles.children) {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          child.material.map?.dispose()
          child.material.dispose()
        }
      }
      renderer.dispose()
    },
  }
}
