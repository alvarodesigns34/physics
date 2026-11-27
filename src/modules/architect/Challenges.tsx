/**
 * Panel de desafíos del Electron Architect: construir, diagnosticar y reparar configuraciones.
 */
import { useEffect, useState } from 'react';
import { CHALLENGES, checkChallenge, type ChallengeCheck, type Rule } from '../../learning/architectChallenges';
import { useArchitect } from './Architect';
import { Feedback } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { sfx } from '../../app/sound';

const KEY = 'atom:arch-desafios';
const RULE_LABEL: Record<Rule, string> = { pauli: 'Principio de exclusión de Pauli', hund: 'Regla de Hund', aufbau: 'Orden de llenado (Aufbau / Möller)' };

function loadDone(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function ChallengesPanel() {
  const set = useArchitect((s) => s.set);
  // Al salir del laboratorio, el desafío deja de estar activo.
  useEffect(() => () => useArchitect.getState().set({ challenge: null }), []);
  const [active, setActive] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>(loadDone);
  const [rule, setRule] = useState<Rule | null>(null);
  const [result, setResult] = useState<ChallengeCheck | null>(null);
  const ch = CHALLENGES.find((c) => c.id === active) ?? null;
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(done));
    } catch {
      /* sin almacenamiento */
    }
  }, [done]);
  const start = (id: string) => {
    const c = CHALLENGES.find((x) => x.id === id)!;
    setActive(id);
    setRule(null);
    setResult(null);
    set({ z: c.z, charge: c.charge, boxes: c.preset ? structuredClone(c.preset) : {}, focus: null, challenge: id });
  };
  const check = () => {
    if (!ch) return;
    const r = checkChallenge(ch, useArchitect.getState().boxes);
    setResult(r);
    (r.ok ? sfx.success : sfx.error)();
    if (r.ok && !done.includes(ch.id)) setDone([...done, ch.id]);
  };
  const next = CHALLENGES.find((c) => !done.includes(c.id) && c.id !== active);
  return (
    <section className="section" aria-label="Desafíos">
      <div className="row row--between">
        <span className="eyebrow">Desafíos</span>
        <span className="small faint num">
          {done.length}/{CHALLENGES.length}
        </span>
      </div>
      {!ch ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>
            Construye tú la configuración en las cajas: ATOM la comprueba con Pauli, Hund y Aufbau.
          </p>
          <div className="challenge-list">
            {CHALLENGES.map((c) => (
              <button key={c.id} type="button" className={`challenge-chip${done.includes(c.id) ? ' is-done' : ''}`} onClick={() => start(c.id)}>
                {done.includes(c.id) && <Icon name="check" size={14} />} {c.title}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="challenge-card fade" key={ch.id}>
          <span className="h3">{ch.title}</span>
          <p className="small" style={{ margin: 0 }}>
            {ch.brief}
          </p>
          {ch.brokenRule && !rule ? (
            <div className="stack-8" role="radiogroup" aria-label="Regla incumplida">
              <span className="small muted">Primero: ¿qué regla incumple?</span>
              {(Object.keys(RULE_LABEL) as Rule[]).map((r) => (
                <button key={r} type="button" className="btn btn--sm" style={{ justifyContent: 'flex-start' }} onClick={() => setRule(r)}>
                  {RULE_LABEL[r]}
                </button>
              ))}
            </div>
          ) : (
            <>
              {ch.brokenRule && rule && (
                <Feedback tone={rule === ch.brokenRule ? 'ok' : 'warn'}>
                  {rule === ch.brokenRule ? `Correcto: incumple ${RULE_LABEL[ch.brokenRule].toLowerCase()}. Ahora repárala en las cajas.` : `No: incumple ${RULE_LABEL[ch.brokenRule].toLowerCase()}. Fíjate en el aviso del diagnóstico y repárala.`}
                </Feedback>
              )}
              <div className="row row--wrap">
                <button type="button" className="btn btn--primary btn--sm" onClick={check}>
                  Comprobar
                </button>
                {result && !result.ok && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setResult({ ok: false, message: ch.hint })}>
                    <Icon name="bulb" size={16} /> Pista
                  </button>
                )}
              </div>
            </>
          )}
          {result && <Feedback tone={result.ok ? 'ok' : 'bad'}>{result.message}</Feedback>}
          <div className="row row--between">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setActive(null);
                set({ challenge: null });
              }}
            >
              <Icon name="arrow-left" size={16} /> Todos los desafíos
            </button>
            {result?.ok && next && (
              <button type="button" className="btn btn--sm" onClick={() => start(next.id)}>
                Siguiente: {next.title} <Icon name="arrow-right" size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
