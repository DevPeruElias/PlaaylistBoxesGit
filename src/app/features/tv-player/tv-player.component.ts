import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
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
  isPlayerReady: boolean = false; // <-- ESCUDO ANTI ERRORES

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

    // RELOJ PARA LA BARRA - AHORA PROTEGIDO
    setInterval(() => {
      if (this.isPlayerReady && this.player && this.estadoBox?.estadoReproduccion === 'playing') {
        try {
          const tiempo = Math.floor(this.player.getCurrentTime());
          if (tiempo > 0) {
            this.socketService.emitirProgreso(this.sede!, this.boxId!, tiempo);
          }
        } catch(e) {} // Ignorar errores si YT se desconecta un segundo
      }
    }, 1000);
  }

  // NUEVO: SE DISPARA SOLO CUANDO YOUTUBE ESTÁ LISTO
  onPlayerReady(event: any) {
    this.isPlayerReady = true;
    if (this.estadoBox?.estadoReproduccion === 'playing') {
      this.player.playVideo();
    }
  }

  sincronizarReproductor(estado: BoxState) {
    if (!this.player || !this.isPlayerReady) return; // SI NO ESTA LISTO, ABORTA Y EVITA EL ERROR DE NULL

    try {
      if (estado.estadoReproduccion === 'playing') {
        this.player.playVideo();
      } else if (estado.estadoReproduccion === 'paused') {
        this.player.pauseVideo();
      }
    } catch (error) {
      console.log("Esperando a que el iframe se monte...");
    }
  }

  onPlayerStateChange(event: any) {
    if (event.data === 0 && this.sede && this.boxId) {
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }

  ngOnDestroy() { this.subscripciones.unsubscribe(); }
}
