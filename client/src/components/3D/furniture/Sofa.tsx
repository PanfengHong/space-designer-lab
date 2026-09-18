import type { Furniture } from '../../../types';
import { useStylePalette } from '../../../constants/styles';
import * as THREE from 'three';
import { useMemo } from 'react';

interface Props {
  data: Furniture;
}

/**
 * 3D沙发组件
 * 坐标系：坐垫长边沿 z 轴，靠背在 -x 端
 * 改动：移除SofaFurniture与类型守卫，修复L型多余扶手圆柱，修复坐垫几何变形
 */
export function Sofa({ data }: Props) {
  const p = useStylePalette();

  const [w, h, d] = data.size;
  const sofaShape = data.sofaShape ?? 'straight';
  const lSegW = data.lSegmentW ?? w * 0.7;
  const hasArmLeft = data.hasArmLeft ?? true;
  const hasArmRight = data.hasArmRight ?? true;
  const lDirection = data.lDirection ?? 'right';

  const color = p.fabric;
  const cushionColor = p.fabricLight;

  // 基础尺寸常量
  const seatH = 0.45;
  const backH = h - seatH + 0.1;
  const armRadius = 0.13;
  const armLen = d - 0.1;
  const backThickness = 0.24;
  const backTopRadius = Math.min(backThickness / 2, 0.08);

  // 坐垫参数：更小圆角，窄缝隙，提升一体感
  const cushionCornerRadius = 0.02;
  const cushionGap = 0.01;

  // 靠背轮廓
  const backShape = useMemo(() => {
    const shape = new THREE.Shape();
    const bw = backThickness;
    const bh = backH;
    const r = backTopRadius;

    shape.moveTo(-bw / 2, 0);
    shape.lineTo(bw / 2, 0);
    shape.lineTo(bw / 2, bh - r);
    shape.absarc(bw / 2 - r, bh - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-bw / 2 + r, bh);
    shape.absarc(-bw / 2 + r, bh - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-bw / 2, 0);
    return shape;
  }, [backH]);

  // 靠背几何体工厂
  const createBackGeo = useMemo(() => {
    return (length: number) => {
      const geo = new THREE.ExtrudeGeometry(backShape, {
        depth: length * 0.9,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3,
      });
      geo.translate(0, 0, -length * 0.45);
      return geo;
    };
  }, [backShape]);

  // 修复版圆角坐垫，避免顶点算法造成形状扭曲
  const createRoundedBoxGeo = useMemo(() => {
    return (sx: number, sy: number, sz: number, radius: number) => {
      const geo = new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1);
      const posAttr = geo.attributes.position;
      const vec = new THREE.Vector3();

      for (let i = 0; i < posAttr.count; i++) {
        vec.fromBufferAttribute(posAttr, i);
        const xSign = Math.sign(vec.x);
        const ySign = Math.sign(vec.y);
        const zSign = Math.sign(vec.z);

        const absX = Math.abs(vec.x);
        const absY = Math.abs(vec.y);
        const absZ = Math.abs(vec.z);

        // 只对顶点做圆角偏移，不会扭曲面
        if (absX > sx / 2 - radius && absY > sy / 2 - radius && absZ > sz / 2 - radius) {
          vec.x = xSign * (sx / 2 - radius);
          vec.y = ySign * (sy / 2 - radius);
          vec.z = zSign * (sz / 2 - radius);
        }
        posAttr.setXYZ(i, vec.x, vec.y, vec.z);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };
  }, []);

  // 渲染分段坐垫
  const renderSeatCushions = (seatLength: number, seatDepth: number) => {
    const pieces: React.ReactNode[] = [];
    const pieceMaxLen = 0.7;
    const count = Math.max(1, Math.floor(seatLength / pieceMaxLen));
    const pieceLen = (seatLength - cushionGap * (count - 1)) / count;

    for (let i = 0; i < count; i++) {
      const offsetZ = -seatLength / 2 + pieceLen / 2 + i * (pieceLen + cushionGap);
      const cushionGeo = createRoundedBoxGeo(seatDepth, seatH, pieceLen, cushionCornerRadius);

      pieces.push(
        <mesh
          key={`cush-${i}`}
          position={[0, seatH / 2, offsetZ]}
          geometry={cushionGeo}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={cushionColor} roughness={0.88} />
        </mesh>
      );
    }
    return pieces;
  };

  // 渲染单段沙发主体（坐垫+靠背）
  const renderStraightSegment = (
    segW: number,
    segD: number,
    posOffset: [number, number, number] = [0, 0, 0],
    rotY = 0
  ) => {
    const backGeo = createBackGeo(segW);
    return (
      <group position={posOffset} rotation={[0, rotY, 0]}>
        {renderSeatCushions(segW, segD)}
        <mesh
          position={[-segD / 2 + backThickness / 2, seatH, 0]}
          geometry={backGeo}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.88} />
        </mesh>
      </group>
    );
  };

  // 渲染单根扶手
  const renderArmrest = (
    segW: number,
    segD: number,
    side: 'left' | 'right',
    posOffset: [number, number, number] = [0, 0, 0],
    rotY = 0
  ) => {
    const zPos = side === 'left' ? -segW / 2 + 0.15 : segW / 2 - 0.15;
    return (
      <mesh
        key={`arm-${side}-${rotY}`}
        position={[posOffset[0], seatH, posOffset[2] + zPos]}
        rotation={[0, rotY, Math.PI / 2]}
        castShadow
      >
        <cylinderGeometry args={[armRadius, armRadius, armLen, 16]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
    );
  };

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {sofaShape === 'straight' && (
        <>
          {renderStraightSegment(w, d)}
          {hasArmLeft && renderArmrest(w, d, 'left')}
          {hasArmRight && renderArmrest(w, d, 'right')}
        </>
      )}

      {sofaShape === 'L' && (
        <>
          {/* L主段 */}
          {renderStraightSegment(w, d)}
          {/* L副段 */}
          {lDirection === 'right'
            ? renderStraightSegment(lSegW, d, [d / 2, 0, w / 2], Math.PI / 2)
            : renderStraightSegment(lSegW, d, [d / 2, 0, -w / 2], Math.PI / 2)}

          {/* ===== L型扶手渲染核心修复逻辑 ===== */}
          {/* 主段扶手 */}
          {hasArmLeft && lDirection !== 'left' && renderArmrest(w, d, 'left')}
          {hasArmRight && lDirection !== 'right' && renderArmrest(w, d, 'right')}
        </>
      )}
    </group>
  );
}
