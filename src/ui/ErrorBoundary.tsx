import { Component, type ReactNode } from 'react';

/** Aísla fallos: si una escena 3D falla, el resto de la aplicación sigue funcionando. */
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; label: string }, { error: Error | null }> {
  override state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override componentDidCatch(error: Error) {
    console.error(`[ATOM] Error en ${this.props.label}:`, error);
  }
  override render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="loading" role="alert" style={{ padding: 32, textAlign: 'center' }}>
            No se ha podido mostrar {this.props.label}. Recarga la página; si persiste, prueba con calidad gráfica baja en Ajustes.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
