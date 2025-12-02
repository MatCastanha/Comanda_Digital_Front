import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Order } from '../enums/order.model';

@Component({
  selector: 'delivery-history-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div *ngFor="let o of orders">
        <article class="hist-card">
          <div class="line"><strong>#{{o.id}}</strong> <span class="date">{{o.date}}</span></div>
          <div class="addr">{{ getAddressWithoutComplement(o) || '—' }}</div>
        </article>
      </div>
    </div>
  `,
  styles: [
    `.hist-card{background:#fff;padding:10px;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.04);margin-bottom:10px}
     .line{display:flex;justify-content:space-between}
     .addr{color:#555;margin-top:6px}
    `
  ]
})
export class DeliveryHistoryListComponent {
  @Input() orders: Order[] = [];

  // Remove trechos de complemento de um endereço (mesma lógica dos outros componentes)
  getAddressWithoutComplement(o: any): string | null {
    const raw = o?.address ?? o?.clientAddress ?? '';
    if (!raw) return null;
    const cleaned = raw.replace(/\b[Cc]omplemento\b[:\-\s]*[^\.\n]*/g, '').trim();
    return cleaned.replace(/\s{2,}/g, ' ').replace(/^[,\-\s]+|[,\-\s]+$/g, '').trim();
  }
}
