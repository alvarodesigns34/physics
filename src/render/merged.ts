/**
 * ATOM 5.2 · Fusión de geometría estática: varias piezas con el MISMO material se dibujan en una sola
 * llamada. Cada pieza se transforma (posición, rotación, escala) antes de unirse; las geometrías de
 * partida se liberan y la fusionada se libera al desmontar.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';

export interface Part {
  geo: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const ready = parts.map(({ geo, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) => {
    const g = geo;
    m.compose(new THREE.Vector3(...position), q.setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    g.applyMatrix4(m);
    return g;
  });
  const merged = mergeBufferGeometries(ready, false);
  for (const g of ready) g.dispose();
  if (!merged) throw new Error('mergeParts: geometrías incompatibles');
  merged.computeBoundingSphere();
  return merged;
}

export function useMergedGeometry(build: () => Part[], deps: unknown[] = []): THREE.BufferGeometry {
  const geo = useMemo(() => mergeParts(build()), deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return geo;
}
