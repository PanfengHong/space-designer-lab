import type { Furniture } from '../../../../types';
import { useStylePalette } from '../../../../constants/styles';
import * as THREE from 'three';

interface Props {
  data: Furniture;
}

/**
 * 柜类 — 实心 box 主体 + 装饰
 * 高柜 (h > 1.5m, 衣柜): 双开门轮廓 + 中缝 + 上下把手 + 底部脚座
 * 矮柜 (h <= 1.5m, 厨柜/电视柜/鞋柜/洗手台): 抽屉分隔线 + 把手
 */
export function Cabinet({ data }: Props) {
  const p = useStylePalette();
  const [w, h, d] = data.size;
  const color = p.wood;
  const handleColor = p.metal;
  const outlineColor = p.accent;
  const seamColor = p.accent;
  const baseColor = p.woodDark;

  const isWardrobe = h > 1.5; // 衣柜
  const isTall = h > 0.8;    // 有把手

  // 衣柜: 双开门
  const doorCount = isWardrobe ? 2 : 1;
  const doorW = w / doorCount;

  // 衣柜脚座高度
  const baseH = isWardrobe ? 0.1 : 0;

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 柜体主体 */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[d, h, w]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {isWardrobe ? (
        <>
          {/* ===== 衣柜: 柜门轮廓 + 把手 + 中缝 ===== */}

          {/* 底部脚座 (略宽于柜体, 稍内缩) */}
          <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[d + 0.04, baseH, w - 0.08]} />
            <meshStandardMaterial color={baseColor} roughness={0.85} />
          </mesh>

          {/* 两扇柜门面板 (略微凸出于柜体表面, 形成9叠感) */}
          {Array.from({ length: doorCount }).map((_, i) => {
            const doorCenterZ = -w / 2 + doorW * (i + 0.5);
            const doorPanelH = h - baseH - 0.08; // 上下各留缝
            const doorPanelY = baseH + 0.04 + doorPanelH / 2;
            const panelD = d + 0.01; // 凸出 0.01
            return (
              <group key={i}>
                {/* 门板 (略凸出) */}
                <mesh
                  position={[panelD / 2, doorPanelY, doorCenterZ]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.015, doorPanelH, doorW - 0.04]} />
                  <meshStandardMaterial
                    color={color}
                    roughness={0.65}
                    metalness={0.05}
                  />
                </mesh>
                {/* 门板内嵌矩形轮廓 (装饰线) */}
                <lineSegments position={[0.012, doorPanelY, doorCenterZ]}>
                  <edgesGeometry
                    args={[
                      new THREE.BoxGeometry(0.001, doorPanelH - 0.12, doorW - 0.16),
                    ]}
                  />
                  <lineBasicMaterial color={outlineColor} linewidth={1} />
                </lineSegments>
                {/* 门板外框黑色描边 */}
                <lineSegments position={[panelD / 2 + 0.001, doorPanelY, doorCenterZ]}>
                  <edgesGeometry
                    args={[
                      new THREE.BoxGeometry(0.015, doorPanelH, doorW - 0.04),
                    ]}
                  />
                  <lineBasicMaterial color={outlineColor} linewidth={1} />
                </lineSegments>
                {/* 长条把手 (竖向, 靠近中缝一侧) */}
                <mesh
                  position={[
                    panelD / 2 + 0.012,
                    doorPanelY,
                    doorCenterZ + (i === 0 ? doorW * 0.35 : -doorW * 0.35),
                  ]}
                  castShadow
                >
                  <boxGeometry args={[0.012, doorPanelH * 0.5, 0.03]} />
                  <meshStandardMaterial
                    color={handleColor}
                    metalness={0.7}
                    roughness={0.25}
                  />
                </mesh>
              </group>
            );
          })}

          {/* 两门中缝 (深色细线) */}
          <mesh position={[d / 2 + 0.002, (h + baseH) / 2, 0]}>
            <boxGeometry args={[0.005, h - baseH - 0.04, 0.01]} />
            <meshStandardMaterial color={seamColor} roughness={0.9} />
          </mesh>

          {/* 顶部装饰线 (柜顶下方的横向装饰条) */}
          <mesh position={[d / 2 + 0.002, h - 0.08, 0]} castShadow>
            <boxGeometry args={[0.008, 0.03, w - 0.02]} />
            <meshStandardMaterial color={outlineColor} roughness={0.8} />
          </mesh>
        </>
      ) : (
        <>
          {/* ===== 矮柜: 抽屉分隔线 + 把手 ===== */}

          {/* 抽屉分隔线 (装饰) */}
          {isTall && (
            <mesh position={[d / 2 + 0.001, h * 0.33, 0]}>
              <boxGeometry args={[0.005, 0.015, w - 0.05]} />
              <meshStandardMaterial color={outlineColor} roughness={0.8} />
            </mesh>
          )}

          {/* 把手 (上下两组) */}
          {isTall && (
            <>
              <mesh position={[d / 2 + 0.006, h * 0.5, 0]} castShadow>
                <boxGeometry args={[0.008, 0.04, 0.08]} />
                <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
              </mesh>
            </>
          )}
          {!isTall && (
            <mesh position={[d / 2 + 0.006, h * 0.5, 0]} castShadow>
              <boxGeometry args={[0.008, 0.02, 0.06]} />
              <meshStandardMaterial color={handleColor} metalness={0.6} roughness={0.3} />
            </mesh>
          )}

          {/* 矮柜外轮廓描边 */}
          <lineSegments position={[0, h / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
            <lineBasicMaterial color={outlineColor} linewidth={1} />
          </lineSegments>
        </>
      )}

      {/* 柜体主轮廓描边 (所有柜类通用) */}
      <lineSegments position={[0, h / 2, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
        <lineBasicMaterial color={outlineColor} linewidth={1} />
      </lineSegments>
    </group>
  );
}
