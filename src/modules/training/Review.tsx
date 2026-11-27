/** Repaso espaciado: tarjetas vencidas y próximas. */

import { useStore } from '../../state/store';
import { nodeTitle } from '../../learning/syllabus';
import { dueCards } from '../../learning/mastery';
import { Feedback } from '../../ui/common';
export function Review({ onStart }: { onStart: (nodes: string[]) => void }) {
  const cards = useStore((s) => s.cards);
  const now = Date.now();
  const due = dueCards(cards, now);
  const upcoming = Object.values(cards)
    .filter((c) => c.due > now)
    .sort((a, b) => a.due - b.due)
    .slice(0, 8);
  return (
    <div className="stack-16">
      <p className="lead">Los apartados que fallas vuelven a aparecer al día siguiente; los que aciertas, cada vez más espaciados (1, 2, 4, 8 y 16 días).</p>
      {due.length ? (
        <div className="card stack-12">
          <span className="h3">{due.length} apartado{due.length > 1 ? 's' : ''} para repasar hoy</span>
          <ul className="stack-8 small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {due.map((c) => (
              <li key={c.nodeId} className="row row--between">
                <span>
                  <span className="nid">{c.nodeId}</span> {nodeTitle(c.nodeId)}
                </span>
                <span className="faint">caja {c.box}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={() => onStart(due.map((c) => c.nodeId))}>
            Repasar ahora
          </button>
        </div>
      ) : (
        <Feedback tone="info">No tienes repasos pendientes. {Object.keys(cards).length ? 'Vuelve cuando se cumpla el próximo intervalo.' : 'Practica primero: los repasos se programan según tus resultados.'}</Feedback>
      )}
      {upcoming.length > 0 && (
        <div className="stack-8">
          <span className="small muted">Próximos repasos</span>
          {upcoming.map((c) => (
            <div key={c.nodeId} className="row row--between small">
              <span>
                <span className="nid">{c.nodeId}</span> {nodeTitle(c.nodeId)}
              </span>
              <span className="faint">{new Date(c.due).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
