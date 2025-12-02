import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Order } from '../enums/order.model';
import { OrderStatus } from '../enums/order-status.enum';

@Component({
  selector: 'delivery-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card-root" [class.available]="mode==='available'" [class.in-route]="mode==='in-route'">
      <div class="card-top">
        <div class="order-num">#{{order.id}} <span class="small">{{order.displayNumber}}</span></div>
        <div class="date">{{order.date}}</div>
      </div>
      <div class="address">{{ getAddressWithoutComplement() || '—' }}</div>
      <div class="card-actions">
        <button *ngIf="mode==='available'" class="btn accept" (click)="onAccept()">Aceitar</button>
        <button *ngIf="mode==='in-route' && order.status === OrderStatus.ON_THE_WAY" class="btn finish" (click)="onFinish()">Finalizar entrega</button>
        <button class="btn details" (click)="onDetails()">Ver detalhes</button>
      </div>
    </article>
  `,
  styles: [
    `
    .card-root{background:#fff;padding:12px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.06);margin-bottom:12px;transition:transform .12s,box-shadow .12s}
    .card-root.available{background:#f6fffb;border-left:4px solid #10b981}
    .card-root.available:hover{transform:translateY(-4px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}
     .card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
     .order-num{font-weight:600}
     .small{color:#666;font-weight:400;font-size:.85rem;margin-left:6px}
    .address{color:#444;margin-bottom:10px}
    .card-actions{display:flex;gap:8px;justify-content:flex-end}
     .btn{padding:6px 10px;border-radius:6px;border:none;cursor:pointer}
     .accept{background:#10b981;color:#fff}
     .finish{background:#2563eb;color:#fff}
     .details{background:#e5e7eb;color:#111}
    `
  ]
})
export class DeliveryCardComponent {
  @Input() order!: Order;
  @Input() mode: 'available' | 'in-route' | 'history' = 'available';
  @Output() accept = new EventEmitter<Order>();
  @Output() details = new EventEmitter<Order>();
  @Output() finish = new EventEmitter<Order>();
  // expose enum for template comparisons
  public OrderStatus = OrderStatus;

  // Retorna o endereço sem a parte de complemento (remove 'Complemento: ...' se presente)
  getAddressWithoutComplement(): string | null {
    const o: any = this.order as any;
    const raw = o?.address ?? o?.clientAddress ?? '';
    if (!raw) return null;
    // Remove padrões como 'Complemento: ...' ou 'complemento: ...' ou 'Complemento - ...'
    const cleaned = raw.replace(/\b[Cc]omplemento\b[:\-\s]*[^\.\n]*/g, '').trim();
    return cleaned.replace(/\s{2,}/g, ' ').replace(/^[,\-\s]+|[,\-\s]+$/g, '').trim();
  }

  onAccept(){ this.accept.emit(this.order); }
  onDetails(){ this.details.emit(this.order); }
  onFinish(){ this.finish.emit(this.order); }
}
