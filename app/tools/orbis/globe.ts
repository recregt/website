import {
  AmbientLight,
  CanvasTexture,
  DataTexture,
  DirectionalLight,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  RedFormat,
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import type { Relief } from './paint'

const PEAK_METRES = 9000
const EXAGGERATION = 0.04

export type Globe = {
  show(image: ImageData, relief: Relief): void
  dispose(): void
}

export function createGlobe(canvas: HTMLCanvasElement): Globe {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.01, 100)
  camera.position.set(0, 0.6, 3.4)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 1.15
  controls.maxDistance = 8
  controls.rotateSpeed = 0.5

  scene.add(new AmbientLight(0xffffff, 0.35))
  const sun = new DirectionalLight(0xffffff, 2.2)
  sun.position.set(5, 2, 4)
  scene.add(sun)

  const surface = document.createElement('canvas')
  const map = new CanvasTexture(surface)
  map.colorSpace = SRGBColorSpace
  map.wrapS = RepeatWrapping
  map.anisotropy = renderer.capabilities.getMaxAnisotropy()
  let displacement: DataTexture | undefined
  const material = new MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 })
  const mesh = new Mesh(new SphereGeometry(1, 512, 256), material)
  scene.add(mesh)

  const resize = () => {
    const { clientWidth, clientHeight } = canvas
    renderer.setSize(clientWidth, clientHeight, false)
    camera.aspect = clientWidth / clientHeight
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  return {
    show(image, relief) {
      surface.width = image.width
      surface.height = image.height
      surface.getContext('2d')?.putImageData(image, 0, 0)
      map.dispose()
      map.image = surface
      map.needsUpdate = true

      const { width, height, heights } = relief
      const lifted = new Uint8Array(width * height)
      for (let y = 0; y < height; y++) {
        const from = (height - 1 - y) * width
        for (let x = 0; x < width; x++) {
          lifted[y * width + x] = Math.round(
            Math.min(Math.max(heights[from + x] ?? 0, 0) / PEAK_METRES, 1) * 255,
          )
        }
      }
      displacement?.dispose()
      displacement = new DataTexture(lifted, width, height, RedFormat)
      displacement.wrapS = RepeatWrapping
      displacement.magFilter = LinearFilter
      displacement.minFilter = LinearFilter
      displacement.needsUpdate = true
      material.displacementMap = displacement
      material.displacementScale = EXAGGERATION
      material.needsUpdate = true
    },
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      displacement?.dispose()
      map.dispose()
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
    },
  }
}
