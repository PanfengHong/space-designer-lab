import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import { useAppStore } from '../../store/useAppStore';

interface CameraControllerProps {
  children?: React.ReactNode;
}

export function CameraController({ children }: CameraControllerProps) {
  const { viewMode, resetCamera, triggerResetCamera } = useAppStore();
  const { camera, controls } = useThree() as any;
  const initialTarget = useMemo(() => new THREE.Vector3(5, 0, 5), []);
  const initialPos = useMemo(() => {
    switch (viewMode) {
      case 'axonometric':
        return new THREE.Vector3(12, 12, 12);
      case 'top':
        return new THREE.Vector3(5, 15, 5);
      case 'plan':
        return new THREE.Vector3(5, 15, 5.01);
      case 'walkthrough':
        return new THREE.Vector3(5, 1.6, 5);
      case 'perspective':
      default:
        return new THREE.Vector3(12, 10, 12);
    }
  }, [viewMode]);

  const cameraRef = useRef(initialPos.clone());
  const targetRef = useRef(initialTarget.clone());

  useEffect(() => {
    camera.position.copy(initialPos);
    camera.lookAt(initialTarget);
    if (controls) {
      controls.target.copy(initialTarget);
      controls.update();
    }
  }, [initialPos, initialTarget, resetCamera, camera, controls]);

  useFrame(() => {
    // 可以在这里添加平滑过渡
  });

  // 根据视图模式渲染不同相机
  if (viewMode === 'axonometric' || viewMode === 'top') {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[initialPos.x, initialPos.y, initialPos.z]}
          zoom={60}
          near={0.1}
          far={200}
        />
        {children}
      </>
    );
  }

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[initialPos.x, initialPos.y, initialPos.z]}
        fov={50}
        near={0.1}
        far={500}
      />
      {children}
    </>
  );
}

export function getAxonometricCameraProps() {
  return {
    position: [10, 10, 10] as [number, number, number],
    zoom: 55,
  };
}
