import { Cancion } from './cancion.interface';

export interface BoxState {
  sede: string;
  boxId: string;
  estadoReproduccion: 'idle' | 'playing' | 'paused';
  cancionActual: Cancion | null;
  playlist: Cancion[];
  tiempoActual: number;
  currentIndex: number;
}
