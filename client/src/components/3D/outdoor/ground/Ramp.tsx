import * as THREE from 'three';
import { useMemo } from 'react';
import { ContentProps } from '../GroundItems';

interface CurvePoint { x: number; y: number; z: number; tangent: [number, number, number]; }

/**
 * TriangleNose - 匝道鼻端渐变三角形
 * 三角形顶点:
 *   A = 曲线端点 (贴主路边缘)
 *   B = A + n*d (外侧延伸 d, 即匝道圆弧端的外侧顶点)
 *   C = A + dir*stub (沿切线方向 stub 距离, 仍在主路边上)
 * AC 边贴主路同一侧边缘, B 在外侧, 形成喇叭口/水滴形入口
 */
function TriangleNose({
  curvePoints,
  atStart,
  d,
  stub,
  color,
}: {
  curvePoints: CurvePoint[];
  atStart: boolean;
  d: number;
  stub: number;
  color: string;
}) {
  const geo = useMemo(() => {
    const p = atStart ? curvePoints[0] : curvePoints[curvePoints.length - 1];
    // 原始切线 (用于计算法向 n)
    const tx0 = p.tangent[0], tz0 = p.tangent[2];
    const len0 = Math.sqrt(tx0 * tx0 + tz0 * tz0) || 1;
    const utx0 = tx0 / len0;
    const utz0 = tz0 / len0;
    // 法向 n = (-tz, 0, tx) (指向匝道外侧/主路外侧)
    const nx = -utz0;
    const nz = utx0;
    // C 点延伸方向: 起点沿 -tangent (远离匝道本体), 终点沿 +tangent (远离匝道本体)
    const sign = atStart ? -1 : 1;
    const dirx = utx0 * sign;
    const dirz = utz0 * sign;
    // A: 曲线端点 (贴边)
    const Ax = p.x, Ay = p.y + 0.005, Az = p.z;
    // B: A + n*d (外侧)
    const Bx = p.x + nx * d, By = Ay, Bz = p.z + nz * d;
    // C: A + dir*stub (沿切线延伸, 仍在主路边)
    const Cx = p.x + dirx * stub, Cy = Ay, Cz = p.z + dirz * stub;
    const positions = [
      Ax, Ay, Az,
      Bx, By, Bz,
      Cx, Cy, Cz,
    ];
    const indices = [0, 2, 1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [curvePoints, atStart, d, stub]);

  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
    </mesh>
  );
}

/**
 * 圆弧匝道 — 1/4 圆弧从高架道路平滑转向下降到地面道路
 * size=[w, h, d]: w=圆弧直径(2R), h=路板厚度, d=路宽
 * 曲线: 起点(-w/2, highY, 0)切线+X → 弧90°转向+Z → 终点(0, lowY, w/2)切线+Z
 * 圆心(-w/2, highY, w/2), 半径R=w/2, 角度从-π/2扫到0
 * y 沿弧长从 highY 线性降到 lowY (高→低)
 */
export function Ramp({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  const lowY = 0.18;       // 地面路板顶面
  const highY = 3.34;      // 高架路板顶面

  const R = w / 2;           // 圆弧半径 (匝道中心线)
  const arcAngle = Math.PI / 2;  // 90°
  const N = 60;                  // 采样点数

  // 圆心: 在起点 (-w/2, highY, 0) 的 +Z 方向 R 处
  const cx = -w / 2;
  const cz = R;
  const startAngle = -Math.PI / 2;
  const endAngle = 0;

  // 构造曲线点: 沿圆弧从起点到终点
  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number; z: number; tangent: [number, number, number] }[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const angle = startAngle + t * arcAngle;
      const x = cx + R * Math.cos(angle);
      const z = cz + R * Math.sin(angle);
      const y = highY + (lowY - highY) * t;
      const tan: [number, number, number] = [-Math.sin(angle), 0, Math.cos(angle)];
      pts.push({ x, y, z, tangent: tan });
    }
    return pts;
  }, [w, R, cx, cz, startAngle, arcAngle, highY, lowY]);

  // 构造路面 BufferGeometry: 沿曲线挤出, 内侧贴主路边缘, 外侧向主路外侧延伸 d
  // n=(-tz,0,tx) 归一化指向主路外侧
  // 内侧顶点 = p (贴主路边缘); 外侧顶点 = p + n*d (向外延伸 d)
  // 路面中心 = p + n*(d/2), 桥墩和虚线都需偏移到此位置
  const roadGeo = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i < curvePoints.length; i++) {
      const p = curvePoints[i];
      const tx = p.tangent[0], tz = p.tangent[2];
      const len = Math.sqrt(tx * tx + tz * tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;
      // 内侧 (贴边) 和 外侧 (向 +n 延伸 d)
      positions.push(p.x,             p.y + 0.005, p.z);             // 内侧贴主路边缘
      positions.push(p.x + nx * d,    p.y + 0.005, p.z + nz * d);   // 外侧延伸 d
      uvs.push(0, i / N);
      uvs.push(1, i / N);
    }
    // 索引: 每相邻两点形成一个四边形 (两个三角形)
    for (let i = 0; i < N; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const dd = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, dd, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [curvePoints, d, N]);

  // 桥墩: 沿曲线每隔 ~5m 一根, 位置在路面中心 (p + n*(d/2)), 从 y=0 顶到路板底面
  const pillars = useMemo(() => {
    const result: { x: number; z: number; topY: number; len: number; cY: number }[] = [];
    for (let i = 4; i < curvePoints.length - 2; i += 6) {
      const p = curvePoints[i];
      const tx = p.tangent[0], tz = p.tangent[2];
      const len = Math.sqrt(tx * tx + tz * tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;
      // 路面中心 = p + n*(d/2)
      const cx_p = p.x + nx * (d / 2);
      const cz_p = p.z + nz * (d / 2);
      const topY = p.y - h;
      const pillarLen = topY;
      if (pillarLen > 0.4) {
        result.push({ x: cx_p, z: cz_p, topY, len: pillarLen, cY: pillarLen / 2 });
      }
    }
    return result;
  }, [curvePoints, h, d]);

  // 中央虚线: 沿曲线每隔 3m 一个短段, 位置在路面中心 (p + n*(d/2))
  const dashes = useMemo(() => {
    const result: { pos: [number, number, number]; rot: number }[] = [];
    for (let i = 2; i < curvePoints.length - 1; i += 4) {
      const p = curvePoints[i];
      const tx = p.tangent[0], tz = p.tangent[2];
      const len = Math.sqrt(tx * tx + tz * tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;
      const angle = Math.atan2(-tz, tx);
      result.push({
        pos: [p.x + nx * (d / 2), p.y + 0.01, p.z + nz * (d / 2)],
        rot: angle,
      });
    }
    return result;
  }, [curvePoints, d]);

  return (
    <group>
      {/* 桥墩 */}
      {pillars.map((p, i) => (
        <group key={`pillar-${i}`} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.cY, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, p.len, 12]} />
            <meshStandardMaterial color={palette.concrete} roughness={0.85} />
          </mesh>
          {/* 帽梁 (沿曲线切线方向旋转) */}
          <mesh position={[0, p.topY - 0.06, 0]} castShadow>
            <boxGeometry args={[0.6, 0.18, d * 0.78]} />
            <meshStandardMaterial color={palette.concrete} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* 路面 (沿曲线挤出的三角带) */}
      <mesh geometry={roadGeo} receiveShadow castShadow>
        <meshStandardMaterial color={palette.road} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* 起点鼻端: 三角形 A-B-C, AC 贴主路边缘, B 在外侧 */}
      <TriangleNose curvePoints={curvePoints} atStart={true}  d={d} stub={12.0} color={palette.road} />

      {/* 终点鼻端: 三角形 A'-B'-C' */}
      <TriangleNose curvePoints={curvePoints} atStart={false} d={d} stub={12.0} color={palette.road} />

      {/* 中央虚线 (沿曲线分布) */}
      {dashes.map((d2, i) => (
        <mesh key={`dash-${i}`} position={d2.pos} rotation={[0, d2.rot, 0]}>
          <boxGeometry args={[1.2, 0.014, 0.08]} />
          <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}