import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { BoxState } from '../models/box-state.interface';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  // URL de tu nuevo backend en Render para los Boxes
  private url = 'https://playlistboxes-backend.onrender.com';

  constructor() {
    this.socket = io(this.url);
  }

  // 1. CONEXIÓN Y SALAS
  unirseBox(sede: string, boxId: string, tipo: 'mobile' | 'tv' | 'admin') {
    this.socket.emit('unirse_box', { sede, boxId, tipo });
  }

  // 2. ESCUCHA DEL ESTADO GLOBAL
  getEstadoBox(): Observable<BoxState> {
    return new Observable((observer) => {
      this.socket.on('estado_box_actualizado', (state: BoxState) => {
        observer.next(state);
      });
    });
  }

  // Escucha si el admin reinició el box (para expulsar usuarios viejos)
  onBoxReiniciado(): Observable<void> {
    return new Observable((observer) => {
      this.socket.on('box_reiniciado', () => observer.next());
    });
  }

  // 3. ACCIONES DEL USUARIO (MÓVIL)
  agregarCancion(sede: string, boxId: string, cancion: any, usuario: string) {
    this.socket.emit('agregar_cancion', { sede, boxId, cancion, usuario });
  }

  eliminarCancion(sede: string, boxId: string, cancionId: string) {
    this.socket.emit('eliminar_cancion', { sede, boxId, cancionId });
  }

  reordenarPlaylist(sede: string, boxId: string, startIndex: number, endIndex: number) {
    this.socket.emit('reordenar_playlist', { sede, boxId, startIndex, endIndex });
  }

  // 4. CONTROLES DE REPRODUCCIÓN (MÓVIL -> TV)
  comandoReproductor(sede: string, boxId: string, comando: 'play' | 'pause' | 'next' | 'seek', valor?: number) {
    this.socket.emit('comando_reproductor', { sede, boxId, comando, valor });
  }

  // 5. ACCIONES DEL ADMIN
  reiniciarBox(sede: string, boxId: string) {
    this.socket.emit('admin_reiniciar_box', { sede, boxId });
  }

  // Agrega esto dentro de tu clase SocketService
  buscarCancion(query: string) {
    this.socket.emit('buscar_cancion', { query });
  }

// Y para recibir los resultados:
  getResultadosBusqueda(): Observable<any[]> {
    return new Observable((observer) => {
      this.socket.on('resultados_busqueda', (resultados: any[]) => {
        observer.next(resultados);
      });
    });
  }
}
