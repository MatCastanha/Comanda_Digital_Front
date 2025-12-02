import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Order } from '../enums/order.model';

@Component({
  selector: 'delivery-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card-root">
      <div class="card-top">
        <div class="order-num">#{{order.id}} <span class="small">{{order.displayNumber}}</span></div>
        <div class="date">{{order.date}}</div>
      </div>
      <div class="address">{{order.address}}</div>
      <div class="card-actions">
        <button *ngIf="mode==='available'" class="btn accept" (click)="onAccept()">Aceitar</button>
        <button class="btn details" (click)="onDetails()">Ver detalhes</button>
      </div>
    </article>
  `,
  styles: [
    `.card-root{background:#fff;padding:12px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);margin-bottom:12px}
     .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
     .order-num{font-weight:600}
     .small{color:#666;font-weight:400;font-size:.85rem;margin-left:6px}
     .address{color:#444;margin-bottom:10px}
     .card-actions{display:flex;gap:8px}
     .btn{padding:6px 10px;border-radius:6px;border:none;cursor:pointer}
     .accept{background:#10b981;color:#fff}
     .details{background:#e5e7eb;color:#111}
    `
  ]
})
export class DeliveryCardComponent {
  @Input() order!: Order;
  @Input() mode: 'available' | 'in-route' | 'history' = 'available';
  @Output() accept = new EventEmitter<Order>();
  @Output() details = new EventEmitter<Order>();

  onAccept(){ this.accept.emit(this.order); }
  onDetails(){ this.details.emit(this.order); }
}
