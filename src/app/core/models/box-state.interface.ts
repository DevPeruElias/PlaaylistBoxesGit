import { Cancion } from './cancion.interface';

export interface BoxState {
  sede: string;
  boxId: string;
  sessionId: string;           // Cambia cuando el admin reinicia el box
  estadoReproduccion: 'idle' | 'playing' | 'paused';
  cancionActual: Cancion | null;
  playlist: Cancion[];
  tiempoActual: number;        // En segundos, para sincronizar los celulares
  currentIndex: number; // <-- ASEGÚRATE DE AGREGAR ESTO
  //Elias
}
