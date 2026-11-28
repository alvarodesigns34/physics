/**
 * ATOM 6.0 · «Retomar»: recuerda el último lugar de estudio (ruta completa con sus parámetros) para volver
 * exactamente ahí desde el inicio. Es una comodidad por dispositivo (localStorage), no progreso: si el
 * almacenamiento falla, simplemente no aparece. El hash se valida al leerlo (mismo analizador que las rutas).
 */
export interface LastPlace {
  hash: string;
  label: string;
  at: number;
}
const KEY = 'atom:last';

export function saveLastPlace(p: LastPlace) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento */
  }
}

export function readLastPlace(): LastPlace | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LastPlace> | null;
    if (!v || typeof v.hash !== 'string' || typeof v.label !== 'string' || !Number.isFinite(v.at)) return null;
    if (!/^#\/[a-z]+(\?[^<>\s]{0,300})?$/.test(v.hash) || v.label.length > 120) return null;
    return v as LastPlace;
  } catch {
    return null;
  }
}
