import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { YouTubePlayerModule, YouTubePlayer } from '@angular/youtube-player';
import { SocketService } from '../../core/services/socket.service';
import { BoxState } from '../../core/models/box-state.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tv-player',
  standalone: true,
  // IMPORTANTE: Importamos el módulo oficial de YouTube para Angular
  imports: [CommonModule, YouTubePlayerModule],
  templateUrl: './tv-player.component.html',
  styleUrls: ['./tv-player.component.scss']
})
export class TvPlayerComponent implements OnInit, OnDestroy {
  @ViewChild(YouTubePlayer) player!: YouTubePlayer;

  sede: string | null = null;
  boxId: string | null = null;
  estadoBox: BoxState | null = null;

  // Ocultamos controles, teclado y recomendaciones de YouTube
  playerConfig = {
    controls: 0,
    disablekb: 1,
    rel: 0,
    modestbranding: 1
  };

  private subscripciones: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    // 1. Cargamos el script oficial de YouTube API de forma asíncrona
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    // 2. Leemos URL (ej. la PC del box abre el link: /tv?sede=Angamos&box=1)
    this.route.queryParams.subscribe(params => {
      if (params['sede'] && params['box']) {
        this.sede = params['sede'];
        this.boxId = params['box'];
        this.socketService.unirseBox(this.sede!, this.boxId!, 'tv');      }
    });

    // 3. Escuchamos el estado del Socket
    this.subscripciones.add(
      this.socketService.getEstadoBox().subscribe((estado) => {
        this.estadoBox = estado;
        this.sincronizarReproductor(estado);
      })
    );
  }

  ngOnDestroy() {
    this.subscripciones.unsubscribe();
  }

  // 4. MÉTODOS DE REPRODUCCIÓN (Controlado por el Socket)
  sincronizarReproductor(estado: BoxState) {
    if (!this.player || !estado.cancionActual) return;

    if (estado.estadoReproduccion === 'playing') {
      this.player.playVideo();
    } else if (estado.estadoReproduccion === 'paused') {
      this.player.pauseVideo();
    }

    // Aquí podemos añadir lógica para el "Seek" (adelantar 10s)
    // leyendo una variable 'tiempoActualizado' del estado si viene del socket.
  }

  // 5. EVENTOS NATIVOS DE YOUTUBE (Cuando el video termina)
  onPlayerStateChange(event: any) {
    // El evento '0' de la API de YouTube significa "Ended" (Terminado)
    if (event.data === 0 && this.sede && this.boxId) {
      // Le decimos al backend "Hey, ya terminó esta canción, mándame la que sigue en la cola"
      this.socketService.comandoReproductor(this.sede, this.boxId, 'next');
    }
  }
}
