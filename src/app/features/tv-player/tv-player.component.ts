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
  imports: [CommonModule], // ¡Adiós YouTubePlayerModule!
  templateUrl: './tv-player.component.html',
  styleUrls: ['./tv-player.component.scss'],
})
export class TvPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;

  // Control para no recargar el mismo video
  currentVideoId: string | null = null;

  anchoPantalla = window.innerWidth;
  altoPantalla = window.innerHeight;
  permisoAudio: boolean = false;

  // RULETA DE EXTRACCIÓN (APIs de Piped que nos dan el .mp4 directo)
  pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.garudalinux.org',
  ];

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
        // HTML5 usa volumen de 0.0 a 1.0
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

  // EL EXTRACTOR: Obtiene el enlace puro de la canción
  async cargarVideo(videoId: string) {
    if (!this.videoPlayer) return;
    const video = this.videoPlayer.nativeElement;

    video.pause();
    video.src = '';
    video.load();

    let urlMp4 = null;

    // Buscar en la ruleta de APIs el MP4
    for (const api of this.pipedInstances) {
      try {
        const res = await fetch(`${api}/streams/${videoId}`);
        if (res.ok) {
          const data = await res.json();
          // Buscamos un stream que tenga video y audio juntos (muxed)
          const stream = data.videoStreams.find(
            (s: any) => !s.videoOnly && s.mimeType.includes('mp4'),
          );
          if (stream) {
            urlMp4 = stream.url;
            break;
          }
        }
      } catch (e) {
        console.log(`[Extractor] Falló instancia ${api}`);
      }
    }

    if (urlMp4) {
      video.src = urlMp4;
      video.load();
      if (this.estadoBox?.estadoReproduccion === 'playing') {
        video.play().catch((e) => console.log('El navegador pide clic inicial:', e));
      }
    } else {
      // Si el video está eliminado de la faz de la tierra, saltamos al siguiente
      if (this.sede && this.boxId) {
        this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
      }
    }
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.videoPlayer) return;
    const video = this.videoPlayer.nativeElement;

    // Si hay una canción nueva, extraemos su MP4
    if (estado.cancionActual && estado.cancionActual.videoId !== this.currentVideoId) {
      this.currentVideoId = estado.cancionActual.videoId;
      this.cargarVideo(this.currentVideoId);
      return; // El play() se maneja cuando termine de cargar
    }

    // Si no hay canción, detenemos todo
    if (!estado.cancionActual && this.currentVideoId !== null) {
      this.currentVideoId = null;
      video.pause();
      video.src = '';
      return;
    }

    // Sincronizar estados de Play y Pause
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
