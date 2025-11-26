import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-pedido-aprovado',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pedido-aprovado.component.html',
  styleUrls: ['./pedido-aprovado.component.css']
})
export class PedidoAprovadoComponent {
  order: any = null;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.order = nav && nav.extras && (nav.extras as any).state ? (nav.extras as any).state.order : null;
  }

  rastrear() {
    this.router.navigate(['/cliente/rastreio'], { state: { order: this.order } });
  }

  fechar() {
    this.router.navigate(['/cliente']);
  }
}
