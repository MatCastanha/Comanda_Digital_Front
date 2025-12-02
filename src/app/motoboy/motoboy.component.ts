import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MotoboyHeaderComponent } from './motoboy-header.component';
import { DeliveryCardComponent } from './delivery-card.component';
import { DeliveryHistoryListComponent } from './delivery-history-list.component';
import { DeliveryDetailsComponent } from './delivery-details.component';
import { CancelModalComponent } from './cancel-modal.component';
import type { Order } from '../enums/order.model';
import { OrderService } from '../../services/order.service';
import { OrderStatus } from '../enums/order-status.enum';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-motoboy',
  standalone: true,
  imports: [CommonModule, FormsModule, MotoboyHeaderComponent, DeliveryCardComponent, DeliveryHistoryListComponent, DeliveryDetailsComponent, CancelModalComponent],
  templateUrl: './motoboy.component.html',
  styleUrls: ['./motoboy.component.css']
})
export class MotoboyComponent implements OnInit {
  pedidosDisponiveis: Order[] = [];
  inRouteOrders: Order[] = [];
  // apenas ids de pedidos aceitos no frontend
  acceptedOrders: number[] = [];

  entregasRecentes: Order[] = [];

  selectedOrder: Order | null = null;
  showCancel = false;
  cancelTarget: Order | null = null;

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadAvailableOrders();
    this.loadRecentFromStorage();
  }

  acceptOrder(order: any){
    // Atualiza status no backend e, após sucesso, move o pedido entre listas
    if(!order || !order.id) return;
    this.orderService.updateStatus(order.id, OrderStatus.ON_THE_WAY).subscribe({
      next: () => {
        // remover das disponíveis
        this.pedidosDisponiveis = this.pedidosDisponiveis.filter(o => o.id !== order.id);
        // adiciona em rota com status atualizado
        const inRoute: Order = {
          id: order.id,
          displayNumber: order.displayNumber ?? `Pedido Nº ${order.id}`,
          date: order.date ?? '',
          address: order.address ?? order.clientAddress ?? '',
          restaurantAddress: order.restaurantAddress,
          clientAddress: order.clientAddress,
          items: order.items ?? [],
          status: OrderStatus.ON_THE_WAY
        };
        this.inRouteOrders = [ inRoute, ...this.inRouteOrders ];
        this.acceptedOrders = [ ...this.acceptedOrders, order.id ];
      },
      error: (e) => {
        console.error('Falha ao aceitar pedido:', e);
        alert('Falha ao aceitar o pedido. Tente novamente.');
      }
    });
  }

  viewDetails(order: any){ if(!order || order instanceof Event) return; this.selectedOrder = order; }

  closeDetails(){ this.selectedOrder = null; }

  startDelivery(order?: any){
    if(!order || order instanceof Event) return;
    // apenas atualiza estado local para visual
    this.inRouteOrders = this.inRouteOrders.map(o => o.id === order.id ? { ...o, status: OrderStatus.ON_THE_WAY } : o) as Order[];
    if(this.selectedOrder) this.selectedOrder.status = OrderStatus.ON_THE_WAY;
    this.closeDetails();
  }

  finishDelivery(order?: any){
    if(!order || order instanceof Event) return;
    // confirmar entrega no backend
    this.orderService.updateStatus(order.id, OrderStatus.DELIVERED).subscribe({
      next: () => {
        // remover da lista em rota
        this.inRouteOrders = this.inRouteOrders.filter(o => o.id !== order.id);
        // remover do acceptedIds
        this.acceptedOrders = this.acceptedOrders.filter(id => id !== order.id);
        // adicionar às entregas recentes e persistir
        const delivered: Order = {
          id: order.id,
          displayNumber: order.displayNumber ?? `Pedido Nº ${order.id}`,
          date: order.date ?? '',
          address: order.address ?? order.clientAddress ?? '',
          restaurantAddress: order.restaurantAddress,
          clientAddress: order.clientAddress,
          items: order.items ?? [],
          status: OrderStatus.DELIVERED
        };
        this.entregasRecentes = [delivered, ...this.entregasRecentes];
        this.saveRecentToStorage();
        this.closeDetails();
      },
      error: () => {
        // falha: você pode mostrar uma notificação — por enquanto apenas fecha
        this.closeDetails();
      }
    });
  }

  openCancel(order?: any){ this.cancelTarget = order || null; this.showCancel = true; }

  closeCancel(){ this.cancelTarget = null; this.showCancel = false; }

  confirmCancel(){
    if(!this.cancelTarget) return this.closeCancel();
    // reset status and put back in disponíveis
    const o: Order = {
      id: this.cancelTarget!.id,
      displayNumber: this.cancelTarget!.displayNumber ?? `Pedido Nº ${this.cancelTarget!.id}`,
      date: this.cancelTarget!.date ?? '',
      address: this.cancelTarget!.address ?? this.cancelTarget!.clientAddress ?? '',
      restaurantAddress: this.cancelTarget!.restaurantAddress,
      clientAddress: this.cancelTarget!.clientAddress,
      items: this.cancelTarget!.items ?? [],
      // restored to available
      status: OrderStatus.READY
    };
    this.pedidosDisponiveis = [o, ...this.pedidosDisponiveis];
    // remover se estava em rota
    this.inRouteOrders = this.inRouteOrders.filter(i => i.id !== this.cancelTarget!.id);
    this.acceptedOrders = this.acceptedOrders.filter(id => id !== this.cancelTarget!.id);
    this.closeCancel();
    this.closeDetails();
  }

  private loadAvailableOrders(){
    // Carrega READY, ON_THE_WAY e DELIVERED em uma única chamada quando possível e aplica filtros exclusivos.
    this.orderService.findByStatuses(['ON_THE_WAY', 'READY', 'DELIVERED']).subscribe({
      next: (res: any) => {
        const mapped: Order[] = Array.isArray(res) ? res.map((r: any) => this.mapBackendToOrder(r)) : [];

        // Deduplicar por id (mantendo a primeira ocorrência)
        const unique: Order[] = mapped.reduce((acc: Order[], cur: Order) => {
          if (!acc.some(a => a.id === cur.id)) acc.push(cur);
          return acc;
        }, []);

        // Aplicar filtros exclusivos por status
        this.pedidosDisponiveis = unique.filter(o => o.status === OrderStatus.READY);
        this.inRouteOrders = unique.filter(o => o.status === OrderStatus.ON_THE_WAY);
        this.entregasRecentes = unique.filter(o => o.status === OrderStatus.DELIVERED);
      },
      error: () => {
        // fallback: tenta carregar READY apenas
        this.orderService.findByStatus('READY').subscribe({
          next: (r: any) => {
            const readyMapped: Order[] = Array.isArray(r) ? r.map((rr: any) => this.mapBackendToOrder(rr)) : [];
            this.pedidosDisponiveis = readyMapped;
            this.inRouteOrders = [];
            this.entregasRecentes = [];
          },
          error: () => {
            this.pedidosDisponiveis = [];
            this.inRouteOrders = [];
            this.entregasRecentes = [];
          }
        });
      }
    });
  }

  private mapBackendToOrder(r: any): Order {
    const id = r.id ?? r.orderId ?? 0;
    const items = Array.isArray(r.items) ? r.items.map((it: any) => ({
      name: it.name ?? it.dishName ?? it.dish?.name ?? 'Item',
      quantity: it.quantity ?? it.qty ?? 1,
      price: it.price ?? it.unitPrice ?? 0
    })) : [];

    // map backend status (string) into our OrderStatus enum
    const status = this.mapStatus(r.status);

    return {
      id,
      displayNumber: r.displayNumber ?? `Pedido Nº ${id}`,
      date: r.date ?? r.createdAt ?? '',
     address: r.address ?? r.clientAddress ?? r.addressSnapshot ?? '',

      restaurantAddress: r.restaurantAddress,
      clientAddress: r.clientAddress,
      items,
      status
    } as Order;
  }

  private mapStatus(s: any): Order['status'] {
    if (!s && s !== 0) return OrderStatus.ON_THE_WAY;
    const raw = String(s).toUpperCase().trim();
    // direct mapping if matches enum key
    if ((OrderStatus as any)[raw]) return (OrderStatus as any)[raw];
    // common backend labels -> map to our enum
    if (raw === 'READY' || raw === 'PRONTO') return OrderStatus.READY;
    if (raw === 'OUT_FOR_DELIVERY' || raw === 'EN_ROUTE' || raw === 'ON_THE_WAY' || raw === 'DELIVERY') return OrderStatus.ON_THE_WAY;
    if (raw === 'DELIVERED' || raw === 'ENTREGUE' || raw === 'FINISHED') return OrderStatus.DELIVERED;
    return OrderStatus.ON_THE_WAY;
  }

  private saveRecentToStorage(){
    try{ localStorage.setItem('motoboy.recentDeliveries', JSON.stringify(this.entregasRecentes)); } catch(e){}
  }

  private loadRecentFromStorage(){
    try{
      const raw = localStorage.getItem('motoboy.recentDeliveries');
      if(raw){ this.entregasRecentes = JSON.parse(raw) as Order[]; }
    }catch(e){ this.entregasRecentes = []; }
  }
}

