import type { Furniture } from '../../../../types';
import { useDeviceState } from '../../../../hooks/useDeviceState';
import { useStylePalette } from '../../../../constants/styles';

interface Props {
  data: Furniture;
}

/**
 * 窗帘 — 顶部轨道 + 左右两片带褶皱的帘布
 * size: [width(z), height(y), depth(x)]，帘布沿局部 Z 展开，正面朝 +X
 *
 * 设备状态:
 *   position 0 = 全关 (两片在中间合拢) / 100 = 全开 (收拢在两侧)
 * 开合通过改变每片帘布的宽度实现 —— 宽度收窄时褶皱条同步变窄, 视觉上就是收拢堆叠。
 */
export function Curtain({ data }: Props) {
  const p = useStylePalette();
  const state = useDeviceState(data.id, data.device);

  const [w, h, d] = data.size;
  // 没有设备状态时 (素材库缩略图 / 未绑定) 停在 65% 开, 两片帘布都看得见
  const openness = state
    ? Math.min(100, Math.max(0, state.position)) / 100
    : 0.35;

  const halfW = w / 2;
  // 全开时每片收拢到的最小宽度
  const gathered = Math.max(0.07, w * 0.075);
  const panelW = halfW * (1 - openness) + gathered * openness;

  const fabricColor = data.color && data.color !== '#000000' ? data.color : p.fabricLight;
  const trackColor = p.metal;
  const pleats = 7;
  const clothH = h - 0.04;

  const panel = (side: -1 | 1) => {
    // 左片从 -halfW 向中心铺开; 右片镜像
    const outer = side * halfW;
    const startZ = side < 0 ? outer : outer - panelW;
    const centerZ = startZ + panelW / 2;

    return (
      <group key={side}>
        {/* 帘布底衬 (填满褶皱之间的缝, 避免透光) */}
        <mesh position={[0, clothH / 2 + 0.02, centerZ]} castShadow receiveShadow>
          <boxGeometry args={[d * 0.35, clothH, panelW]} />
          <meshStandardMaterial color={fabricColor} roughness={0.92} />
        </mesh>

        {/* 褶皱条 — 交替前后错开形成褶 */}
        {Array.from({ length: pleats }).map((_, i) => {
          const zw = panelW / pleats;
          const z = startZ + zw * (i + 0.5);
          const offset = (i % 2 === 0 ? 1 : -1) * d * 0.16;
          return (
            <mesh key={i} position={[offset, clothH / 2 + 0.02, z]} castShadow>
              <boxGeometry args={[d * 0.5, clothH, zw * 0.9]} />
              <meshStandardMaterial color={fabricColor} roughness={0.95} />
            </mesh>
          );
        })}
      </group>
    );
  };

  return (
    <group
      position={[data.position[0], data.position[1], data.position[2]]}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
    >
      {/* 顶部轨道 */}
      <mesh position={[0, h - 0.01, 0]} castShadow>
        <boxGeometry args={[d * 0.55, 0.025, w * 1.04]} />
        <meshStandardMaterial color={trackColor} roughness={0.35} metalness={0.6} />
      </mesh>

      {panel(-1)}
      {panel(1)}
    </group>
  );
}
