import * as THREE from 'three'
import { useMemo } from 'react'
import { OutdoorPalette } from '../../../../constants/outdoorStyles';
import type { OutdoorObject } from '../../../../types';

/* ================================ 常量 ================================ */

const BASE_L = 4.69
const BASE_H = 1.44
const BASE_W = 1.85

const WHEEL_Z = 0.86
const HALF_WHEELBASE = 1.4375
const BODY_HALF_Z = 0.90

/**
 * ★ 三层厚度差拉到 0.08 —— 拉近也不会有 z-fighting
 *   框架 0.62 ← 玻璃 0.70 ← 柱子 0.78
 */
const CABIN_FRAME_HALF = 0.62
const GLASS_HALF = 0.70
const PILLAR_HALF = 0.78

/* ============================ 座舱轮廓工厂 ============================= */
/* withWindows = true 时挖出前风挡 / 天窗 / 后窗三个洞 */

function buildCabinShape(withWindows: boolean): THREE.Shape {
  const s = new THREE.Shape()

  // ---- 座舱侧视外轮廓（溜背加长版） ----
  s.moveTo(-1.62, 0.64)
  s.lineTo(-1.62, 0.72)
  s.quadraticCurveTo(-1.30, 0.88, -0.95, 1.10)   // A 柱
  s.quadraticCurveTo(-0.55, 1.34, -0.10, 1.44)   // 进入车顶
  s.quadraticCurveTo(0.05, 1.48, 0.20, 1.49)     // ★ 车顶最高点前移到 x=0.20
  s.quadraticCurveTo(0.45, 1.49, 0.65, 1.44)     // 车顶后段

  // ★ 溜背：三段曲线，一路滑到接近车尾
  s.quadraticCurveTo(1.20, 1.30, 1.60, 1.10)
  s.quadraticCurveTo(1.95, 0.92, 2.22, 0.78)
  s.quadraticCurveTo(2.32, 0.72, 2.38, 0.68)     // ★ 末端推到 x=2.38

  s.lineTo(2.38, 0.64)
  s.lineTo(-1.62, 0.64)
  s.closePath()

  if (withWindows) {
    // ---- 前风挡洞 ----
    const windshield = new THREE.Path()
    windshield.moveTo(-1.44, 0.80)
    windshield.quadraticCurveTo(-1.16, 0.96, -0.88, 1.14)
    windshield.quadraticCurveTo(-0.58, 1.32, -0.30, 1.40)
    windshield.lineTo(-0.36, 1.30)
    windshield.quadraticCurveTo(-0.62, 1.24, -0.88, 1.06)
    windshield.quadraticCurveTo(-1.16, 0.88, -1.42, 0.74)
    windshield.closePath()

    // ---- 天窗洞 ----
    const roof = new THREE.Path()
    roof.moveTo(-0.26, 1.41)
    roof.quadraticCurveTo(0.15, 1.45, 0.50, 1.41)
    roof.lineTo(0.50, 1.33)
    roof.quadraticCurveTo(0.15, 1.37, -0.30, 1.32)
    roof.closePath()

    // ---- 后窗洞（跟着溜背一路延伸） ----
    const rear = new THREE.Path()
    rear.moveTo(0.60, 1.42)
    rear.quadraticCurveTo(1.15, 1.30, 1.55, 1.10)
    rear.quadraticCurveTo(1.90, 0.92, 2.16, 0.80)
    rear.lineTo(2.06, 0.74)
    rear.quadraticCurveTo(1.82, 0.86, 1.50, 1.02)
    rear.quadraticCurveTo(1.10, 1.22, 0.60, 1.34)
    rear.closePath()

    s.holes.push(windshield, roof, rear)
  }

  return s
}

/** 挤出并沿 Z 居中 */
function extrudeCentered(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 40,
  })
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  geo.translate(0, 0, -(bb.max.z + bb.min.z) / 2)
  return geo
}

/* ============================== 三层几何体 ============================= */

/** 第 1 层：座舱框架（带窗洞，最窄） */
function useCabinFrameGeometry(): THREE.ExtrudeGeometry {
  return useMemo(
    () => extrudeCentered(buildCabinShape(true), CABIN_FRAME_HALF * 2, 0),
    [],
  )
}

/** 第 2 层：车窗玻璃（完整轮廓，中间厚度） */
function useGlassGeometry(): THREE.ExtrudeGeometry {
  return useMemo(
    () => extrudeCentered(buildCabinShape(false), GLASS_HALF * 2, 0),
    [],
  )
}

/** 第 3 层：柱子（带窗洞，最宽，盖在玻璃外面） */
function usePillarGeometry(): THREE.ExtrudeGeometry {
  return useMemo(
    () => extrudeCentered(buildCabinShape(true), PILLAR_HALF * 2, 0.012),
    [],
  )
}

/* =============================== 车身几何 =============================== */

function useBodyGeometry(): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const s = new THREE.Shape()

    s.moveTo(-2.42, 0.60)
    s.quadraticCurveTo(-2.10, 0.74, -1.80, 0.80)
    s.quadraticCurveTo(-1.25, 0.855, -0.60, 0.885)
    s.lineTo(0.40, 0.895)
    s.lineTo(1.00, 0.895)

    // 后部顶部缓慢下降，呼应座舱溜背
    s.quadraticCurveTo(1.70, 0.888, 2.15, 0.875)
    s.quadraticCurveTo(2.30, 0.868, 2.36, 0.70)

    s.lineTo(2.36, 0.26)
    s.quadraticCurveTo(2.26, 0.17, 2.00, 0.155)
    s.lineTo(-1.98, 0.155)
    s.quadraticCurveTo(-2.26, 0.17, -2.36, 0.28)
    s.lineTo(-2.40, 0.44)
    s.quadraticCurveTo(-2.42, 0.52, -2.42, 0.60)
    s.closePath()

    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.60,
      bevelEnabled: true,
      bevelThickness: 0.10,
      bevelSize: 0.09,
      bevelSegments: 4,
      curveSegments: 32,
    })

    geo.computeBoundingBox()
    const bb = geo.boundingBox!
    geo.translate(0, 0, -(bb.max.z + bb.min.z) / 2)

    return geo
  }, [])
}

/* ================================= 车轮 ================================= */

function Wheel({ x, z }: { x: number; z: number }) {
  const R = 0.36
  const TIRE_W = 0.34

  return (
    <group position={[x, R, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[R, R, TIRE_W, 36]} />
        <meshStandardMaterial color="#0e1013" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[R * 0.66, R * 0.66, TIRE_W * 1.02, 28]} />
        <meshStandardMaterial color="#b8bec4" metalness={1} roughness={0.28} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[R * 0.20, R * 0.20, TIRE_W * 1.10, 18]} />
        <meshStandardMaterial color="#2b2f34" metalness={0.85} roughness={0.35} />
      </mesh>
    </group>
  )
}

/* ================================ 前大灯 ================================ */

function Headlight({ side }: { side: 1 | -1 }) {
  return (
    <group position={[-2.22, 0.70, side * 0.56]}>
      <mesh>
        <boxGeometry args={[0.10, 0.13, 0.32]} />
        <meshStandardMaterial color="#0a0d12" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0.055, 0.03, side * 0.04]} rotation={[0, 0, side * 0.14]}>
        <boxGeometry args={[0.02, 0.03, 0.22]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#dceaff"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.055, -0.035, -side * 0.06]}>
        <boxGeometry args={[0.02, 0.05, 0.12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffeec2"
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ============================= 前保险杠下进气口 ========================= */

function FrontIntake() {
  return (
    <group position={[-2.30, 0.30, 0]}>
      <mesh>
        <boxGeometry args={[0.10, 0.10, 1.10]} />
        <meshStandardMaterial color="#050607" roughness={0.9} metalness={0.1} />
      </mesh>
      {[-0.35, -0.15, 0.05, 0.25, 0.45].map((z) => (
        <mesh key={`grille-${z}`} position={[0.052, 0, z]}>
          <boxGeometry args={[0.005, 0.08, 0.012]} />
          <meshStandardMaterial color="#1a1d21" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/* ============================= 前保险杠横向内凹 ========================= */

function FrontBumperCrease() {
  return (
    <mesh position={[-2.28, 0.52, 0]}>
      <boxGeometry args={[0.06, 0.03, 1.40]} />
      <meshStandardMaterial color="#d8dce0" metalness={0.4} roughness={0.7} />
    </mesh>
  )
}

/* ============================== 引擎盖翼子板肩线 ======================== */

function HoodShoulders() {
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={`shoulder-${side}`}
          position={[-1.30, 0.79, side * 0.70]}
          rotation={[side * 0.05, 0, 0.03]}
        >
          <boxGeometry args={[1.5, 0.008, 0.06]} />
          <meshStandardMaterial color="#e8ebee" metalness={0.4} roughness={0.55} />
        </mesh>
      ))}
    </>
  )
}

/* ============================== 前风挡雨刷 ============================== */

function Wipers() {
  return (
    <group position={[-1.50, 0.72, 0]}>
      {[-0.30, 0.18].map((z, i) => (
        <mesh
          key={`wiper-${i}`}
          position={[0, 0, z]}
          rotation={[0, 0, i === 0 ? 0.18 : 0.10]}
        >
          <boxGeometry args={[0.02, 0.01, 0.52]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================ 尾灯 ================================= */

function Taillight() {
  return (
    <group position={[2.32, 0.80, 0]}>
      <mesh>
        <boxGeometry args={[0.08, 0.13, 1.60]} />
        <meshStandardMaterial color="#0a0507" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0.05, 0.01, 0]}>
        <boxGeometry args={[0.02, 0.05, 1.52]} />
        <meshStandardMaterial
          color="#ff2b2b"
          emissive="#ff0a0a"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      {[-0.62, 0.62].map((z) => (
        <mesh key={`brake-${z}`} position={[0.05, 0.0, z]}>
          <boxGeometry args={[0.025, 0.08, 0.22]} />
          <meshStandardMaterial
            color="#ff3b3b"
            emissive="#ff0a0a"
            emissiveIntensity={3.0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* =============================== 后视镜 + 转向灯 ========================= */

function Mirror({ side }: { side: 1 | -1 }) {
  return (
    <group position={[-0.80, 0.99, side * 0.92]}>
      <mesh castShadow>
        <boxGeometry args={[0.20, 0.09, 0.24]} />
        <meshStandardMaterial color="#e8ebee" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0.10, 0, 0]}>
        <boxGeometry args={[0.01, 0.07, 0.20]} />
        <meshStandardMaterial color="#9fb4c8" metalness={1} roughness={0.08} />
      </mesh>
      <mesh position={[0.06, 0.0, side * 0.13]}>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial
          color="#ffb020"
          emissive="#ff9500"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ================================ 车标 ================================= */

function TeslaBadge() {
  return (
    <group position={[-2.36, 0.70, 0]}>
      <mesh position={[0.02, 0.01, 0]}>
        <boxGeometry args={[0.01, 0.012, 0.10]} />
        <meshStandardMaterial color="#9aa0a6" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0.02, -0.025, 0]}>
        <boxGeometry args={[0.01, 0.045, 0.018]} />
        <meshStandardMaterial color="#9aa0a6" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ================================= 整车 ================================= */

export function Car({
  data,
  palette,
}: {
  data: OutdoorObject
  palette: OutdoorPalette
}) {
  const [L, H, W] = data.size
  const bodyColor = palette.monochrome ? '#ffffff' : data.color

  const bodyGeo = useBodyGeometry()
  const cabinFrameGeo = useCabinFrameGeometry()
  const glassGeo = useGlassGeometry()
  const pillarGeo = usePillarGeometry()

  const sx = L / BASE_L
  const sy = H / BASE_H
  const sz = W / BASE_W

  const paint = {
    color: bodyColor,
    metalness: 0.55,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
  }

  /**
   * ★ 玻璃不透明、深色。
   * 不透明的深色玻璃靠物理间距（0.70 vs 0.62/0.78）保证可见，
   * 不再依赖透明度，所以拉近也不会"消失"。
   */
  const glass = {
    color: '#0a0f18',
    metalness: 0.7,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 2.4,
  }

  return (
    <group scale={[sx, sy, sz]}>
      {/* ---------- 车身 ---------- */}
      <mesh geometry={bodyGeo} castShadow>
        <meshPhysicalMaterial {...paint} />
      </mesh>

      <HoodShoulders />
      <FrontBumperCrease />

      {/*
        ---------- 三层座舱结构 ----------
        框架 0.62 ← 玻璃 0.70 ← 柱子 0.78
        厚度差 0.08 / 0.08，拉近也不会 z-fighting
      */}

      {/* 第 1 层：座舱框架 */}
      <mesh geometry={cabinFrameGeo} castShadow>
        <meshPhysicalMaterial {...paint} />
      </mesh>

      {/* 第 2 层：车窗玻璃 */}
      <mesh geometry={glassGeo}>
        <meshPhysicalMaterial {...glass} side={THREE.DoubleSide} />
      </mesh>

      {/* 第 3 层：柱子（最外，带窗洞） */}
      <mesh geometry={pillarGeo} castShadow>
        <meshPhysicalMaterial {...paint} />
      </mesh>

      <Wipers />

      <Headlight side={1} />
      <Headlight side={-1} />

      <FrontIntake />
      <TeslaBadge />
      <Taillight />

      {/* ---------- 后扩散器 ---------- */}
      <mesh position={[2.31, 0.31, 0]}>
        <boxGeometry args={[0.14, 0.12, 1.50]} />
        <meshStandardMaterial color="#1a1d21" metalness={0.7} roughness={0.45} />
      </mesh>

      {/* ---------- 门把手 ---------- */}
      {[-0.55, 0.65].map((x) =>
        [-1, 1].map((side) => (
          <mesh
            key={`handle-${x}-${side}`}
            position={[x, 0.78, side * (BODY_HALF_Z + 0.005)]}
          >
            <boxGeometry args={[0.22, 0.035, 0.02]} />
            <meshStandardMaterial color="#1a1d21" metalness={0.7} roughness={0.45} />
          </mesh>
        ))
      )}

      {/* ---------- 侧裙 ---------- */}
      {[-1, 1].map((side) => (
        <mesh
          key={`skirt-${side}`}
          position={[0, 0.28, side * (BODY_HALF_Z + 0.002)]}
        >
          <boxGeometry args={[2.6, 0.08, 0.02]} />
          <meshStandardMaterial color="#1a1d21" metalness={0.7} roughness={0.45} />
        </mesh>
      ))}

      <Mirror side={1} />
      <Mirror side={-1} />

      <Wheel x={-HALF_WHEELBASE} z={WHEEL_Z} />
      <Wheel x={-HALF_WHEELBASE} z={-WHEEL_Z} />
      <Wheel x={HALF_WHEELBASE} z={WHEEL_Z} />
      <Wheel x={HALF_WHEELBASE} z={-WHEEL_Z} />
    </group>
  )
}