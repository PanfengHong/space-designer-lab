import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../../../store/useAppStore';
import { r3fBridge } from '../../../utils/r3fBridge';

/**
 * R3FBridgeBinder — 放在 Canvas 内部
 * 将 R3F 的 camera 和 gl 绑定到 r3fBridge 单例
 * 让 DOM 层的拖拽事件处理器也能进行 raycast
 */
export function R3FBridgeBinder() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    r3fBridge.camera = camera;
    r3fBridge.gl = gl;
    return () => {
      r3fBridge.camera = null;
      r3fBridge.gl = null;
    };
  }, [camera, gl]);

  return null;
}

/**
 * DragGhost — 拖拽预览
 * 当 store.draggingFurniture 和 store.dragGhostPos 有值时,
 * 在地板上显示半透明家具预览 (绿色=可放置, 红色=不可放置)
 */
export function DragGhost() {
  const draggingFurniture = useAppStore((s) => s.draggingFurniture);
  const dragGhostPos = useAppStore((s) => s.dragGhostPos);
  const sceneData = useAppStore((s) => s.sceneData);

  if (!draggingFurniture || !dragGhostPos) return null;

  const [x, z] = dragGhostPos;
  const [w, h, d] = draggingFurniture.size;

  // 检查是否在房间内 (放置辅助)
  let valid = false;
  for (const room of sceneData.rooms) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const wall of room.walls) {
      minX = Math.min(minX, wall.start[0], wall.end[0]);
      maxX = Math.max(maxX, wall.start[0], wall.end[0]);
      minZ = Math.min(minZ, wall.start[1], wall.end[1]);
      maxZ = Math.max(maxZ, wall.start[1], wall.end[1]);
    }
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      valid = true;
      break;
    }
  }

  const color = valid ? '#22c55e' : '#ef4444';

  return (
    <group position={[x, h / 2, z]}>
      {/* 半透明包围盒 */}
      <mesh>
        <boxGeometry args={[d, h, w]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* 线框 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(d, h, w)]} />
        <lineBasicMaterial color={color} linewidth={2} />
      </lineSegments>
      {/* 地面投影圆 */}
      <mesh position={[0, -h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
