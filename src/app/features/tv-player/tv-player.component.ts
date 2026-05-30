import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
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
  styleUrls: ['./tv-player.component.scss']
})
export class TvPlayerComponent implements OnInit, OnDestroy {
  @ViewChild(YouTubePlayer) player!: YouTubePlayer;

  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;
  isPlayerReady: boolean = false;

  // Variables para forzar pantalla completa
  anchoPantalla = window.innerWidth;
  altoPantalla = window.innerHeight;

  playerConfig = {
    controls: 0,
    disablekb: 1,
    rel: 0,
    modestbranding: 1,
    autoplay: 1
  };

  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef
  ) {}

  // Si la TV cambia de tamaño, ajustamos el video
  @HostListener('window:resize')
  onResize() {
    this.anchoPantalla = window.innerWidth;
    this.altoPantalla = window.innerHeight;
  }



  ngOnInit() {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    this.route.queryParams.subscribe(params => {
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
      })
    );

    // Esto ya no dará error porque cambiamos a public socket
    this.socketService.socket.on('ejecutar_comando', (data: any) => {
      if (data.comando === 'seek' && this.isPlayerReady && this.player) {
        const currentTime = this.player.getCurrentTime();
        this.player.seekTo(currentTime + data.valor, true);
      }
    });

    setInterval(() => {
      if (this.isPlayerReady && this.player && this.estadoBox?.estadoReproduccion === 'playing') {
        try {
          const tiempo = Math.floor(this.player.getCurrentTime());
          if (tiempo > 0) {
            this.socketService.emitirProgreso(this.sede!, this.boxId!, tiempo);
          }
        } catch(e) {}
      }
    }, 1000);
  }

  onPlayerReady(event: any) {
    this.isPlayerReady = true;
    if (this.estadoBox?.estadoReproduccion === 'playing') {
      this.player.playVideo();
    }
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.player || !this.isPlayerReady) return;

    try {
      // Angular cambia el video solo, así que aquí solo damos play o pause
      if (estado.estadoReproduccion === 'playing') {
        this.player.playVideo();
      } else if (estado.estadoReproduccion === 'paused') {
        this.player.pauseVideo();
      }
    } catch (error) {
      console.log("Esperando a YouTube...");
    }
  }

  onPlayerStateChange(event: any) {
    if (event.data === 0 && this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }

  ngOnDestroy() { this.subscripciones.unsubscribe(); }
}
