import { it, expect } from 'vitest';
import { NODES } from './syllabus';
import { COVERED_NODES, GENERATORS, SOURCE_EXERCISES } from './registry';
import { MISSIONS } from './campaign';

it('cobertura del temario por ejercicios', () => {
  const missing = NODES.filter((n) => !COVERED_NODES.includes(n.id)).map((n) => n.id);
  console.log(`generadores: ${GENERATORS.length} · fuentes: ${SOURCE_EXERCISES.length} · misiones: ${MISSIONS.length} · nodos cubiertos: ${COVERED_NODES.length}/${NODES.length} · sin cubrir: ${missing.join(', ') || 'ninguno'}`);
  expect(missing.length).toBe(0);
});

it('todas las misiones construyen sus ejercicios sin error', () => {
  for (const m of MISSIONS) for (const s of m.steps) if (s.kind === 'ejercicio') expect(s.build().parts.length).toBeGreaterThan(0);
});
