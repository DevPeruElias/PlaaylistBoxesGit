import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { BoxState } from '../models/box-state.interface';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  public socket: Socket;
  private url = 'https://playlistboxes-backend.onrender.com';

  constructor(private ngZone: NgZone) {
    this.socket = io(this.url);
  }

  // 1. CONEXIÓN Y SALAS
  unirseBox(sede: string, boxId: string, tipo: 'mobile' | 'tv' | 'admin') {
    this.socket.emit('unirse_box', { sede, boxId, tipo });
  }

  // 2. ESCUCHA DEL ESTADO GLOBAL (Protegido con NgZone)
  getEstadoBox(): Observable<BoxState> {
    return new Observable((observer) => {
      this.socket.on('estado_box_actualizado', (state: BoxState) => {
        this.ngZone.run(() => {
          observer.next(state);
        });
      });
    });
  }

  onBoxReiniciado(): Observable<void> {
    return new Observable((observer) => {
      this.socket.on('box_reiniciado', () => {
        this.ngZone.run(() => {
          observer.next();
        });
      });
    });
  }

  // 3. ACCIONES DEL USUARIO (Playlist)
  agregarCancion(sede: string, boxId: string, cancion: any, usuario: string) {
    this.socket.emit('agregar_cancion', { sede, boxId, cancion, usuario });
  }

  eliminarCancion(sede: string, boxId: string, cancionId: string) {
    this.socket.emit('eliminar_cancion', { sede, boxId, cancionId });
  }

  reordenarPlaylist(sede: string, boxId: string, startIndex: number, endIndex: number) {
    this.socket.emit('reordenar_playlist', { sede, boxId, startIndex, endIndex });
  }

  comandoReproductor(
    sede: string,
    boxId: string,
    comando: 'play' | 'pause' | 'next' | 'seek' | 'prev',
    valor?: number,
  ) {
    this.socket.emit('comando_reproductor', { sede, boxId, comando, valor });
  }

  // 5. ACCIONES DEL ADMIN
  reiniciarBox(sede: string, boxId: string) {
    this.socket.emit('admin_reiniciar_box', { sede, boxId });
  }

  // 6. BÚSQUEDA
  buscarCancion(query: string) {
    this.socket.emit('buscar_cancion', { query });
  }

  getResultadosBusqueda(): Observable<any[]> {
    return new Observable((observer) => {
      this.socket.on('resultados_busqueda', (resultados: any[]) => {
        this.ngZone.run(() => {
          observer.next(resultados);
        });
      });
    });
  }

  getProgreso(): Observable<number> {
    return new Observable((observer) => {
      this.socket.on('progreso_actualizado', (tiempo: number) => {
        this.ngZone.run(() => {
          observer.next(tiempo);
        });
      });
    });
  }

  emitirProgreso(sede: string, boxId: string, tiempoActual: number): void {
    this.socket.emit('actualizar_progreso', { sede, boxId, tiempoActual });
  }
}
