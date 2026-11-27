/**
 * Glifos de los laboratorios: dibujos lineales que resumen el fenómeno de cada uno (no son logotipos).
 * Usan `currentColor` y la variable --lab, así funcionan en tema claro y oscuro.
 */
import type { Route } from '../../app/hooks';

export const LAB_META: { route: Route; label: string; blurb: string; topics: string; color: string }[] = [
  { route: '/forja', label: 'Atomic Forge', blurb: 'Construye átomos, isótopos e iones partícula a partícula.', topics: 'Z · A · isótopos · iones', color: 'var(--b1)' },
  { route: '/historia', label: 'Time Machine', blurb: 'Repite los experimentos que cambiaron el modelo atómico.', topics: 'Thomson · Rutherford · Bohr', color: 'var(--b2)' },
  { route: '/fotones', label: 'Photon Lab', blurb: 'Ondas, fotones y el espectro del hidrógeno.', topics: 'λ · ν · E · Rydberg', color: 'var(--b3)' },
  { route: '/masas', label: 'Mass Spectrometry', blurb: 'Separa isótopos y calcula la masa atómica media.', topics: 'abundancias · masa media', color: 'var(--b4)' },
  { route: '/cuantico', label: 'Quantum Space', blurb: 'Orbitales en 3D, nodos, fase y probabilidad radial.', topics: 'n · l · m · orbitales', color: 'var(--b5)' },
  { route: '/arquitecto', label: 'Electron Architect', blurb: 'Llena orbitales con Aufbau, Pauli y Hund.', topics: 'configuración · excepciones', color: 'var(--b6)' },
  { route: '/periodico', label: 'Periodic Universe', blurb: 'La tabla periódica y sus tendencias, en mapas y gráficos.', topics: 'radio · EI · electronegatividad', color: 'var(--b7)' },
];

export function LabGlyph({ route }: { route: Route }) {
  const common = { width: 56, height: 56, viewBox: '0 0 56 56', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'lab-glyph' };
  switch (route) {
    case '/forja':
      return (
        <svg {...common}>
          <ellipse cx="28" cy="28" rx="22" ry="9" opacity=".35" />
          <ellipse cx="28" cy="28" rx="22" ry="9" transform="rotate(60 28 28)" opacity=".35" />
          <ellipse cx="28" cy="28" rx="22" ry="9" transform="rotate(-60 28 28)" opacity=".35" />
          <circle cx="25.5" cy="27" r="3.2" fill="var(--proton)" stroke="none" />
          <circle cx="30.5" cy="27" r="3.2" fill="var(--neutron)" stroke="none" />
          <circle cx="28" cy="31" r="3.2" fill="var(--proton)" stroke="none" />
          <circle cx="50" cy="28" r="2" fill="var(--electron)" stroke="none" />
        </svg>
      );
    case '/historia':
      return (
        <svg {...common}>
          <circle cx="40" cy="28" r="2.4" fill="var(--lab)" stroke="none" />
          <path d="M4 18h30M4 28h30M4 38h30" opacity=".3" />
          <path d="M4 22c18 0 30 0 33 3.5M4 34c18 0 30 0 33-3.5" />
          <path d="M4 26.5c22 0 33 0 34 1.3-1 1.6-6 9-18 22" />
        </svg>
      );
    case '/fotones':
      return (
        <svg {...common}>
          <path d="M6 30c3-8 6-8 9 0s6 8 9 0" />
          <path d="M30 40 40 16l10 24Z" />
          <path d="M24 30h9" opacity=".5" />
          <path d="M44 28l8-6" stroke="#7b4fd6" />
          <path d="M45 30l8-2" stroke="#2f7fd8" />
          <path d="M45 32l8 2" stroke="#1d8a52" />
          <path d="M44 34l8 6" stroke="#d4573a" />
        </svg>
      );
    case '/masas':
      return (
        <svg {...common}>
          <path d="M6 44h44" opacity=".35" />
          <path d="M12 44V22M22 44V12M32 44V34M42 44V38" strokeWidth="3" stroke="var(--lab)" />
          <path d="M6 12c10 0 20 6 26 18" opacity=".5" strokeDasharray="2 3" />
        </svg>
      );
    case '/cuantico':
      return (
        <svg {...common}>
          <path d="M28 28c-4-6-4-18 0-22 4 4 4 16 0 22Z" fill="color-mix(in srgb, var(--lab) 22%, transparent)" />
          <path d="M28 28c4 6 4 18 0 22-4-4-4-16 0-22Z" fill="color-mix(in srgb, var(--electron) 22%, transparent)" />
          <path d="M8 28h40" opacity=".3" />
          <circle cx="28" cy="28" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case '/arquitecto':
      return (
        <svg {...common}>
          <rect x="6" y="34" width="10" height="10" rx="2" />
          <rect x="22" y="22" width="10" height="10" rx="2" />
          <rect x="32" y="22" width="10" height="10" rx="2" />
          <rect x="42" y="22" width="10" height="10" rx="2" opacity=".5" />
          <path d="M9.5 42v-6M12.5 36v6M25 30v-6M35 30v-6M45 30v-6" stroke="var(--lab)" />
          <path d="M6 14h46" opacity=".25" />
        </svg>
      );
    case '/periodico':
      return (
        <svg {...common}>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5].map((c) =>
              (r === 0 && c > 0 && c < 5) ? null : <rect key={`${r}-${c}`} x={5 + c * 8} y={10 + r * 9} width="6.5" height="7.5" rx="1.5" fill={c === 0 ? 'color-mix(in srgb, var(--lab) 45%, transparent)' : c === 5 ? 'color-mix(in srgb, var(--electron) 30%, transparent)' : 'none'} opacity={r === 0 || c === 0 || c === 5 ? 1 : 0.55} />,
            ),
          )}
        </svg>
      );
    default:
      return null;
  }
}
