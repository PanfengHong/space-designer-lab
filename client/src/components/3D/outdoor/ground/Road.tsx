import { useMemo } from 'react';
import * as THREE from 'three';
import { ContentProps } from '../GroundItems';

/** 道路 — 灰蓝路面 + 白色边线 + 虚线车道 + 高架桥墩 */
export function Road({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  const deckY = data.position[1];
  const elevated = deckY > 0.5;
  const lanes: 2 | 4 = (data as any).lanes === 4 ? 4 : 2;

  // 中央虚线 (沿 X 长度方向)
  const dashes = useMemo(() => {
    const result: number[] = [];
    const pitch = 3.0;
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += pitch) {
      result.push(x);
    }
    return result;
  }, [w]);

  // 桥墩位置 (沿 X 每隔 10m)
  const pillars = useMemo(() => {
    if (!elevated) return [] as number[];
    const result: number[] = [];
    for (let x = -w / 2 + 5; x < w / 2 - 4; x += 10) {
      result.push(x);
    }
    return result;
  }, [w, elevated]);

  const pillarHeight = deckY - h / 2;
  const pillarCenterY = -(deckY + h / 2) / 2;

  return (
    <group>
      {/* 高架桥墩 */}
      {elevated && pillars.map((x, i) => (
        <group key={`pillar-${i}`}>
          <mesh position={[x, pillarCenterY, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, pillarHeight, 12]} />
            <meshStandardMaterial color={palette.concrete} roughness={0.85} />
          </mesh>
          {/* 桥墩顶部帽梁 */}
          <mesh position={[x, -h / 2 - 0.12, 0]} castShadow>
            <boxGeometry args={[0.7, 0.24, d * 0.85]} />
            <meshStandardMaterial color={palette.concrete} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* 路面 */}
      <mesh receiveShadow castShadow>
        <roundedBoxGeometry args={[w, h, d, 3, 0.12]} />
        <meshStandardMaterial color={palette.road} roughness={0.75} />
      </mesh>

      {/* 两侧白色实线 */}
      <mesh position={[0, h / 2 + 0.008, d / 2 - 0.22]}>
        <boxGeometry args={[w - 0.8, 0.014, 0.07]} />
        <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
      </mesh>
      <mesh position={[0, h / 2 + 0.008, -d / 2 + 0.22]}>
        <boxGeometry args={[w - 0.8, 0.014, 0.07]} />
        <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
      </mesh>

      {/* 双向 2 车道: 中央单虚线 */}
      {lanes === 2 && dashes.map((x, i) => (
        <mesh key={`dash-${i}`} position={[x, h / 2 + 0.009, 0]}>
          <boxGeometry args={[1.4, 0.014, 0.08]} />
          <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
        </mesh>
      ))}

      {/* 双向 4 车道: 中央双实线 (分隔对向) + 每方向 2 车道分隔虚线 */}
      {lanes === 4 && (
        <>
          <mesh position={[0, h / 2 + 0.008, 0.09]}>
            <boxGeometry args={[w - 0.8, 0.014, 0.06]} />
            <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
          </mesh>
          <mesh position={[0, h / 2 + 0.008, -0.09]}>
            <boxGeometry args={[w - 0.8, 0.014, 0.06]} />
            <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
          </mesh>
          {dashes.map((x, i) => (
            <group key={`ldash-${i}`}>
              <mesh position={[x, h / 2 + 0.009, d / 4]}>
                <boxGeometry args={[1.4, 0.014, 0.08]} />
                <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
              </mesh>
              <mesh position={[x, h / 2 + 0.009, -d / 4]}>
                <boxGeometry args={[1.4, 0.014, 0.08]} />
                <meshStandardMaterial color={palette.roadLine} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* 外轮廓描边 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}