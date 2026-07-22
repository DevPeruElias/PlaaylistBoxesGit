import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';
import { BoxState } from '../../core/models/box-state.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tv-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tv-player.component.html',
  styleUrls: ['./tv-player.component.scss'],
})
export class TvPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;

  currentVideoId: string | null = null;

  anchoPantalla = window.innerWidth;
  altoPantalla = window.innerHeight;
  permisoAudio: boolean = false;

  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.anchoPantalla = window.innerWidth;
    this.altoPantalla = window.innerHeight;
  }

  concederPermiso() {
    this.permisoAudio = true;
    if (this.estadoBox?.cancionActual) {
      const video = this.videoPlayer?.nativeElement;
      if (video && video.src && this.estadoBox.estadoReproduccion === 'playing') {
        video.play().catch((e) => console.log('Esperando interacción:', e));
      }
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];
        this.socketService.unirseBox(this.sede!, this.boxId!, 'tv');
      }
    });

    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = { ...estado };
        this.cdr.markForCheck();
        this.sincronizarReproductor(estado);
      }),
    );

    this.socketService.socket.on('ejecutar_comando', (data: any) => {
      if (!this.videoPlayer) return;
      const video = this.videoPlayer.nativeElement;

      if (data.comando === 'seek') {
        video.currentTime += data.valor;
      } else if (data.comando === 'volumen') {
        video.volume = Math.max(0, Math.min(1, data.valor / 100));
      }
    });

    // Reporte de tiempo al servidor
    setInterval(() => {
      if (this.videoPlayer && this.estadoBox?.estadoReproduccion === 'playing') {
        const video = this.videoPlayer.nativeElement;
        if (!video.paused && !video.ended) {
          const tiempo = Math.floor(video.currentTime);
          this.socketService.emitirProgreso(this.sede!, this.boxId!, tiempo);
        }
      }
    }, 1000);
  }

  // EL EXTRACTOR LOCAL: Pide a tu propio backend el enlace puro extraído por Python
  async cargarVideo(videoId: string) {
    if (!this.videoPlayer) return;
    const video = this.videoPlayer.nativeElement;

    video.pause();
    video.src = '';
    video.load();

    try {
      const backendUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000'
        : 'https://playlistboxes-backend.onrender.com';

      const res = await fetch(`${backendUrl}/api/stream/${videoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          video.src = data.url;
          video.load();
          if (this.estadoBox?.estadoReproduccion === 'playing') {
            video.play().catch((e) => console.log('Reproducción automática bloqueada:', e));
          }
          return;
        }
      }

      // Si falla, salta al siguiente video automáticamente
      if (this.sede && this.boxId) {
        this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
      }
    } catch (e) {
      console.error('[Extractor] Error de conexión con el backend:', e);
      if (this.sede && this.boxId) {
        this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
      }
    }
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.videoPlayer) return;
    const video = this.videoPlayer.nativeElement;

    if (estado.cancionActual && estado.cancionActual.videoId !== this.currentVideoId) {
      this.currentVideoId = estado.cancionActual.videoId;
      this.cargarVideo(this.currentVideoId);
      return;
    }

    if (!estado.cancionActual && this.currentVideoId !== null) {
      this.currentVideoId = null;
      video.pause();
      video.src = '';
      return;
    }

    if (estado.estadoReproduccion === 'playing' && video.paused && video.src) {
      video.play().catch(() => {});
    } else if (estado.estadoReproduccion === 'paused' && !video.paused) {
      video.pause();
    }
  }

  onVideoEnded() {
    if (this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }

  onVideoError(event: any) {
    console.log('Error reproduciendo el MP4', event);
    if (this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }
}
