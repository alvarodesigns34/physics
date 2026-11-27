import { AnchoredLabel, LabelLayer } from '../../render/labels';
import { navigate } from '../../app/hooks';
import { useStore } from '../../state/store';
import { CHAPTERS, MISSIONS, ROMAN, missionRoute } from '../../learning/campaign';
import { EpiTag, Stars } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { CampaignMapScene, useMapUI } from './CampaignMap';

const CHAPTER_LAB_ROUTE: Record<string, string> = { forja: '/forja', fotones: '/fotones', historia: '/historia', masas: '/masas', cuantico: '/cuantico', arquitecto: '/arquitecto', periodico: '/periodico' };

export function HubScene() {
  const startMission = useStore((s) => s.startMission);
  return (
    <CampaignMapScene
      onPick={(id) => {
        const m = MISSIONS.find((x) => x.id === id)!;
        startMission(id);
        navigate(missionRoute(m));
      }}
    />
  );
}

/** Rótulos del mapa: un botón por capítulo (abre su laboratorio) y la ficha de la misión señalada. */
function MapLabels() {
  const hovered = useMapUI((s) => s.hovered);
  const campaign = useStore((s) => s.campaign);
  const next = MISSIONS.find((m) => campaign[m.id]?.status !== 'completada');
  const shown = MISSIONS.filter((m) => m.id === hovered || (!hovered && m.id === next?.id));
  return (
    <LabelLayer>
      {CHAPTERS.map((ch) => {
        const ms = MISSIONS.filter((m) => m.chapter === ch.id);
        const done = ms.filter((m) => campaign[m.id]?.status === 'completada').length;
        return (
          <AnchoredLabel key={ch.id} id={`ch-${ch.id}`} align="bottom">
            <button type="button" className="map-chapter" onClick={() => navigate(CHAPTER_LAB_ROUTE[ch.lab]!)} aria-label={`Capítulo ${ROMAN[ch.id]}, ${ch.title}: ${done} de ${ms.length} misiones. Abrir su laboratorio`}>
              <span className="map-chapter__num">{ROMAN[ch.id]}</span>
              <span className="map-chapter__title">{ch.title}</span>
              <span className="map-chapter__count">
                {done}/{ms.length}
              </span>
            </button>
          </AnchoredLabel>
        );
      })}
      {shown.map((m) => (
        <AnchoredLabel key={m.id} id={`ms-${m.id}`} align="bottom">
          <span className="map-mission" aria-hidden="true">
            <span className="mono">{m.code}</span> {m.title}
            {m.id === next?.id && <span className="map-mission__tag">{campaign[m.id]?.status === 'en-curso' ? 'en curso' : 'siguiente'}</span>}
          </span>
        </AnchoredLabel>
      ))}
    </LabelLayer>
  );
}

export function HubOverlay() {
  const campaign = useStore((s) => s.campaign);
  const alias = useStore((s) => s.settings.alias);
  const startMission = useStore((s) => s.startMission);
  const next = MISSIONS.find((m) => campaign[m.id]?.status !== 'completada');
  const completed = MISSIONS.filter((m) => campaign[m.id]?.status === 'completada').length;
  const play = (id: string) => {
    const m = MISSIONS.find((x) => x.id === id)!;
    startMission(id);
    navigate(missionRoute(m));
  };
  return (
    <div className="workspace">
      <MapLabels />
      <div style={{ position: 'relative' }}>
        <div className="enter desktop-only map-title">
          <span className="eyebrow eyebrow--accent">Campaña · {completed}/{MISSIONS.length} misiones</span>
          <h1 className="map-title__h">El recorrido{alias ? `, ${alias}` : ''}</h1>
          <p className="small muted" style={{ maxWidth: '38ch', margin: 0 }}>Siete capítulos en espiral alrededor de un átomo de neón. Toca un nodo para empezar su misión o un capítulo para abrir su laboratorio.</p>
          <EpiTag kind="esquema">Espiral: metáfora del recorrido · átomo central: densidad del Ne calculada</EpiTag>
        </div>
      </div>
      <aside className="side interactive enter" aria-label="Campaña" style={{ animationDelay: '80ms' }}>
        <div className="side__scroll">
          <section className="section mobile-only">
            <span className="eyebrow eyebrow--accent">Estructura atómica · Sistema periódico</span>
            <h1 className="h2">La materia, de cerca{alias ? `, ${alias}` : ''}.</h1>
            <p className="small muted">Construye átomos, haz que emitan luz y comprueba con cálculos de verdad lo que dice el temario. Toca un capítulo para abrir su laboratorio o una misión para empezarla.</p>
          </section>
          <section className="section" aria-label="Preparar el examen">
            <span className="eyebrow">Preparar el examen</span>
            <div className="hub-quick">
              <a href="#/guia" className="card hub-quick__item">
                <span className="h3">Guía de estudio</span>
                <span className="small muted">Teoría explicada, fórmulas, errores típicos y ejemplos resueltos</span>
              </a>
              <a href="#/entrenamiento?v=examen" className="card hub-quick__item">
                <span className="h3">Examen tipo</span>
                <span className="small muted">8 preguntas, 10 puntos, 50 minutos, con corrección</span>
              </a>
            </div>
          </section>
          <section className="section">
            <div className="row row--between">
              <span className="eyebrow">Campaña</span>
              <span className="small faint num">
                {completed}/{MISSIONS.length}
              </span>
            </div>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${(completed / MISSIONS.length) * 100}%` }} />
            </div>
            {next && (
              <button type="button" className="card" onClick={() => play(next.id)} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, borderColor: 'var(--accent-line)', background: 'var(--accent-quiet)' }}>
                <span className="eyebrow eyebrow--accent">{campaign[next.id]?.status === 'en-curso' ? 'Continuar' : 'Siguiente misión'} · {next.code}</span>
                <span className="h3">{next.title}</span>
                <span className="small muted">{next.brief}</span>
                <span className="row small" style={{ color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                  Empezar <Icon name="arrow-right" size={16} />
                </span>
              </button>
            )}
          </section>
          {CHAPTERS.map((ch) => (
            <details key={ch.id} className="section chapter" open={ch.id === (next?.chapter ?? 1)}>
              <summary className="row row--between" style={{ cursor: 'pointer', listStyle: 'none' }}>
                <span className="stack-8" style={{ gap: 2 }}>
                  <span className="eyebrow">Capítulo {ROMAN[ch.id]}</span>
                  <span className="h2" style={{ fontSize: '1.6rem' }}>
                    {ch.title}
                  </span>
                  <span className="small muted">{ch.subtitle}</span>
                </span>
                <span className="mono small faint">
                  {MISSIONS.filter((m) => m.chapter === ch.id && campaign[m.id]?.status === 'completada').length}/{MISSIONS.filter((m) => m.chapter === ch.id).length}
                </span>
              </summary>
              <ul className="stack-8" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {MISSIONS.filter((m) => m.chapter === ch.id).map((m) => {
                  const st = campaign[m.id];
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => play(m.id)} className="btn btn--ghost btn--block" style={{ justifyContent: 'space-between', minHeight: 44, padding: '0 10px' }}>
                        <span className="row" style={{ gap: 10, minWidth: 0 }}>
                          <span className="mono faint" style={{ width: 34, textAlign: 'left' }}>
                            {m.code}
                          </span>
                          <span style={{ color: st?.status === 'completada' ? 'var(--ink-muted)' : 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                        </span>
                        {st?.status === 'completada' ? <Stars n={st.stars} /> : st?.status === 'en-curso' ? <span className="chip" style={{ color: 'var(--accent)' }}>en curso</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
          <p className="small faint">Los laboratorios están abiertos desde el principio: la campaña propone un orden, pero no bloquea nada.</p>
        </div>
      </aside>
    </div>
  );
}
