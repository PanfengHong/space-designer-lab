/**
 * 拾取标记 —— 跨组件共享的"这个命中代表什么"的约定。
 *
 * 场景: 室内墙体是最大的遮挡物, 从小房间外侧看进去时视线几乎必然先穿过墙,
 * 于是"看得见里面的家具, 却点不中"。解法是让墙在 pointerdown 时检查本次
 * 命中序列 (R3F 的 event.intersections), 若其中有家具的拾取代理, 就让位。
 * 这个标记挂在 mesh 的 userData 上, 因此不受组件层级影响。
 */
export const PICK_FURNITURE = 'furniture';

export interface PickUserData {
  pickKind?: string;
  pickId?: string;
}
