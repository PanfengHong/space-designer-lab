import { useMemo } from 'react';
import * as THREE from 'three';
import type { Room } from '../../../../types';
import { useStylePalette } from '../../../../constants/styles';
import { useAppStore, DEVICE_DEFAULTS } from '../../../../store/useAppStore';
import { roomBounds } from '../../../../utils/roomBounds';
import { layoutCeilingLamps } from '../../../../utils/ceilingLamps';

interface CeilingLightProps {
  /** 安装点: 局部原点位于安装面 (天花板底面), 整灯向 -Y 延伸 */
  position: [number, number, number];
  /** 灯罩半径 (m) */
  radius?: number;
  /** 环境自发光强度 (照明模式决定): 白天 0.45, 人造光 1.0 (夜景不强制点灯) */
  intensity?: number;
  monochrome?: boolean;
  /** 设备状态: 开灯 */
  on?: boolean;
  /** 设备状态: 亮度 0-100 */
  brightness?: number;
  /** 设备状态: 色温 2200-6500 K */
  colorTemp?: number;
  /** 设备面板正在控制这一盏 → 画一圈选中环 */
  selected?: boolean;
}

/**
 * 吸顶灯 — 贴顶安装板 + 金属底盘 + 装饰环 + 乳白圆台灯罩 + 底部发光面。
 *
 * 造型参照常见现代吸顶灯: 上窄下宽的浅圆台灯罩, 底盘贴顶不外露灯体。
 * 整灯高度约 0.09m, 不干扰室内剖切视图下的家具观察。
 *
 * 最上面的圆形安装板比灯罩大一圈、颜色贴近天花, 作用是让灯在"隐藏天花板"的
 * 剖切视图里有个落脚的顶棚 —— 否则一盏孤零零的圆盘浮在房间上空, 读不出是灯具。
 */
export function CeilingLight({
  position,
  radius = 0.24,
  intensity = 0.45,
  monochrome = false,
  on = false,
  brightness = 80,
  colorTemp = 3000,
  selected = false,
}: CeilingLightProps) {
  const p = useStylePalette();

  const pad = monochrome ? '#f0f0f0' : '#f4f0e8';
  const plate = monochrome ? '#dcdcdc' : p.metal;
  const ring = monochrome ? '#c4c4c4' : p.metalDark;
  const shade = monochrome ? '#ffffff' : '#f7f1e6';

  // 色温 2200K(暖) → 6500K(冷) 的发光色插值
  const glow = useMemo(() => {
    const t = Math.max(0, Math.min(1, (colorTemp - 2200) / (6500 - 2200)));
    return new THREE.Color('#ffb45e').lerp(new THREE.Color('#e6f1ff'), t).getStyle();
  }, [colorTemp]);

  // 环境底光 (照明模式) + 设备开灯加成 (亮度 0-100 映射到 0~1.2)
  const lit = on ? 0.45 + (Math.max(0, Math.min(100, brightness)) / 100) * 0.75 : 0;
  const shadeEmissive = intensity * 0.9 * (on ? 1.7 : 1) + lit * 0.6;
  const faceEmissive = intensity * 2.1 + lit * 3.2;

  const R = radius;
  const padH = 0.01;
  const plateH = 0.022;
  const shadeH = 0.05;

  const padY = -padH / 2;                       // [-0.010, 0]
  const plateY = -padH - plateH / 2;            // [-0.032, -0.010]
  const shadeTopY = -padH - plateH;             // -0.032
  const shadeBottomY = shadeTopY - shadeH;      // -0.082

  return (
    <group position={position}>
      {/* 顶部安装板 (隐藏天花板时充当灯的顶棚) */}
      <mesh position={[0, padY, 0]} receiveShadow>
        <cylinderGeometry args={[R * 1.16, R * 1.16, padH, 40]} />
        <meshStandardMaterial color={pad} roughness={0.9} />
      </mesh>

      {/* 贴顶底盘 */}
      <mesh position={[0, plateY, 0]} castShadow>
        <cylinderGeometry args={[R, R * 0.97, plateH, 40]} />
        <meshStandardMaterial color={plate} roughness={0.38} metalness={0.5} />
      </mesh>

      {/* 装饰环 (底盘与灯罩交界处) */}
      <mesh position={[0, shadeTopY + 0.004, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.9, 0.014, 10, 44]} />
        <meshStandardMaterial color={ring} roughness={0.3} metalness={0.65} />
      </mesh>

      {/* 乳白灯罩 — 上窄下宽的浅圆台, 开口朝下 */}
      <mesh position={[0, shadeTopY - shadeH / 2, 0]}>
        <cylinderGeometry args={[R * 0.82, R * 0.96, shadeH, 40, 1, true]} />
        <meshStandardMaterial
          color={shade}
          emissive={glow}
          emissiveIntensity={shadeEmissive}
          roughness={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 底部发光面 (朝下) */}
      <mesh position={[0, shadeBottomY + 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.96, 40]} />
        <meshStandardMaterial
          color="#fffaf0"
          emissive={glow}
          emissiveIntensity={faceEmissive}
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 选中环 (设备面板正在控制这一盏) */}
      {selected && (
        <mesh position={[0, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[R * 1.22, R * 1.32, 40]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

interface CeilingLightFixtureProps {
  /** 设备 id: lamp:<roomId>:<index> */
  deviceId: string;
  position: [number, number, number];
  radius: number;
  /** 照明模式给的环境自发光强度 */
  baseIntensity: number;
  monochrome: boolean;
}

/**
 * 可交互的吸顶灯 — 自己订阅本灯的设备状态与选中态, 点击调出灯光面板。
 * 单独包一层是为了让"开关某一盏灯"只重渲染这一盏, 而不是整栋建筑。
 */
export function CeilingLightFixture({
  deviceId,
  position,
  radius,
  baseIntensity,
  monochrome,
}: CeilingLightFixtureProps) {
  const raw = useAppStore((s) => s.devices[deviceId]);
  const selected = useAppStore((s) => s.selectedDeviceId === deviceId);
  const selectDevice = useAppStore((s) => s.selectDevice);
  const selectFurniture = useAppStore((s) => s.selectFurniture);

  const state = { ...DEVICE_DEFAULTS.light, ...(raw ?? {}) };

  return (
    <group
      onClick={(e: any) => {
        // 设备控制不受"建筑结构层锁定"限制 —— 锁定锁的是编辑, 不是使用
        e.stopPropagation();
        selectFurniture(null);
        selectDevice(deviceId);
      }}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <CeilingLight
        position={position}
        radius={radius}
        intensity={baseIntensity}
        monochrome={monochrome}
        on={state.on}
        brightness={state.brightness}
        colorTemp={state.colorTemp}
        selected={selected}
      />
      {/* 不可见命中球 — 灯罩只有 0.5m 直径, 透视/顶视下都很难准确点中 */}
      <mesh position={[position[0], position[1] - 0.05, position[2]]}>
        <sphereGeometry args={[Math.max(radius * 1.7, 0.4), 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
      {/* 开灯时本盏灯独立的点光源 (亮度越低投光越弱) — 夜景靠它形成真实光池 */}
      {state.on && (
        <pointLight
          position={[position[0], position[1] - 0.16, position[2]]}
          color={state.colorTemp >= 4500 ? '#eaf2ff' : '#ffe3b3'}
          intensity={0.9 + (state.brightness / 100) * 2.1}
          distance={4.2 + (state.brightness / 100) * 1.2}
          decay={2}
        />
      )}
    </group>
  );
}

interface RoomCeilingLightsProps {
  room: Room;
  ceilingHeight: number;
  /** 墙体剖切高度 (剖切到灯具以下时整组灯不显示) */
  cutHeight?: number;
  /** 照明模式给的环境自发光强度 */
  baseIntensity: number;
  monochrome: boolean;
}

/**
 * 一个房间的全部吸顶灯。
 *
 * 放在建筑结构层之外渲染: 建筑层锁定时整组 pointerEvents='none',
 * 灯要是留在里面就永远点不开设备面板。灯属于"设备", 锁定不应拦住它。
 */
export function RoomCeilingLights({
  room,
  ceilingHeight,
  cutHeight,
  baseIntensity,
  monochrome,
}: RoomCeilingLightsProps) {
  const bounds = roomBounds(room.walls);
  if (!bounds) return null;

  /**
   * 安装面高度 = 真实层高。
   * 不能贴到剖切面上: 剖切面是"近侧墙被切掉的高度", 灯贴上去会跟着降到半空,
   * 俯视时正好落在床 / 沙发上, 看着像家具的一部分。灯始终留在屋顶原位才对。
   * 剖切高度低于 2m 时视为顶部构件整体剖掉, 不显示。
   */
  if (cutHeight != null && cutHeight < 2.0) return null;
  // 下移 3mm: 底盘顶面与天花板平面共面会 z-fighting
  const mountY = ceilingHeight - 0.003;

  const lamps = layoutCeilingLamps(bounds);
  return (
    <>
      {lamps.map((l, i) => (
        <CeilingLightFixture
          key={`lamp-${room.id}-${i}`}
          deviceId={`lamp:${room.id}:${i}`}
          position={[l.x, mountY, l.z]}
          radius={l.radius}
          baseIntensity={baseIntensity}
          monochrome={monochrome}
        />
      ))}
    </>
  );
}
