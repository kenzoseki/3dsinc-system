'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface StlPreviewProps {
  url: string
  onClose: () => void
}

export default function StlPreview({ url, onClose }: StlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x2c2a26)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.set(0, 0, 100)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
    backLight.position.set(-1, -1, -1)
    scene.add(backLight)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1

    // Load STL
    const loader = new STLLoader()
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(buffer => {
        const geometry = loader.parse(buffer)
        geometry.computeBoundingBox()
        geometry.center()

        const material = new THREE.MeshPhongMaterial({
          color: 0x5b47c8,
          specular: 0x333333,
          shininess: 40,
          flatShading: false,
        })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // Auto-fit camera to model
        const box = new THREE.Box3().setFromObject(mesh)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.fov * (Math.PI / 180)
        const dist = maxDim / (2 * Math.tan(fov / 2)) * 1.5
        camera.position.set(dist * 0.6, dist * 0.4, dist)
        camera.lookAt(0, 0, 0)
        controls.target.set(0, 0, 0)
        controls.update()

        // Grid
        const gridSize = maxDim * 2
        const grid = new THREE.GridHelper(gridSize, 20, 0x444444, 0x333333)
        grid.position.y = -size.y / 2
        scene.add(grid)
      })

    // Animation loop
    let animId: number
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animId)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      rendererRef.current = null
    }
  }, [url])

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '90vw', maxWidth: '1000px', marginBottom: '8px',
      }}>
        <p style={{
          fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 500,
          color: 'rgba(255,255,255,0.7)', margin: 0,
        }}>
          Arraste para rotacionar &middot; Scroll para zoom
        </p>
        <button
          onClick={onClose}
          style={{
            padding: '6px 16px', borderRadius: '6px',
            fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: '#fff', cursor: 'pointer',
          }}
        >
          Fechar
        </button>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        style={{
          width: '90vw', maxWidth: '1000px',
          height: '70vh',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
