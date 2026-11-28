/**
 * ATOM 5.1 · Piezas de la tabla periódica con el símbolo y Z impresos en su cara superior.
 *
 * ATOM 5.0 dibujaba 118 etiquetas DOM y las proyectaba en cada fotograma: caras de mover, borrosas sobre
 * piezas inclinadas y ajenas a la perspectiva. Ahora un atlas (una textura de 2048 × 1024 con las 118
 * casillas) se muestrea en el sombreador solo en la cara superior de cada pieza: el texto queda grabado
 * en el material, se ve en perspectiva, no cuesta ninguna llamada de dibujo extra y el color de la tinta
 * se adapta a la luminancia de la pieza para mantener el contraste (oscura sobre claro y al revés).
 */
import * as THREE from 'three';
import { ELEMENTS } from '../../science/elements';

const COLS = 16;
const ROWS = 8;
const CELL = 128;

export function buildAtlas(fontFamily = '"Inter Atom", system-ui, sans-serif'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = COLS * CELL;
  c.height = ROWS * CELL;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  for (const el of ELEMENTS) {
    const i = el.z - 1;
    const x0 = (i % COLS) * CELL;
    const y0 = Math.floor(i / COLS) * CELL;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.font = `650 27px ${fontFamily}`;
    g.globalAlpha = 0.9;
    g.fillText(String(el.z), x0 + 12, y0 + 9);
    g.globalAlpha = 1;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = el.symbol.length > 2 ? 48 : 64;
    g.font = `700 ${size}px ${fontFamily}`;
    g.fillText(el.symbol, x0 + CELL / 2, y0 + CELL / 2 + 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Material físico con el atlas inyectado (atributo por instancia `aCell` = Z − 1). */
export function tileMaterial(atlas: THREE.Texture, footprint: number): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAtlas = { value: atlas };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute float aCell;\nvarying vec2 vAtlas;\nvarying float vTop;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTop = step(0.9, objectNormal.y) * step(0.95, position.y);
        vec2 uvT = vec2(position.x / ${footprint.toFixed(4)} + 0.5, 0.5 - position.z / ${footprint.toFixed(4)});
        float cCol = mod(aCell, ${COLS}.0);
        float cRow = floor(aCell / ${COLS}.0);
        vAtlas = vec2((cCol + uvT.x) / ${COLS}.0, 1.0 - (cRow + 1.0 - uvT.y) / ${ROWS}.0);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uAtlas;\nvarying vec2 vAtlas;\nvarying float vTop;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (vTop > 0.5) {
          float a = texture2D(uAtlas, vAtlas).a;
          float lum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          vec3 ink = lum > 0.16 ? vec3(0.025, 0.027, 0.032) : vec3(0.93, 0.9, 0.85);
          diffuseColor.rgb = mix(diffuseColor.rgb, ink, a);
        } else {
          // Laterales: el mismo color, más profundo (pieza de vidrio tintado vista de canto)
          diffuseColor.rgb *= 0.42;
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'atom-tile-atlas';
  return mat;
}

export function cellAttribute(): THREE.InstancedBufferAttribute {
  return new THREE.InstancedBufferAttribute(new Float32Array(ELEMENTS.map((e) => e.z - 1)), 1);
}
