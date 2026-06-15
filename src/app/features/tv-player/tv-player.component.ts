import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { SocketService } from '../../core/services/socket.service';
import { BoxState } from '../../core/models/box-state.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tv-player',
  standalone: true,
  imports: [CommonModule, YouTubePlayerModule],
  templateUrl: './tv-player.component.html',
  styleUrls: ['./tv-player.component.scss'],
})
export class TvPlayerComponent implements OnInit, OnDestroy {
  @ViewChild(YouTubePlayer) player!: YouTubePlayer;

  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;
  isPlayerReady: boolean = false;
  lastVideoId: string | null = null;

  anchoPantalla = window.innerWidth;
  altoPantalla = window.innerHeight;

  playerConfig = {
    controls: 0,
    disablekb: 1,
    rel: 0,
    modestbranding: 1,
    autoplay: 1,
  };

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

  permisoAudio: boolean = false;
  concederPermiso() {
    this.permisoAudio = true;
  }

  ngOnInit() {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    this.route.queryParams.subscribe((params) => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];
        this.socketService.unirseBox(this.sede!, this.boxId!, 'tv');
      }
    });

    // 1. Escuchar estados
    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        console.log('TV Recibió estado:', estado.estadoReproduccion);
        this.estadoBox = { ...estado };
        this.cdr.markForCheck();
        this.sincronizarReproductor(estado);
      }),
    );

    // 2. Escuchar comandos (seek, volumen)
    this.socketService.socket.on('ejecutar_comando', (data: any) => {
      console.log('TV Recibió comando:', data);
      if (!this.isPlayerReady || !this.player) return;
      if (data.comando === 'seek') {
        const currentTime = (this.player as any).getCurrentTime();
        (this.player as any).seekTo(currentTime + data.valor, true);
      } else if (data.comando === 'volumen') {
        (this.player as any).setVolume(data.valor);
      }
    });

    setInterval(() => {
      if (this.isPlayerReady && this.player && this.estadoBox?.estadoReproduccion === 'playing') {
        try {
          const tiempo = Math.floor((this.player as any).getCurrentTime());
          if (tiempo > 0) this.socketService.emitirProgreso(this.sede!, this.boxId!, tiempo);
        } catch (e) {}
      }
    }, 1000);
  }

  onPlayerReady(event: any) {
    this.isPlayerReady = true;
    console.log('TV Player listo');
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.player || !this.isPlayerReady) return;

    try {
      const currentVideo = estado.cancionActual?.videoId;

      // Cargar video si es nuevo
      if (currentVideo && currentVideo !== this.lastVideoId) {
        console.log('Cargando video:', currentVideo);
        (this.player as any).loadVideoById(currentVideo);
        this.lastVideoId = currentVideo;
      }

      // Controlar Play/Pause
      console.log('Acción en TV:', estado.estadoReproduccion);
      if (estado.estadoReproduccion === 'playing') {
        (this.player as any).playVideo();
      } else if (estado.estadoReproduccion === 'paused') {
        (this.player as any).pauseVideo();
      }
    } catch (error) {
      console.log('Error TV:', error);
    }
  }

  onPlayerStateChange(event: any) {
    if (event.data === 0 && this.sede && this.boxId)
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
    this.socketService.socket.off('ejecutar_comando'); // Limpiar listener
  }
}
