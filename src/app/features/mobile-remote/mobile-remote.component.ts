import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SocketService } from '../../core/services/socket.service';
import { BoxState } from '../../core/models/box-state.interface';
import { Cancion } from '../../core/models/cancion.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mobile-remote',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './mobile-remote.component.html',
  styleUrls: ['./mobile-remote.component.scss']
})

export class MobileRemoteComponent implements OnInit, OnDestroy {
  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;

  // Identificador temporal del usuario (Ej: "Usuario 1")
  nombreUsuario: string = `Usuario ${Math.floor(Math.random() * 1000)}`;

  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService
  ) {}


  isSearchVisible: boolean = false;
  searchResults: any[] = [];

  ngOnInit() {
    // 1. Capturamos los datos del QR (URL)
    this.route.queryParams.subscribe(params => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];

        // Nos unimos a la sala del box como 'mobile'
        this.socketService.unirseBox(this.sede!, this.boxId!, 'mobile');      }
    });

    // 2. Escuchamos el estado en tiempo real (Play, Pausa, Playlist)
    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = estado;
      })
    );

    // 3. Escuchamos si el Admin reinicia el box (Expulsión)
    this.subscripciones.add(
      this.socketService.onBoxReiniciado().subscribe(() => {
        alert('El administrador ha reiniciado el Box. Gracias por tu visita.');
        // Aquí podríamos redirigir a una pantalla de salida
        this.estadoBox = null;
      })
    );
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }

  // Evento del Drag & Drop (CDK)
  onDrop(event: CdkDragDrop<Cancion[]>) {
    if (!this.estadoBox || !this.sede || !this.boxId) return;

    // Actualizamos la vista inmediatamente para que se sienta fluido
    moveItemInArray(this.estadoBox.playlist, event.previousIndex, event.currentIndex);

    // Le avisamos al servidor del cambio
    this.socketService.reordenarPlaylist(this.sede, this.boxId, event.previousIndex, event.currentIndex);
  }

  eliminarCancion(cancionId: string) {
    if (!this.sede || !this.boxId) return;
    const confirmar = confirm('¿Seguro que deseas quitar esta canción?');
    if (confirmar) {
      this.socketService.eliminarCancion(this.sede, this.boxId, cancionId);
    }
  }

  enviarComando(comando: 'play' | 'pause' | 'next' | 'seek', valor?: number) {
    if (this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, comando, valor);
    }
  }

  abrirBuscador() {
    this.isSearchVisible = true;
  }

  cerrarBuscador() {
    this.isSearchVisible = false;
    this.searchResults = [];
  }

  buscarCancion(query: string) {
    if (!query) return;

    console.log('Buscando:', query);

    // AQUÍ LLAMARÍAS A TU BACKEND. Por ahora, un ejemplo simulado:
    // this.socketService.buscarEnYoutube(query).subscribe(res => this.searchResults = res);

    // Simulando resultados (luego los conectaremos a tu API de YouTube)
    this.searchResults = [
      { title: 'Canción de Prueba 1', thumbnail: 'https://via.placeholder.com/60', videoId: '123' },
      { title: 'Canción de Prueba 2', thumbnail: 'https://via.placeholder.com/60', videoId: '456' }
    ];
  }

  agregarSeleccionada(cancion: any) {
    if (!this.sede || !this.boxId) return;

    // Usamos tu servicio que ya tienes creado
    this.socketService.agregarCancion(this.sede, this.boxId, {
      title: cancion.title,
      videoId: cancion.videoId,
      thumbnail: cancion.thumbnail
    }, this.nombreUsuario);

    this.cerrarBuscador();
    alert('¡Canción agregada!');
  }


}
