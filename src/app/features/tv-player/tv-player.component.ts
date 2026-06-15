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

  // VARIABLE CLAVE: Aquí guardamos el reproductor real de YouTube
  private internalPlayer: any;

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

    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = { ...estado };
        this.cdr.markForCheck();
        this.sincronizarReproductor(estado);
      }),
    );

    this.socketService.socket.on('ejecutar_comando', (data: any) => {
      if (!this.isPlayerReady || !this.internalPlayer) return;

      if (data.comando === 'seek') {
        const currentTime = this.internalPlayer.getCurrentTime();
        this.internalPlayer.seekTo(currentTime + data.valor, true);
      } else if (data.comando === 'volumen') {
        this.internalPlayer.setVolume(data.valor);
      }
    });

    // ESTO ES LO QUE FALTABA: El reporte de tiempo al servidor
    setInterval(() => {
      if (
        this.isPlayerReady &&
        this.internalPlayer &&
        this.estadoBox?.estadoReproduccion === 'playing'
      ) {
        try {
          const tiempo = Math.floor(this.internalPlayer.getCurrentTime());
          if (tiempo >= 0) {
            this.socketService.emitirProgreso(this.sede!, this.boxId!, tiempo);
          }
        } catch (e) {
          console.log('Error reportando tiempo:', e);
        }
      }
    }, 1000);
  }

  // AQUÍ CAPTURAMOS EL REPRODUCTOR REAL
  onPlayerReady(event: any) {
    this.isPlayerReady = true;
    this.internalPlayer = event.target; // event.target ES el reproductor real
    console.log('TV Player capturado y listo');

    if (this.estadoBox?.estadoReproduccion === 'playing') {
      this.internalPlayer.playVideo();
    }
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.internalPlayer || !this.isPlayerReady) return;

    try {
      const currentVideo = estado.cancionActual?.videoId;

      // 1. Cargar video solo si es nuevo
      if (currentVideo && currentVideo !== this.lastVideoId) {
        console.log('Cargando video:', currentVideo);
        this.internalPlayer.loadVideoById(currentVideo);
        this.lastVideoId = currentVideo;

        // ¡CLAVE! Nos salimos de la función inmediatamente para no interrumpir la carga
        return;
      }

      // 2. Obtener el estado real actual de YouTube
      // Devuelve: 1 = Reproduciendo, 2 = Pausado, 3 = Buffering (Cargando)
      let playerState = -1;
      if (typeof this.internalPlayer.getPlayerState === 'function') {
        playerState = this.internalPlayer.getPlayerState();
      }

      // 3. Control de reproducción inteligente (Previene reinicios)
      if (estado.estadoReproduccion === 'playing') {
        // Solo ejecutamos Play si NO está reproduciendo (1) y NO está cargando (3)
        if (playerState !== 1 && playerState !== 3) {
          this.internalPlayer.playVideo();
        }
      } else if (estado.estadoReproduccion === 'paused') {
        // Solo ejecutamos Pause si NO está pausado (2)
        if (playerState !== 2) {
          this.internalPlayer.pauseVideo();
        }
      }
    } catch (error) {
      console.log('Error sincronizando TV:', error);
    }
  }

  onPlayerStateChange(event: any) {
    if (event.data === 0 && this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }
}
