import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

// ── Typology-aware initial positions ─────────────────────────────────────────
function seedPositions(nodes, ptype) {
  const N = nodes.length
  if (N === 0) return []

  if (ptype === 'GATHER-SCATTER') {
    // Hub (node 0) at center. Source ring around it feeding in.
    // Output ring on the far side.
    return nodes.map((_, i) => {
      if (i === 0) return new THREE.Vector3(0, 0, 0)
      // First half: sources feeding the hub (ring at radius 4, y=-1)
      // Second half: receivers from hub (ring at radius 4, y=+1)
      const half = Math.ceil((N - 1) / 2)
      const isReceiver = i > half
      const ring = isReceiver ? i - half : i
      const total = isReceiver ? N - 1 - half : half
      const theta = (2 * Math.PI * (ring - 1)) / Math.max(total, 1)
      const r = 4 + Math.random() * 0.5
      const yOff = isReceiver ? 1.5 : -1.5
      return new THREE.Vector3(
        r * Math.cos(theta) + (Math.random() - 0.5) * 0.3,
        yOff + (Math.random() - 0.5) * 0.5,
        r * Math.sin(theta) + (Math.random() - 0.5) * 0.3
      )
    })
  }

  if (ptype === 'STACK') {
    // Linear chain along X axis, small Y/Z wave to give 3D depth
    return nodes.map((_, i) => {
      const t     = N > 1 ? i / (N - 1) : 0
      const x     = (t - 0.5) * 12
      const wave  = Math.sin(t * Math.PI * 2) * 1.2
      const twist = Math.cos(t * Math.PI * 2) * 0.8
      return new THREE.Vector3(
        x + (Math.random() - 0.5) * 0.3,
        wave + (Math.random() - 0.5) * 0.3,
        twist + (Math.random() - 0.5) * 0.3
      )
    })
  }

  // SCATTER-GATHER (default): source on left, sink on right, intermediaries fan in middle
  return nodes.map((_, i) => {
    if (i === 0) return new THREE.Vector3(-5, 0, 0)          // source
    if (i === N - 1) return new THREE.Vector3(5, 0, 0)       // sink
    const mid   = N - 2
    const theta = ((i - 1) / Math.max(mid - 1, 1) - 0.5) * Math.PI * 1.2
    const r     = 3.5 + Math.random() * 0.5
    return new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      r * Math.sin(theta) + (Math.random() - 0.5) * 0.3,
      r * Math.cos(theta) * 0.6 + (Math.random() - 0.5) * 0.3
    )
  })
}

// ── Force-directed simulation (pure JS) ───────────────────────────────────────
function createSimulation(nodes, edges, ptype) {
  const N   = nodes.length
  const pos = seedPositions(nodes, ptype)
  const vel = nodes.map(() => new THREE.Vector3())

  // Per-typology tuning
  const cfg = {
    'GATHER-SCATTER': { repel: 3.5, attract: 0.10, idealLaund: 2.2, idealNorm: 3.5, center: 0.012 },
    'STACK':          { repel: 2.5, attract: 0.18, idealLaund: 2.0, idealNorm: 2.4, center: 0.008 },
    'default':        { repel: 4.0, attract: 0.06, idealLaund: 2.5, idealNorm: 4.0, center: 0.015 },
  }
  const c = cfg[ptype] || cfg['default']

  function tick() {
    const DAMP = 0.88

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const d    = pos[i].clone().sub(pos[j])
        const dist = Math.max(d.length(), 0.3)
        const f    = c.repel / (dist * dist)
        const dir  = d.normalize()
        vel[i].addScaledVector(dir,  f)
        vel[j].addScaledVector(dir, -f)
      }
    }

    edges.forEach(e => {
      if (e.source >= N || e.target >= N) return
      const d        = pos[e.target].clone().sub(pos[e.source])
      const dist     = Math.max(d.length(), 0.01)
      const idealLen = e.is_laundering ? c.idealLaund : c.idealNorm
      const f        = c.attract * (dist - idealLen)
      const dir      = d.normalize()
      vel[e.source].addScaledVector(dir,  f)
      vel[e.target].addScaledVector(dir, -f)
    })

    for (let i = 0; i < N; i++) {
      vel[i].addScaledVector(pos[i], -c.center)
      vel[i].multiplyScalar(DAMP)
      pos[i].add(vel[i])
    }
  }

  return { pos, vel, tick }
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NetworkGraph3D({ network, candidate }) {
  const mountRef  = useRef(null)
  const [selected, setSelected]   = useState(null)
  const [settled,  setSettled]    = useState(false)
  const [progress, setProgress]   = useState(0)

  const ptype = candidate?.pattern_type || 'default'

  useEffect(() => {
    if (!mountRef.current || !network?.nodes?.length) return

    const el = mountRef.current
    const W  = el.clientWidth
    const H  = 480

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0a0a0a)
    el.appendChild(renderer.domElement)

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200)
    // Position camera based on typology for best initial view
    if (ptype === 'STACK') {
      camera.position.set(0, 6, 16)   // wider view for horizontal chain
    } else if (ptype === 'GATHER-SCATTER') {
      camera.position.set(0, 9, 12)   // slightly higher for ring+hub
    } else {
      camera.position.set(0, 5, 14)   // default
    }
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const pt1 = new THREE.PointLight(0xffffff, 1.2, 60)
    pt1.position.set(10, 10, 10)
    scene.add(pt1)
    const pt2 = new THREE.PointLight(0xef4444, 0.8, 40)
    pt2.position.set(-8, -4, -8)
    scene.add(pt2)

    const grid = new THREE.GridHelper(30, 30, 0x1c1c1c, 0x1c1c1c)
    grid.position.y = -4
    scene.add(grid)

    // ── Simulation ────────────────────────────────────────────────────────────
    const nodes = network.nodes
    const edges = network.edges
    const sim   = createSimulation(nodes, edges, ptype)

    // ── Node meshes ───────────────────────────────────────────────────────────
    const hoveredIdx = { val: -1 }
    const nodeMeshes = nodes.map((n, i) => {
      const r    = i === 0 ? 0.45 : 0.3
      const mat  = new THREE.MeshPhongMaterial({
        color:       n.is_flagged ? 0xef4444 : 0xdddddd,
        emissive:    n.is_flagged ? 0x7f1d1d : 0x111111,
        shininess:   80,
        transparent: true,
        opacity:     0.92,
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), mat)
      mesh.userData = { nodeIndex: i, node: n }
      scene.add(mesh)

      if (n.is_flagged) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r + 0.08, r + 0.22, 32),
          new THREE.MeshBasicMaterial({
            color: 0xef4444, side: THREE.DoubleSide,
            transparent: true, opacity: 0.35,
          })
        )
        ring.userData.isDecoration = true
        mesh.add(ring)
      }
      return mesh
    })

    // ── Edge lines ────────────────────────────────────────────────────────────
    const edgeLines = edges.map(e => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
      const mat = new THREE.LineBasicMaterial({
        color:       e.is_laundering ? 0xef4444 : 0x374151,
        transparent: true,
        opacity:     e.is_laundering ? 0.85 : 0.3,
      })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      return { line, edge: e }
    })

    // ── Amount sprites ────────────────────────────────────────────────────────
    const spriteMeshes = []
    edges.forEach(e => {
      if (!e.is_laundering || !e.amount) return
      const cv  = document.createElement('canvas')
      cv.width = 128; cv.height = 40
      const ctx = cv.getContext('2d')
      ctx.fillStyle = 'rgba(239,68,68,0.85)'
      ctx.beginPath()
      ctx.roundRect(0, 0, 128, 40, 8)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('$' + (e.amount / 1000).toFixed(0) + 'k', 64, 20)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }))
      sp.scale.set(1.2, 0.38, 1)
      scene.add(sp)
      spriteMeshes.push({ sprite: sp, edge: e })
    })

    // ── Orbit controls (manual) ───────────────────────────────────────────────
    let isDragging = false
    let lastMouse  = { x: 0, y: 0 }
    let sph = { theta: 0.4, phi: 1.0, r: 14 }
    let tgt = { ...sph }

    const updateCamera = () => {
      camera.position.set(
        sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
        sph.r * Math.cos(sph.phi),
        sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
      )
      camera.lookAt(0, 0, 0)
    }
    updateCamera()

    const onDown  = e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY } }
    const onMove  = e => {
      if (!isDragging) return
      tgt.theta -= (e.clientX - lastMouse.x) * 0.008
      tgt.phi    = Math.max(0.15, Math.min(Math.PI - 0.15, tgt.phi + (e.clientY - lastMouse.y) * 0.008))
      lastMouse  = { x: e.clientX, y: e.clientY }
    }
    const onUp    = () => { isDragging = false }
    const onWheel = e => { tgt.r = Math.max(5, Math.min(30, tgt.r + e.deltaY * 0.025)) }

    renderer.domElement.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    // ── Raycasting ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse2    = new THREE.Vector2()

    const onClick = e => {
      if (isDragging) return
      const rect = renderer.domElement.getBoundingClientRect()
      mouse2.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1
      mouse2.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1
      raycaster.setFromCamera(mouse2, camera)
      const hits = raycaster.intersectObjects(nodeMeshes)
      setSelected(hits.length ? hits[0].object.userData.node : null)
    }

    const onHover = e => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse2.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1
      mouse2.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1
      raycaster.setFromCamera(mouse2, camera)
      const hits = raycaster.intersectObjects(nodeMeshes)
      hoveredIdx.val = hits.length ? hits[0].object.userData.nodeIndex : -1
      renderer.domElement.style.cursor = hits.length ? 'pointer' : (isDragging ? 'grabbing' : 'grab')
    }

    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('mousemove', onHover)

    // ── Animation loop ────────────────────────────────────────────────────────
    // STACK needs more ticks to spread out the chain fully
    const MAX_TICKS = ptype === 'STACK' ? 200 : 140
    let simTick = 0
    let animId

    const loop = () => {
      animId = requestAnimationFrame(loop)

      if (simTick < MAX_TICKS) {
        sim.tick()
        simTick++
        setProgress(simTick / MAX_TICKS)
        if (simTick === MAX_TICKS) setSettled(true)
      }

      // Lerp spherical
      sph.theta += (tgt.theta - sph.theta) * 0.08
      sph.phi   += (tgt.phi   - sph.phi  ) * 0.08
      sph.r     += (tgt.r     - sph.r    ) * 0.08
      updateCamera()

      // Auto-rotate
      if (!isDragging && simTick >= MAX_TICKS) {
        tgt.theta += 0.003
      }

      // Update nodes
      nodeMeshes.forEach((mesh, i) => {
        mesh.position.copy(sim.pos[i])
        const isF = nodes[i].is_flagged
        const isH = hoveredIdx.val === i
        if (isF) {
          const s = 1 + 0.12 * Math.sin(Date.now() * 0.003 + i)
          mesh.scale.setScalar(s)
          mesh.children.forEach(c => { c.rotation.z += 0.012 })
        }
        mesh.material.emissive.setHex(
          isH ? 0x4f46e5 : (isF ? 0x7f1d1d : 0x111111)
        )
      })

      // Update edges
      edgeLines.forEach(({ line, edge }) => {
        if (edge.source >= sim.pos.length || edge.target >= sim.pos.length) return
        const pa = line.geometry.attributes.position
        const s  = sim.pos[edge.source]
        const t  = sim.pos[edge.target]
        pa.setXYZ(0, s.x, s.y, s.z)
        pa.setXYZ(1, t.x, t.y, t.z)
        pa.needsUpdate = true
      })

      // Update sprites
      spriteMeshes.forEach(({ sprite, edge }) => {
        if (edge.source >= sim.pos.length || edge.target >= sim.pos.length) return
        const s = sim.pos[edge.source]
        const t = sim.pos[edge.target]
        sprite.position.set((s.x + t.x) / 2, (s.y + t.y) / 2 + 0.4, (s.z + t.z) / 2)
      })

      renderer.render(scene, camera)
    }
    loop()

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth
      renderer.setSize(w, H)
      camera.aspect = w / H
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      renderer.domElement.removeEventListener('mousedown', onDown)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('mousemove', onHover)
      renderer.domElement.removeEventListener('wheel', onWheel)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [network])

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0a', marginBottom: 4 }}>
          Transaction flow network — 3D
        </div>
        <p style={{ fontSize: 12, color: '#9ca3af' }}>
          Drag to rotate · Scroll to zoom · Click a node to inspect
        </p>
      </div>

      {/* Canvas wrapper */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <div
          ref={mountRef}
          style={{ width: '100%', height: 480, background: '#0a0a0a', cursor: 'grab' }}
        />

        {/* Simulation progress bar */}
        {!settled && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'rgba(255,255,255,0.06)',
          }}>
            <div style={{
              height: '100%', background: '#4f46e5', borderRadius: 1,
              width: `${progress * 100}%`, transition: 'width 0.05s linear',
            }} />
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14,
          display: 'flex', flexDirection: 'column', gap: 7,
          pointerEvents: 'none',
        }}>
          <LegendRow dot color="#ef4444" label="Flagged account" />
          <LegendRow dot color="rgba(200,200,200,0.5)" label="Normal account" />
          <LegendRow line color="#ef4444" label="Laundering transaction" />
          <LegendRow line color="rgba(55,65,81,0.8)" label="Normal transaction" />
        </div>

        {/* Controls hint */}
        {settled && (
          <div style={{
            position: 'absolute', top: 14, right: 14,
            fontSize: 10, color: 'rgba(255,255,255,0.28)',
            letterSpacing: '0.05em', pointerEvents: 'none',
          }}>
            DRAG · SCROLL · CLICK
          </div>
        )}

        {/* Node inspect panel */}
        {selected && (
          <div style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(10,10,10,0.94)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${selected.is_flagged ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 10, padding: '14px 16px', minWidth: 210,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: selected.is_flagged ? '#ef4444' : 'rgba(255,255,255,0.5)',
              }}>
                {selected.is_flagged ? '⚠ Flagged' : 'Account'}
              </span>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
              >×</button>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#fff', marginBottom: 10, wordBreak: 'break-all', lineHeight: 1.5 }}>
              {selected.account_id || selected.label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <Chip label={`Bank: ${selected.bank || '—'}`} />
              <Chip label={selected.is_flagged ? 'HIGH RISK' : 'NORMAL'} danger={selected.is_flagged} />
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        marginTop: 12,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden',
      }}>
        {[
          { label: 'Total nodes',      value: network?.nodes?.length ?? 0 },
          { label: 'Laundering edges', value: (network?.edges ?? []).filter(e => e.is_laundering).length },
          { label: 'Normal edges',     value: (network?.edges ?? []).filter(e => !e.is_laundering).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fff', padding: '12px 14px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0a0a0a' }}>{value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LegendRow({ dot, line, color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {dot  && <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />}
      {line && <div style={{ width: 18, height: 2, background: color, borderRadius: 1, flexShrink: 0 }} />}
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>{label}</span>
    </div>
  )
}

function Chip({ label, danger }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      background: danger ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)',
      color: danger ? '#ef4444' : 'rgba(255,255,255,0.55)',
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>{label}</span>
  )
}
