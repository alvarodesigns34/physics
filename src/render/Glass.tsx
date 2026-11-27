/**
 * Vidrio con coste adaptado a la calidad (ATOM 5.0).
 *
 * `transmission` de three.js obliga a dibujar de nuevo toda la escena opaca en una textura auxiliar en
 * CADA fotograma: en tabletas y GPU integradas es el material más caro de la aplicación. Solo se usa en
 * calidad alta. En media y baja se aproxima con transparencia, barniz (clearcoat) y reflejos del entorno,
 * que conservan el aspecto de vidrio sin el pase extra.
 */
import * as THREE from 'three';
import { useQuality } from '../app/hooks';

export interface GlassProps {
  color?: THREE.ColorRepresentation;
  /** Opacidad de la aproximación sin transmisión */
  opacity?: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  roughness?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  side?: THREE.Side;
  envMapIntensity?: number;
}

export function GlassMaterial({ color = '#eef4fb', opacity = 0.3, transmission = 1, thickness = 0.5, ior = 1.5, roughness = 0.05, attenuationColor, attenuationDistance, side = THREE.FrontSide, envMapIntensity = 1.3 }: GlassProps) {
  const q = useQuality();
  if (q.tier === 'alta')
    return <meshPhysicalMaterial color={color} roughness={roughness} metalness={0} transmission={transmission} thickness={thickness} ior={ior} attenuationColor={attenuationColor} attenuationDistance={attenuationDistance} clearcoat={1} envMapIntensity={envMapIntensity} side={side} transparent={opacity < 1} opacity={transmission < 1 ? Math.max(opacity, 0.5) : 1} />;
  return <meshPhysicalMaterial color={color} roughness={roughness} metalness={0} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={envMapIntensity} side={side} transparent opacity={opacity} depthWrite={false} />;
}
