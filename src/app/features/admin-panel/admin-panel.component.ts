import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
})
export class AdminPanelComponent implements OnInit {
  sedeSeleccionada: string | null = null;
  boxesTotales: number[] = [];

  // Diccionario maestro de boxes por sede (CORREGIDO para los links)
  configSedes: { [key: string]: number } = {
    Angamos: 10,
    LaMolina: 8, // Sin espacio
    Aviacion45: 4, // Sin espacio
    SanBorja: 4, // Sin espacio
    Marina1: 3, // Corregido a 3 boxes
    Marina3: 5, // Corregido a 5 boxes
  };

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['sede']) {
        this.sedeSeleccionada = params['sede'];

        const cantidadBoxes = this.configSedes[this.sedeSeleccionada!] || 0;
        this.boxesTotales = Array.from({ length: cantidadBoxes }, (_, i) => i + 1);
      }
    });
  }

  reiniciarBox(boxId: number) {
    if (!this.sedeSeleccionada) return;

    const confirmar = confirm(
      `⚠️ ¿Estás seguro de REINICIAR el Box ${boxId}? \n\nEsto borrará toda la playlist actual y desconectará a los clientes que estén en ese box.`,
    );

    if (confirmar) {
      this.socketService.reiniciarBox(this.sedeSeleccionada, boxId.toString());
      alert(`Box ${boxId} reiniciado con éxito.`);
    }
  }
}
