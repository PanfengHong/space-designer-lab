import type { Room, WallSegment, Door, Window, FrenchWindow } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { Floor } from './building/Floor';
import { Walls } from './building/Walls';
import { Doors } from './building/Doors';
import { Windows } from './building/Windows';
import { BayWindows } from './building/BayWindow';
import { FrenchWindows } from './building/FrenchWindow';
import { Stairs } from './building/Stairs';
import { ElevatorDoor } from './building/ElevatorDoor';

/**
 * 找到沿墙方向投影 t 值, 以及垂直距离是否在容差内
 */
function projectOnWall(
  px: number, pz: number,
  x1: number, z1: number, x2: number, z2: number, len: number,
): { t: number; onWall: boolean } {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const perpDist = Math.abs(dx) > Math.abs(dz)
    ? Math.abs(pz - z1)
    : Math.abs(px - x1);
  if (perpDist > 0.15) return { t: 0, onWall: false };
  const t = (dx * (px - x1) + dz * (pz - z1)) / len;
  return { t, onWall: t >= -0.05 && t <= len + 0.05 };
}

/**
 * 将门的位置转换为墙体 cutout (仅门打开时生效)
 */
function applyDoorCutouts(walls: WallSegment[], doors: Door[]): WallSegment[] {
  return walls.map((wall) => {
    const [x1, z1] = wall.start;
    const [x2, z2] = wall.end;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) return wall;

    const wallDoors = doors.filter((door) => {
      const [doorX, , doorZ] = door.position;
      return projectOnWall(doorX, doorZ, x1, z1, x2, z2, len).onWall;
    });

    if (wallDoors.length === 0) return wall;

    const door = wallDoors[0];
    const [doorX, , doorZ] = door.position;
    const { t: tCenter } = projectOnWall(doorX, doorZ, x1, z1, x2, z2, len);
    const halfW = door.width / 2;
    const tStart = Math.max(0, tCenter - halfW);
    const tEnd = Math.min(len, tCenter + halfW);

    return {
      ...wall,
      cutout: { start: tStart, end: tEnd, sill: 0, top: door.height },
    };
  });
}

/**
 * 将窗户的位置转换为墙体 cutout (始终生效, 窗户需要透明)
 * position[1] 为窗台高度, height 为窗高
 */
function applyWindowCutouts(walls: WallSegment[], windows: Window[]): WallSegment[] {
  return walls.map((wall) => {
    // 已有 cutout (飘窗) 的墙不覆盖
    if (wall.cutout) return wall;

    const [x1, z1] = wall.start;
    const [x2, z2] = wall.end;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) return wall;

    const wallWins = windows.filter((win) => {
      const [winX, , winZ] = win.position;
      return projectOnWall(winX, winZ, x1, z1, x2, z2, len).onWall;
    });

    if (wallWins.length === 0) return wall;

    const win = wallWins[0];
    const [winX, winY, winZ] = win.position;
    const { t: tCenter } = projectOnWall(winX, winZ, x1, z1, x2, z2, len);
    const halfW = win.width / 2;
    const tStart = Math.max(0, tCenter - halfW);
    const tEnd = Math.min(len, tCenter + halfW);

    return {
      ...wall,
      cutout: { start: tStart, end: tEnd, sill: winY, top: winY + win.height },
    };
  });
}

/**
 * 将落地窗的位置转换为墙体 cutout (始终生效)
 * 落地窗从地面起 (sill=0), 高度为 height
 */
function applyFrenchWindowCutouts(walls: WallSegment[], frenchWindows: FrenchWindow[]): WallSegment[] {
  return walls.map((wall) => {
    if (wall.cutout) return wall;

    const [x1, z1] = wall.start;
    const [x2, z2] = wall.end;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) return wall;

    const wallFWs = frenchWindows.filter((fw) => {
      const [fwX, , fwZ] = fw.position;
      return projectOnWall(fwX, fwZ, x1, z1, x2, z2, len).onWall;
    });

    if (wallFWs.length === 0) return wall;

    const fw = wallFWs[0];
    const [fwX, , fwZ] = fw.position;
    const { t: tCenter } = projectOnWall(fwX, fwZ, x1, z1, x2, z2, len);
    const halfW = fw.width / 2;
    const tStart = Math.max(0, tCenter - halfW);
    const tEnd = Math.min(len, tCenter + halfW);

    return {
      ...wall,
      cutout: { start: tStart, end: tEnd, sill: 0, top: fw.height },
    };
  });
}

interface BuildingProps {
  room: Room;
  wallThickness: number;
  floorThickness: number;
  ceilingHeight: number;
  wallColor: string;
  floorColor: string;
  cutHeight?: number;
  showCeiling?: boolean;
  doorsOpen?: boolean;
  monochrome?: boolean;
}

/**
 * 建筑结构层 — 统一渲染地板、墙体、门、窗、飘窗、落地窗
 */
export function Building({
  room,
  wallThickness,
  floorThickness,
  ceilingHeight,
  wallColor,
  floorColor,
  cutHeight,
  showCeiling = true,
  doorsOpen = false,
  monochrome = false,
}: BuildingProps) {
  // 收集所有房间的门和窗 (共享墙需要两侧都开洞)
  const sceneData = useAppStore((s) => s.sceneData);
  const allDoors: Door[] = sceneData.rooms.flatMap((r) => r.doors);
  const allWindows: Window[] = sceneData.rooms.flatMap((r) => r.windows);
  const allFrenchWindows: FrenchWindow[] = sceneData.rooms.flatMap((r) => r.frenchWindows ?? []);
  // 窗户/落地窗始终需要透明 → 始终挖出窗洞
  let wallSegments = applyWindowCutouts(room.walls, allWindows);
  wallSegments = applyFrenchWindowCutouts(wallSegments, allFrenchWindows);
  // 门打开时, 在门所在墙体上挖出洞口
  if (doorsOpen) {
    wallSegments = applyDoorCutouts(wallSegments, allDoors);
  }

  return (
    <group>
      <Floor
        segments={room.walls}
        roomId={room.id}
        thickness={floorThickness}
        color={floorColor}
      />
      <Walls
        segments={wallSegments}
        roomId={room.id}
        height={ceilingHeight}
        thickness={wallThickness}
        cutHeight={cutHeight}
        showCeiling={showCeiling}
        color={wallColor}
      />
      <Doors
        doors={room.doors}
        roomId={room.id}
        wallThickness={wallThickness}
        doorsOpen={doorsOpen}
        monochrome={monochrome}
      />
      <Windows
        windows={room.windows}
        roomId={room.id}
        wallThickness={wallThickness}
        monochrome={monochrome}
      />
      {room.bayWindows && room.bayWindows.length > 0 && (
        <BayWindows
          bayWindows={room.bayWindows}
          roomId={room.id}
          wallThickness={wallThickness}
          monochrome={monochrome}
        />
      )}
      {room.frenchWindows && room.frenchWindows.length > 0 && (
        <FrenchWindows
          frenchWindows={room.frenchWindows}
          roomId={room.id}
          wallThickness={wallThickness}
          monochrome={monochrome}
        />
      )}
      {room.stairs && room.stairs.length > 0 && (
        <Stairs flights={room.stairs} roomId={room.id} />
      )}
      {room.elevators && room.elevators.length > 0 && (
        <ElevatorDoor elevators={room.elevators} roomId={room.id} />
      )}
    </group>
  );
}
