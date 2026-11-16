import * as THREE from 'three';
import type { OutdoorObject } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { useOutdoorPalette, type OutdoorPalette } from '../../../constants/outdoorStyles';
import { getOutdoorObjectElement } from '../../../elements/outdoor/objects';
import { Warehouse } from '../../../elements/outdoor/objects/warehouse/View3D';

/** 拾取代理相对占地的外扩容差 (米): 吸收鼠标落点偏差, 不改变碰撞与高亮尺寸 */
const PICK_PAD = 0.04;

/**
 * 空间对象本体 (无外层定位, 用于场景渲染和缩略图)
 * 内容分派走 elements/outdoor/objects 注册表。
 */
export function OutdoorObjectContent({
  data,
  palette,
}: {
  data: OutdoorObject;
  palette: OutdoorPalette;
}) {
  const el = getOutdoorObjectElement(data.type);
  if (!el) return <Warehouse data={data} palette={palette} />;
  const View3D = el.View3D;
  return <View3D data={data} palette={palette} />;
}

/** 单个空间对象 — 定位/旋转/选中/锁定 */
function OutdoorObjectView({ data }: { data: OutdoorObject }) {
  const palette = useOutdoorPalette();
  const selectedId = useAppStore((s) => s.selectedOutdoorObjectId);
  const layers = useAppStore((s) => s.layers);
  const selectOutdoorObject = useAppStore((s) => s.selectOutdoorObject);
  const beginTransform = useAppStore((s) => s.beginTransform);
  const isTransformTarget = useAppStore((s) => s.transformSession?.id === data.id);
  const isSelected = selectedId === data.id;
  const spaceLocked = layers.find((l) => l.id === 'space')?.locked ?? true;

  const [w, h, d] = data.size;

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (spaceLocked) return;
    selectOutdoorObject(data.id);
    // 左键按下即进入"移动"会话: 拖动期间由 OutdoorTransformController 的 ghost 跟随指针,
    // 松手才提交到 store —— 与室内家具的交互保持一致。
    if (e.button === 0) beginTransform(data.id, 'move');
  };
  const handlePointerOver = (e: any) => {
    if (spaceLocked) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <group
      visible={!isTransformTarget}
      position={data.position}
      rotation={[0, (data.rotation * Math.PI) / 180, 0]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <OutdoorObjectContent data={data} palette={palette} />

      {/* 拾取代理: 与室内家具同款 —— 户外素材同样由细碎几何拼成 (树冠/树叶/车辆轮拱),
          只靠三角面拾取会漏点并误中后方的地面或邻件。隐形盒覆盖整块占地体积, 四周留 4cm 容差。
          户外坐标约定: local X = size[0] (w), local Z = size[2] (d)。 */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w + PICK_PAD, h, d + PICK_PAD]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {isSelected && (
        <group>
          {/* 半透明绿色高亮盒 (纯装饰, 不参与拾取) */}
          <mesh position={[0, h / 2, 0]} raycast={() => null}>
            <boxGeometry args={[w, h, d]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.18} depthWrite={false} />
          </mesh>
          {/* 双层绿色线框 */}
          <lineSegments position={[0, h / 2, 0]} raycast={() => null}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, h * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#16a34a" />
          </lineSegments>
          <lineSegments position={[0, h / 2, 0]} scale={1.015} raycast={() => null}>
            <edgesGeometry args={[new THREE.BoxGeometry(w * 1.01, h * 1.01, d * 1.01)]} />
            <lineBasicMaterial color="#22c55e" transparent opacity={0.6} />
          </lineSegments>
        </group>
      )}
    </group>
  );
}

export function OutdoorObjectsGroup({ items }: { items: OutdoorObject[] }) {
  return (
    <group>
      {items.map((item) => (
        <OutdoorObjectView key={item.id} data={item} />
      ))}
    </group>
  );
}
