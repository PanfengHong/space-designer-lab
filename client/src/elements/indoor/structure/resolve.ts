import type { SceneData } from '../../../types';
import type { ResolvedStructure } from '../../common/CommonConfig';

/**
 * 把结构 selector ("type:roomId:id") 解析成属性面板可直接渲染的通用模型。
 *
 * 只解析「通用配置」需要的字段; 元素特有字段 (门铰链/窗样式/地板材质)
 * 由各元素的 Config 自己从场景数据里取, 见 elements/indoor/structure/<type>/Config.tsx。
 *
 * selector 前缀: floor | wall | door | window | bay | french
 */
export function resolveStructure(selector: string | null, sceneData: SceneData): ResolvedStructure | null {
  if (!selector) return null;
  const [type, roomId, id] = selector.split(':');
  const room = sceneData.rooms.find((r) => r.id === roomId);
  if (!room) return null;

  if (type === 'floor') {
    return {
      type: '地板',
      name: `${room.name} 地板`,
      id: room.id,
      position: null,
      size: null,
      extra: {},
    };
  }
  if (type === 'wall') {
    const seg = room.walls.find((w) => w.id === id);
    if (!seg) return null;
    const len = Math.sqrt((seg.end[0] - seg.start[0]) ** 2 + (seg.end[1] - seg.start[1]) ** 2);
    return {
      type: '墙体',
      name: `${room.name} ${seg.id}`,
      id: seg.id,
      position: null,
      size: null,
      extra: { length: len, start: seg.start, end: seg.end, height: seg.height },
    };
  }
  if (type === 'door') {
    const d = room.doors.find((x) => x.id === id);
    if (!d) return null;
    return {
      type: '门',
      name: `${room.name} ${d.id}`,
      id: d.id,
      position: d.position,
      size: [d.width, d.height],
      extra: { rotation: d.rotation ?? 0 },
    };
  }
  if (type === 'window') {
    const w = room.windows.find((x) => x.id === id);
    if (!w) return null;
    return {
      type: '窗',
      name: `${room.name} ${w.id}`,
      id: w.id,
      position: w.position,
      size: [w.width, w.height],
      extra: { rotation: w.rotation ?? 0 },
    };
  }
  if (type === 'bay') {
    const b = (room.bayWindows ?? []).find((x) => x.id === id);
    if (!b) return null;
    return {
      type: '飘窗',
      name: `${room.name} ${b.id}`,
      id: b.id,
      position: b.position,
      size: [b.width, b.height, b.depth],
      extra: { rotation: b.rotation ?? 0 },
    };
  }
  if (type === 'french') {
    const f = (room.frenchWindows ?? []).find((x) => x.id === id);
    if (!f) return null;
    return {
      type: '落地窗',
      name: `${room.name} ${f.id}`,
      id: f.id,
      position: f.position,
      size: [f.width, f.height],
      extra: { rotation: f.rotation ?? 0 },
    };
  }
  return null;
}
