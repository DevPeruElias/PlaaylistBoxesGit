import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
  nombreUsuario: string = `Usuario ${Math.floor(Math.random() * 1000)}`;

  isSearchVisible: boolean = false;
  searchResults: any[] = [];
  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef // Importante para actualizar la UI
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];
        this.socketService.unirseBox(this.sede!, this.boxId!, 'mobile');
      }
    });

    // 1. Escuchar estado (con ChangeDetector)
    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = estado;
        this.cdr.markForCheck(); // Fuerza actualización visual
      })
    );

    // 2. Escuchar resultados de búsqueda real
    this.subscripciones.add(
      this.socketService.getResultadosBusqueda().subscribe((resultados) => {
        this.searchResults = resultados;
        this.cdr.markForCheck(); // Fuerza actualización visual
      })
    );

    // 3. Escuchar reinicio
    this.subscripciones.add(
      this.socketService.onBoxReiniciado().subscribe(() => {
        alert('El administrador ha reiniciado el Box.');
        this.estadoBox = null;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }

  // --- MÉTODOS DE BÚSQUEDA ---
  abrirBuscador() { this.isSearchVisible = true; }

  cerrarBuscador() {
    this.isSearchVisible = false;
    this.searchResults = [];
  }

  buscarCancion(query: string) {
    if (!query) return;
    // Esto llama al backend que usa ytsr
    this.socketService.buscarCancion(query);
  }

  agregarSeleccionada(cancion: any) {
    if (!this.sede || !this.boxId) return;
    this.socketService.agregarCancion(this.sede, this.boxId, cancion, this.nombreUsuario);
    this.cerrarBuscador();
    alert('Canción en cola');
  }

  // --- MÉTODOS DE CONTROL ---
  onDrop(event: CdkDragDrop<Cancion[]>) {
    if (!this.estadoBox || !this.sede || !this.boxId) return;
    moveItemInArray(this.estadoBox.playlist, event.previousIndex, event.currentIndex);
    this.socketService.reordenarPlaylist(this.sede, this.boxId, event.previousIndex, event.currentIndex);
  }

  eliminarCancion(cancionId: string) {
    if (!this.sede || !this.boxId) return;
    this.socketService.eliminarCancion(this.sede, this.boxId, cancionId);
  }

  enviarComando(comando: 'play' | 'pause' | 'next' | 'seek', valor?: number) {
    if (this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, comando, valor);
    }
  }
}
