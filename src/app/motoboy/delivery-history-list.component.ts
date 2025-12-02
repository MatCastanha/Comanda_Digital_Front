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
          <div class="addr">{{o.address}}</div>
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
export class DeliveryHistoryListComponent { @Input() orders: Order[] = []; }
