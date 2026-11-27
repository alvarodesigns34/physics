/**
 * ATOM 5.1 · Transferencia local del progreso entre dispositivos, sin servidor ni cuentas:
 * - archivo JSON compartido con la hoja del sistema (AirDrop, Archivos, correo…) mediante Web Share;
 * - código de texto comprimido (gzip + base64url) para copiar en un dispositivo y pegar en otro (en Apple,
 *   el portapapeles universal lo pasa del Mac al iPad).
 * El código lleva una suma de comprobación: un código truncado o alterado se rechaza en lugar de importar
 * datos a medias.
 */
const PREFIX_GZ = 'ATOM1.';
const PREFIX_RAW = 'ATOM0.';

function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

/** Suma de comprobación FNV-1a (8 hexadecimales) del texto original. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeTransfer(json: string): Promise<string> {
  const sum = checksum(json);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'undefined') return `${PREFIX_GZ}${sum}.${toB64url(await pipe(bytes, new CompressionStream('gzip')))}`;
  return `${PREFIX_RAW}${sum}.${toB64url(bytes)}`;
}

export async function decodeTransfer(code: string): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const c = code.trim().replace(/\s+/g, '');
  const m = /^ATOM([01])\.([0-9a-f]{8})\.([A-Za-z0-9_-]+)$/.exec(c);
  if (!m) return { ok: false, error: 'No es un código de transferencia de ATOM (debe empezar por «ATOM1.»).' };
  if (c.length > 4_000_000) return { ok: false, error: 'El código es demasiado largo.' };
  try {
    let bytes = fromB64url(m[3]!);
    if (m[1] === '1') {
      if (typeof DecompressionStream === 'undefined') return { ok: false, error: 'Este navegador no puede descomprimir el código; usa el archivo.' };
      bytes = await pipe(bytes, new DecompressionStream('gzip'));
    }
    const json = new TextDecoder().decode(bytes);
    if (checksum(json) !== m[2]) return { ok: false, error: 'El código está incompleto o alterado (la suma de comprobación no coincide). Cópialo entero otra vez.' };
    return { ok: true, json };
  } catch {
    return { ok: false, error: 'El código está incompleto o dañado. Cópialo entero otra vez.' };
  }
}

/** Comparte el archivo con la hoja del sistema (iPad: AirDrop, Archivos…). Devuelve false si no se puede. */
export async function shareProgressFile(json: string, name: string): Promise<boolean> {
  const file = new File([json], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (!nav.share || !nav.canShare?.({ files: [file] })) return false;
  try {
    await nav.share({ files: [file], title: 'Progreso de ATOM' });
    return true;
  } catch (e) {
    return (e as Error).name === 'AbortError';
  }
}
