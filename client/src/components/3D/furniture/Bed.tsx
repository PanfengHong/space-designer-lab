import type { Furniture } from '../../../types';
import { useStylePalette } from '../../../constants/styles';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useMemo } from 'react';
import { extend } from '@react-three/fiber';

// 注册自定义几何体到 R3F, 使 <roundedBoxGeometry> 可用
extend({ RoundedBoxGeometry });

interface Props {
  data: Furniture;
}

/**
 * 床 — 由床架 + 床垫 + 床头板(带弧形造型) + 床脚 + 被褥组成
 * 局部坐标系: x=床宽(左右), y=向上, z=床长(床头在 -z, 床尾在 +z)
 */
export function Bed({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const frameColor = p.wood;
  const mattressColor = p.fabric;
  const sheetColor = p.fabricLight;
  const pillowColor = '#ffffff';
  const headboardColor = p.woodDark;

  // 床头板高度 (向上凸起)
  const headH = 0.55;
  // 床头板厚度
  const headT = 0.08;
  // 床头板顶部弧形半径
  const topR = Math.min(w / 2, 0.4);

  // 生成床头板形状: 底部矩形 + 顶部弧形
  const headShape = useMemo(() => {
    const shape = new THREE.Shape();
    const halfW = w / 2;

    // 从左下开始, 逆时针
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, headH);
    // 右侧弧形顶部
    shape.absarc(halfW - topR, headH, topR, 0, Math.PI / 2, false);
    // 顶部直线
    shape.lineTo(-halfW + topR, headH + topR);
    // 左侧弧形顶部
    shape.absarc(-halfW + topR, headH, topR, Math.PI / 2, Math.PI, false);
    shape.lineTo(-halfW, 0);

    return shape;
  }, [w, headH, topR]);

  // 床头板几何体 (沿 z 方向拉伸厚度, shape 在 xy 平面: x=床宽, y=高度)
  const headGeometry = useMemo(() => {
    const geo = new THREE.ExtrudeGeometry(headShape, {
      depth: headT,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    // shape 原点在左下, 居中 x 方向
    geo.translate(0, 0, -headT / 2);
    return geo;
  }, [headShape, headT]);

  // 床脚
  const legH = 0.15;
  const legSize = 0.06;
  const legY = legH / 2;
  const legPositions: [number, number, number][] = [
    [-w / 2 + legSize, legY, -d / 2 + legSize],
    [w / 2 - legSize, legY, -d / 2 + legSize],
    [-w / 2 + legSize, legY, d / 2 - legSize],
    [w / 2 - legSize, legY, d / 2 - legSize],
  ];

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 床架 (低于床垫的框架) */}
      <mesh position={[0, legH + (h - legH) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h - legH, w]} />
        <meshStandardMaterial color={frameColor} roughness={0.75} />
      </mesh>

      {/* 床垫 */}
      <mesh position={[0, h + 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[d - 0.1, 0.25, w - 0.1]} />
        <meshStandardMaterial color={mattressColor} roughness={0.9} />
      </mesh>

      {/* 被褥 (覆盖床垫上半部分, 床尾翻折) */}
      <mesh position={[0, h + 0.2, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[d - 0.05, 0.06, w - 0.15]} />
        <meshStandardMaterial color={sheetColor} roughness={0.92} />
      </mesh>

      {/* 枕头 (左右两个) — 长方形圆角, 长边沿 x 平行于床头板 */}
      <mesh position={[-d / 4, h + 0.22, -w / 2 + 0.25]} castShadow>
        <roundedBoxGeometry args={[0.6, 0.14, 0.4, 4, 0.06]} />
        <meshStandardMaterial color={pillowColor} roughness={0.95} />
      </mesh>
      <mesh position={[d / 4, h + 0.22, -w / 2 + 0.25]} castShadow>
        <roundedBoxGeometry args={[0.6, 0.14, 0.4, 4, 0.06]} />
        <meshStandardMaterial color={pillowColor} roughness={0.95} />
      </mesh>

      {/* 床头板 (带弧形造型, 立在床的 -z 端外侧) */}
      <mesh
        position={[0, legH, -w / 2 - headT / 2]}
        geometry={headGeometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={headboardColor} roughness={0.7} />
      </mesh>

      {/* 床头板描边 — 与实体 mesh 相同 position, 避免错位 */}
      <lineSegments position={[0, legH, -w / 2 - headT / 2]}>
        <edgesGeometry args={[headGeometry]} />
        <lineBasicMaterial color={p.accent} />
      </lineSegments>

      {/* 床脚 (4个) */}
      {legPositions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[legSize, legH, legSize]} />
          <meshStandardMaterial color={frameColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
