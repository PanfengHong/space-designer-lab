import * as THREE from 'three';

/**
 * R3F ↔ DOM 拖拽桥接器
 *
 * R3F 的 camera/gl 只在 Canvas 内部可用, 但 HTML5 拖拽事件 (dragover/drop)
 * 发生在 DOM 层。此单例保存 R3F 的引用, 让 DOM 层的拖拽处理器也能进行 raycast。
 *
 * 使用方式:
 * 1. <R3FBridgeBinder /> 放在 Canvas 内部, 自动绑定 camera/gl
 * 2. DOM 层调用 screenToFloor(clientX, clientY) 获取地板世界坐标
 */

const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 地板平面
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();

export const r3fBridge: {
  camera: THREE.PerspectiveCamera | null;
  gl: THREE.WebGLRenderer | null;
} = {
  camera: null,
  gl: null,
};

/**
 * 将屏幕坐标 (clientX, clientY) 转换为地板平面上的世界坐标 (x, 0, z)
 * 需要 R3FBridgeBinder 已绑定 camera 和 gl
 * 返回 null 表示 raycast 失败 (如相机未就绪或射线未击中地板)
 */
export function screenToFloor(clientX: number, clientY: number): [number, number] | null {
  const { camera, gl } = r3fBridge;
  if (!camera || !gl) return null;

  const rect = gl.domElement.getBoundingClientRect();
  // 转换为 NDC (-1 ~ 1)
  _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  _raycaster.setFromCamera(_ndc, camera);
  // 射线与地板平面求交
  const hit = _raycaster.ray.intersectPlane(_floorPlane, _hit);
  if (!hit) return null;
  return [_hit.x, _hit.z];
}

/**
 * 网格吸附: 将坐标吸附到 0.1m 网格
 */
export function snapToGrid(x: number, z: number, grid = 0.1): [number, number] {
  return [
    Math.round(x / grid) * grid,
    Math.round(z / grid) * grid,
  ];
}

/**
 * 判断世界坐标 (x, z) 是否在任意房间墙体内 (通过 AABB 检测)
 * 返回 roomId 或 null
 */
export function findRoomAt(
  x: number,
  z: number,
  rooms: { id: string; walls: { start: [number, number]; end: [number, number] }[] }[]
): string | null {
  for (const room of rooms) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const w of room.walls) {
      minX = Math.min(minX, w.start[0], w.end[0]);
      maxX = Math.max(maxX, w.start[0], w.end[0]);
      minZ = Math.min(minZ, w.start[1], w.end[1]);
      maxZ = Math.max(maxZ, w.start[1], w.end[1]);
    }
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return room.id;
    }
  }
  return null;
}
