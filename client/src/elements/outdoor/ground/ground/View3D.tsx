import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ContentProps } from '../../types';

extend({ RoundedBoxGeometry });

/** 地面基座 — 白色大平台 (从原 GroundItems.tsx 迁入) */
export function GroundSlab({ data, palette }: ContentProps) {
  const [w, h, d] = data.size;
  return (
    <group>
      <mesh receiveShadow castShadow>
        <roundedBoxGeometry args={[w, h, d, 3, 0.08]} />
        <meshStandardMaterial color={palette.ground} roughness={0.9} />
      </mesh>
      {/* 外轮廓浅描边 */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w * 1.002, h * 1.002, d * 1.002)]} />
        <lineBasicMaterial color={palette.edge} />
      </lineSegments>
    </group>
  );
}
