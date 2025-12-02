import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Order } from '../enums/order.model';
import { OrderStatus } from '../enums/order-status.enum';

@Component({
  selector: 'delivery-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="$event.target===$event.currentTarget && close.emit()">
      <section class="modal-root">
        <header class="modal-head">
          <h3>Pedido {{order?.displayNumber}}</h3>
          <button class="close" (click)="close.emit()">✕</button>
        </header>

        <div *ngIf="order" class="modal-body">
          <div class="section"><strong>Itens</strong>
            <ul>
              <li *ngFor="let it of order.items">{{it.quantity}}× {{it.name}} — R$ {{it.price}}</li>
            </ul>
          </div>
          <div class="section"><strong>Restaurante</strong>
            <div>{{order.restaurantAddress || '—'}}</div>
          </div>
          <div class="section"><strong>Cliente</strong>
            <div>{{order.clientAddress || order.address}}</div>
          </div>
        </div>

        <footer class="modal-actions" *ngIf="order as o">
          <button class="btn danger" (click)="cancel.emit(o)">Cancelar entrega</button>
          <button *ngIf="o.status !== OrderStatus.ON_THE_WAY" class="btn primary" (click)="start.emit(o)">Iniciar entrega</button>
          <button *ngIf="o.status === OrderStatus.ON_THE_WAY" class="btn success" (click)="finish.emit(o)">Finalizar entrega</button>
        </footer>
      </section>
    </div>
  `,
  styles: [
    `.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:flex-end;justify-content:center;padding:16px}
     .modal-root{width:100%;max-width:540px;background:#fff;border-radius:12px;padding:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2)}
     .modal-head{display:flex;justify-content:space-between;align-items:center}
     .modal-body{margin-top:10px}
     .section{margin-bottom:8px}
     .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
     .btn{padding:8px 12px;border-radius:8px;border:none}
     .primary{background:#2563eb;color:#fff}
     .success{background:#10b981;color:#fff}
     .danger{background:#ef4444;color:#fff}
     .close{background:transparent;border:none;font-size:18px}
    `]
})
export class DeliveryDetailsComponent {
  @Input() order?: Order | null;
  @Output() close = new EventEmitter<void>();
  @Output() start = new EventEmitter<Order | undefined>();
  @Output() finish = new EventEmitter<Order | undefined>();
  @Output() cancel = new EventEmitter<Order | undefined>();
  // expose enum to template for comparisons
  OrderStatus = OrderStatus;
}
