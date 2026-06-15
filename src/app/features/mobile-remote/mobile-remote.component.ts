import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SocketService } from '../../core/services/socket.service';
import { BoxState } from '../../core/models/box-state.interface';
import { Cancion } from '../../core/models/cancion.interface';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-mobile-remote',
  standalone: true,
  imports: [CommonModule, DragDropModule, ReactiveFormsModule],
  templateUrl: './mobile-remote.component.html',
  styleUrls: ['./mobile-remote.component.scss'],
})
export class MobileRemoteComponent implements OnInit, OnDestroy {
  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;
  nombreUsuario: string = `Usuario ${Math.floor(Math.random() * 1000)}`;
  volumenActual: number = 100;

  isSearchVisible: boolean = false;
  searchResults: any[] = [];
  searchControl = new FormControl('');

  isQrModalVisible: boolean = false;
  boxUrl: string = '';

  isConfirmJumpVisible: boolean = false;
  indexParaSaltar: number | null = null;
  cancionParaSaltar: any = null;

  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];

        // 🔥 ARREGLO DEL QR: Armamos el link real y lo codificamos para que la API no corte el "&box=1"
        const linkReal = `${window.location.origin}/mobile?sede=${this.sede}&box=${this.boxId}`;
        this.boxUrl = encodeURIComponent(linkReal);

        this.socketService.unirseBox(this.sede!, this.boxId!, 'mobile');
      }
    });

    this.subscripciones.add(
      this.searchControl.valueChanges
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((query) => {
          if (query && query.length > 2) this.socketService.buscarCancion(query);
        }),
    );

    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = JSON.parse(JSON.stringify(estado));
        this.cdr.markForCheck();
      }),
    );

    this.subscripciones.add(
      this.socketService.getProgreso().subscribe((tiempo: number) => {
        if (this.estadoBox) {
          this.estadoBox.tiempoActual = tiempo;
          this.cdr.markForCheck();
        }
      }),
    );

    this.subscripciones.add(
      this.socketService.getResultadosBusqueda().subscribe((resultados) => {
        this.searchResults = resultados;
        this.cdr.markForCheck();
      }),
    );
  }

  formatTime(seconds: number | undefined | null): string {
    if (seconds == null || isNaN(seconds)) return '0:00'; // Seguridad extra
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden && this.sede && this.boxId) {
      this.socketService.unirseBox(this.sede, this.boxId, 'mobile');
    }
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }

  abrirBuscador() {
    this.isSearchVisible = true;
  }
  cerrarBuscador() {
    this.isSearchVisible = false;
    this.searchResults = [];
    this.searchControl.setValue('');
  }
  abrirQrModal() {
    this.isQrModalVisible = true;
  }
  cerrarQrModal() {
    this.isQrModalVisible = false;
  }
  agregarSeleccionada(cancion: any) {
    if (!this.sede || !this.boxId) return;
    this.socketService.agregarCancion(this.sede, this.boxId, cancion, this.nombreUsuario);
    this.cerrarBuscador();
  }
  onDrop(event: CdkDragDrop<Cancion[]>) {
    if (!this.estadoBox || !this.sede || !this.boxId) return;
    moveItemInArray(this.estadoBox.playlist, event.previousIndex, event.currentIndex);
    this.socketService.reordenarPlaylist(
      this.sede,
      this.boxId,
      event.previousIndex,
      event.currentIndex,
    );
  }
  eliminarCancion(cancionId: string) {
    if (!this.sede || !this.boxId) return;
    this.socketService.eliminarCancion(this.sede, this.boxId, cancionId);
  }
  togglePlayPause() {
    const comando = this.estadoBox?.estadoReproduccion === 'playing' ? 'pause' : 'play';
    this.enviarComando(comando);
  }
  enviarComando(
    comando: 'play' | 'pause' | 'next' | 'seek' | 'prev' | 'volumen' | 'jump_to',
    valor?: number,
  ) {
    if (this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, comando, valor);
    }
  }
  cambiarVolumen(valor: number) {
    this.volumenActual = valor;
    if (navigator.vibrate) {
      if (valor === 100 || valor === 0) navigator.vibrate(50);
      else navigator.vibrate(10);
    }
    if (this.sede && this.boxId)
      this.socketService.comandoReproductor(this.sede, this.boxId, 'volumen', valor);
  }
  onVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.cambiarVolumen(parseInt(target.value, 10));
  }
  prepararSaltoDirecto(index: number, cancion: any) {
    if (this.estadoBox?.currentIndex === index) return;
    this.indexParaSaltar = index;
    this.cancionParaSaltar = cancion;
    this.isConfirmJumpVisible = true;
  }
  cancelarSalto() {
    this.isConfirmJumpVisible = false;
    this.indexParaSaltar = null;
    this.cancionParaSaltar = null;
  }
  confirmarSalto() {
    if (this.indexParaSaltar !== null && this.sede && this.boxId) {
      this.enviarComando('jump_to', this.indexParaSaltar);
      this.cancelarSalto();
    }
  }
}
