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
          <div class="section"><strong>Itens do pedido</strong>
            <ul>
              <li *ngFor="let it of order.items">{{it.quantity}} × {{it.name}} — R$ {{ formatPrice(it.price) }}</li>
            </ul>
          </div>

          <div class="section"><strong>Cliente</strong>
            <div>{{ getClientName() || ('Cliente ' + (order.displayNumber || '')) }}</div>
          </div>

          <div class="section"><strong>Endereço</strong>
            <div>{{ getAddressWithoutComplement() || '—' }}</div>
          </div>

          <div class="section total"><strong>Total:</strong>
            <div><strong>R$ {{ formatPrice(getValorTotal()) }}</strong></div>
          </div>
        </div>

        <footer class="modal-actions" *ngIf="order as o">
          <button *ngIf="o.status === OrderStatus.ON_THE_WAY" class="btn btn-danger" (click)="cancel.emit(o)">Cancelar entrega</button>
          <button *ngIf="o.status !== OrderStatus.ON_THE_WAY" class="btn btn-primary" (click)="start.emit(o)">Iniciar entrega</button>
          <button *ngIf="o.status === OrderStatus.ON_THE_WAY" class="btn btn-accept" (click)="finish.emit(o)">Finalizar entrega</button>
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
    .modal-actions{display:flex;gap:8px;justify-content:center;margin-top:12px}
     .btn{padding:8px 12px;border-radius:8px;border:none}
     .btn-primary{background:var(--accent);color:#fff}
     .btn-accept{background:var(--accept);color:#fff}
     .btn-danger{background:#ef4444;color:#fff}
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

  // Calcula o valor total (itens + frete fixo R$10)
  getValorTotal(): number {
    if (!this.order || !Array.isArray(this.order.items)) return 10;
    const totalItens = this.order.items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    return totalItens + 10;
  }

  // Formata preço para '4,00' -> '4,00' com 2 casas e troca ponto por vírgula
  formatPrice(v: number | string | undefined): string {
    const n = Number(v) || 0;
    return n.toFixed(2).replace('.', ',');
  }

  // Tenta extrair o nome do cliente de vários possíveis aliases
  getClientName(): string | null {
    const o: any = this.order as any;
    return o?.client?.name ?? o?.clientName ?? o?.cliente?.nome ?? null;
  }

  // Retorna o endereço sem a parte de complemento (remove 'Complemento: ...' se presente)
  getAddressWithoutComplement(): string | null {
    const o: any = this.order as any;
    const raw = o?.clientAddress || o?.address || '';
    if (!raw) return null;
    // Remove padrões como 'Complemento: ...' ou 'complemento: ...' ou 'Complemento - ...' até um ponto final
    const cleaned = raw.replace(/\b[Cc]omplemento\b[:\-\s]*[^\.\n]*/g, '').trim();
    // Também remove trailing separators deixados (ex: leftover 'CEP: 12345.  ')
    return cleaned.replace(/\s{2,}/g, ' ').replace(/^[,\-\s]+|[,\-\s]+$/g, '').trim();
  }
}
