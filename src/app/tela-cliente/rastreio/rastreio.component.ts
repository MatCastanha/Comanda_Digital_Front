import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderTrackerComponent } from './order-tracker.component';
import { RastreioService, RastreioPayload } from '../../../services/rastreio.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DishService } from '../../../services/dish.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { OrderStatus } from '../../enums/order-status.enum';

@Component({
  selector: 'app-rastreio',
  standalone: true,
  imports: [CommonModule, OrderTrackerComponent],
  templateUrl: './rastreio.component.html',
  styleUrls: ['./rastreio.component.css']
})
export class RastreioComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private rastreioService = inject(RastreioService);
  private dishService = inject(DishService);
  private router = inject(Router);
  private sub = new Subscription();

  orderId?: string | null;
  rastreio?: RastreioPayload | null = null;
  // shipping value passed through navigation state (if available)
  shippingFromState: number | null = null;
  // view-ready items enriched with image/name resolved by dishId
  viewItems: Array<{ dishId: any; image: string | null; name: string; quantity: number; price: number }> = [];
  // steps to display in UI (visual only)
  steps = [
    { key: 'PREPARING', label: 'Preparando seu pedido' },
    { key: 'ON_THE_WAY', label: 'Pedido saiu para entrega!' },
    { key: 'DELIVERED', label: 'Seu pedido chegou!' }
  ];

  ngOnInit(): void {
    // First, try navigation state (PedidoAprovado passes the order via state)
    const fullState = (window && (window as any).history && (window as any).history.state) ? (window as any).history.state : {};
    this.shippingFromState = fullState.shipping !== undefined && fullState.shipping !== null ? Number(fullState.shipping) : null;
    const navState = fullState.order ?? fullState;
    if (navState && (navState.id || navState.orderId)) {
      const id = String(navState.id ?? navState.orderId);
      this.orderId = id;
      // populate initial UI using the passed order object (non-exhaustive mapping)
      this.rastreio = {
        orderId: id,
        status: (navState.status as any) ?? 'PENDING',
        etaMinutes: navState.etaMinutes ?? null,
        address: navState.address_snapshot || navState.address || navState.address_snapshot_text || navState.client_address || '',
        total: navState.total ?? navState.price ?? navState.amount ?? null,
        items: (navState.items || navState.orderItems || []).map((it: any) => ({ name: it.name || it.dishName || 'Item', qty: it.quantity ?? it.qty ?? 1, price: it.price ?? it.unitPrice ?? it.valor ?? 0 })),
        riderPhone: navState.riderPhone ?? null,
        updatedAt: navState.moment ?? navState.updatedAt ?? null
      } as RastreioPayload;
      // Start listening to backend updates
      this.rastreioService.startTracking(this.orderId);
    } else {
      // Try to read orderId from route param `id` or query `orderId`
      this.orderId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('orderId');
      if (this.orderId) {
        this.rastreioService.startTracking(this.orderId);
      }
    }

    this.sub.add(this.rastreioService.rastreio$.subscribe(v => {
      this.rastreio = v;
      // enrich items for view using dishId
      this.enrichItemsForView();
    }));
  }

  // Compute items total from current rastreio items (fallback when backend didn't return total)
  private computeItemsTotal(): number {
    const items = (this.rastreio && this.rastreio.items) ? this.rastreio.items : [];
    let acc = 0;
    for (const it of items) {
      const x: any = it as any;
      const p = Number(x.price ?? x.preco ?? x.unitPrice ?? x.valor ?? 0) || 0;
      const q = Number(x.quantity ?? x.qty ?? x.qtd ?? x.qty ?? 1) || 0;
      acc += p * q;
    }
    return acc;
  }

  private backendHasShipping(): boolean {
    if (!this.rastreio) return false;
    const o: any = this.rastreio as any;
    return (o.deliveryFee !== undefined && o.deliveryFee !== null) || (o.shipping !== undefined && o.shipping !== null) || (o.frete !== undefined && o.frete !== null) || (o.shippingValue !== undefined && o.shippingValue !== null) || (o.taxaEntrega !== undefined && o.taxaEntrega !== null);
  }

  // Display total (items + shippingFromState if backend didn't persist it)
  get displayTotal(): number {
    const base = Number(this.rastreio?.total ?? this.computeItemsTotal()) || 0;
    if (this.shippingFromState != null && !this.backendHasShipping()) return base + Number(this.shippingFromState || 0);
    return base;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.orderId) this.rastreioService.stopTracking();
  }

  async confirmDelivery(){
    if(!this.orderId) return;
    const ok = await this.rastreioService.confirmDelivery(this.orderId);
    if(ok){
      // optimistic: update local status
      if(this.rastreio) this.rastreio.status = 'DELIVERED';
    }
  }

  callRider(){
    if(!this.rastreio?.riderPhone) return;
    // for mobile, open tel: link
    window.location.href = `tel:${this.rastreio.riderPhone}`;
  }

  // Determine which visual step index is active (0..2)
  activeStepIndex(): number {
    const raw = (this.rastreio && (this.rastreio.status ?? '')) ? String(this.rastreio.status) : '';
    const s = raw.trim().toUpperCase();
    if (!s) return 0;
    // map possible backend statuses to our UI steps
    const preparing = ['PENDING','RECEIVED','PREPARING','IN_PREPARATION','READY'];
    const onTheWay = ['ON_THE_WAY','OUT_FOR_DELIVERY','EN_ROUTE','DELIVERY'];
    const delivered = ['DELIVERED','FINISHED'];
    if (delivered.includes(s)) return 2;
    if (onTheWay.includes(s)) return 1;
    if (preparing.includes(s)) return 0;
    return 0;
  }

  // Fixed ETA display as requested (design asks for fixed 60 mins)
  get fixedEtaText(): string {
    return '60 mins';
  }

  // Compute "há X minutos" from rastreio.updatedAt or rastreio.moment
  get lastUpdateText(): string | null {
    const ts = this.rastreio?.updatedAt ?? (this.rastreio as any)?.moment ?? null;
    if (!ts) return null;
    const d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin <= 0) return 'há poucos segundos';
    if (diffMin === 1) return 'há 1 minuto';
    return `há ${diffMin} minutos`;
  }

  // Helper to safely get items normalized for the template
  itemsForView() {
    // deprecated: use viewItems (enriched async). Keep for fallback.
    if (this.viewItems && this.viewItems.length) return this.viewItems;
    if (!this.rastreio?.items) return [];
    return (this.rastreio.items || []).map((it: any) => ({
      dishId: it.dishId ?? it.id ?? null,
      image: it.image || (it.dishId ? `assets/img/pratos/${it.dishId}.png` : null),
      name: it.name || it.dishName || it.title || 'Item',
      quantity: Number(it.quantity ?? it.qty ?? it.qtd ?? 1) || 1,
      price: Number(it.price ?? it.preco ?? it.unitPrice ?? it.valor ?? 0) || 0
    }));
  }

  // Order number detection (order.id, order.orderId, order.order_id or rastreio.orderId)
  get orderNumber(): string | null {
    const o: any = this.rastreio as any;
    if (!o) return null;
    const id = o.orderId ?? o.id ?? o.order_id ?? o.orderIdString ?? null;
    return id !== undefined && id !== null ? String(id) : null;
  }

  // Formata endereço completo a partir de order.address ou order.address_snapshot
  get formattedAddress(): string {
    const o: any = this.rastreio as any;
    if (!o) return '';
    const addr = o.address ?? o.address_snapshot ?? null;
    if (!addr) return '';
    // addr pode ser string ou objeto
    if (typeof addr === 'string') return addr;
    const parts: string[] = [];
    if (addr.logradouro) parts.push(addr.logradouro + (addr.number ? ', ' + addr.number : ''));
    if (addr.addressNumber) parts.push(String(addr.addressNumber));
    if (addr.bairro) parts.push(addr.bairro);
    if (addr.localidade) parts.push(addr.localidade);
    if (addr.uf) parts.push(addr.uf);
    const base = parts.join(', ').trim();
    const complement = (o.client && (o.client.complement)) ?? (addr.complement) ?? null;
    return complement ? `${base} (${String(complement).trim()})` : base;
  }

  // Close/back button
  close() { this.router.navigate(['/cliente']); }

  // Show confirm button only when backend status maps to DELIVERED
  get showConfirmButton(): boolean {
    const raw = (this.rastreio?.status ?? '').toString();
    const s = raw.trim().toUpperCase().replace(/[-\s]+/g, '_');
    return s === (OrderStatus.DELIVERED) || s === 'FINISHED' || s === 'ENTREGUE';
  }

  confirmAndGoHome(){
    // Optional: call confirmDelivery to ensure backend recorded it
    if(this.orderId){
      try{ this.rastreioService.confirmDelivery(this.orderId); } catch(e){}
    }
    this.router.navigate(['/cliente']);
  }

  private enrichItemsForView(){
    const items = this.rastreio?.items || [];
    if (!items || items.length === 0) { this.viewItems = []; return; }
    const calls = items.map((it: any) => {
      const dishId = it.dishId ?? it.dish_id ?? it.id ?? null;
      if (!dishId) {
        return of({ dishId: null, name: it.name || 'Item', image: null, quantity: Number(it.quantity ?? it.qty ?? 1) || 1, price: Number(it.price ?? it.preco ?? 0) || 0 });
      }
      return this.dishService.findById(Number(dishId)).pipe(
        map((menuItem: any) => ({
          dishId,
          name: menuItem?.nome || menuItem?.name || it.name || 'Item',
          // prefer asset image by dishId as requested
          image: `assets/img/pratos/${dishId}.png`,
          quantity: Number(it.quantity ?? it.qty ?? 1) || 1,
          price: Number(it.price ?? it.preco ?? 0) || 0
        })),
        catchError(() => of({ dishId, name: it.name || 'Item', image: `assets/img/pratos/${dishId}.png`, quantity: Number(it.quantity ?? it.qty ?? 1) || 1, price: Number(it.price ?? it.preco ?? 0) || 0 }))
      );
    });

    forkJoin(calls).subscribe(results => {
      this.viewItems = results as any;
    }, () => { this.viewItems = []; });
  }

  // Esconde imagem quebrada no rastreio (mesma estratégia do carrinho)
  onImgError(event: any) {
    try { event.target.style.display = 'none'; } catch(e) { /* noop */ }
  }
}
