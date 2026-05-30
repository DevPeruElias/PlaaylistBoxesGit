import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../core/services/socket.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  sedeSeleccionada: string | null = null;
  boxesTotales: number[] = [];

  // Diccionario maestro de boxes por sede
  configSedes: { [key: string]: number } = {
    'Angamos': 10,
    'La Molina': 8,
    'Aviacion 45': 4,
    'San Borja': 4,
    'Marina 3': 3,
    'Marina 1': 5
  };

  constructor(
    private route: ActivatedRoute,
    private socketService: SocketService
  ) {}

  ngOnInit() {
    // Leemos la sede estrictamente desde la URL
    this.route.queryParams.subscribe(params => {
      if (params['sede']) {
        this.sedeSeleccionada = params['sede'];

        // Generamos el array de boxes dependiendo de la sede (ej. si es Angamos, crea un array del 1 al 10)
        const cantidadBoxes = this.configSedes[this.sedeSeleccionada!] || 0;
        this.boxesTotales = Array.from({ length: cantidadBoxes }, (_, i) => i + 1);
      }
    });
  }

  reiniciarBox(boxId: number) {
    if (!this.sedeSeleccionada) return;

    const confirmar = confirm(`⚠️ ¿Estás seguro de REINICIAR el Box ${boxId}? \n\nEsto borrará toda la playlist actual y desconectará a los clientes que estén en ese box.`);

    if (confirmar) {
      this.socketService.reiniciarBox(this.sedeSeleccionada, boxId.toString());
      alert(`Box ${boxId} reiniciado con éxito.`);
    }
  }
}
