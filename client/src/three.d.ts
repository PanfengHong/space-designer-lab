import type { ThreeElements } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type RoundedBoxGeometryProps = ConstructorParameters<typeof RoundedBoxGeometry>;

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends ThreeElements {
        roundedBoxGeometry: ThreeElements['boxGeometry'] & {
          args?: RoundedBoxGeometryProps;
        };
      }
    }
  }
}
