/**
 * OrbitControls compatibles con el renderizado bajo demanda: la rotación automática (decorativa) solo
 * actúa durante la ventana de interacción; en reposo la cámara se queda quieta y no se dibuja nada.
 */
import { useRef, type ComponentProps } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { inInteractionWindow } from './demand';

type Props = ComponentProps<typeof OrbitControls>;

export function CalmOrbitControls({ autoRotate, ...rest }: Props) {
  const ref = useRef<{ autoRotate: boolean } | null>(null);
  useFrame(() => {
    if (ref.current) ref.current.autoRotate = !!autoRotate && inInteractionWindow();
  });
  return <OrbitControls ref={ref as never} autoRotate={false} {...rest} />;
}
