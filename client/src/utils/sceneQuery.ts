import type { Furniture, SceneData } from '../types';

/** 在场景中按 id 查找家具 (跨房间) */
export function findFurniture(scene: SceneData, id: string | null | undefined): Furniture | null {
  if (!id) return null;
  for (const room of scene.rooms) {
    const f = room.furniture.find((x) => x.id === id);
    if (f) return f;
  }
  return null;
}

/** 把角度规范到 [0, 360) */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
