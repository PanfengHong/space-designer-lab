import { useRef } from 'react';
import type { GroupProps } from '@react-three/fiber';

// 简易树木，无着色，纯白几何体
export function Tree(props: GroupProps) {
  const treeRef = useRef(null);

  return (
    <group ref={treeRef} {...props}>
      {/* 树干 圆柱 */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.22, 0.3, 2.4, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* 多层树冠圆锥，堆叠 */}
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[1.6, 2.2, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <coneGeometry args={[1.2, 1.8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0, 5.3, 0]}>
        <coneGeometry args={[0.7, 1.4, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}
