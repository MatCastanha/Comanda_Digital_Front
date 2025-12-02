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

  acceptOrder(order: Order){
    // mover para a lista local "em rota" sem tocar no backend
    this.pedidosDisponiveis = this.pedidosDisponiveis.filter(o => o.id !== order.id);
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
  }

  viewDetails(order: Order){ this.selectedOrder = order; }

  closeDetails(){ this.selectedOrder = null; }

  startDelivery(order?: Order | null){
    if(!order) return;
    // apenas atualiza estado local para visual
    this.inRouteOrders = this.inRouteOrders.map(o => o.id === order.id ? { ...o, status: OrderStatus.ON_THE_WAY } : o) as Order[];
    if(this.selectedOrder) this.selectedOrder.status = OrderStatus.ON_THE_WAY;
    this.closeDetails();
  }

  finishDelivery(order?: Order | null){
    if(!order) return;
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

  openCancel(order?: Order | null){ this.cancelTarget = order || null; this.showCancel = true; }

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
      status: OrderStatus.ON_THE_WAY
    };
    this.pedidosDisponiveis = [o, ...this.pedidosDisponiveis];
    // remover se estava em rota
    this.inRouteOrders = this.inRouteOrders.filter(i => i.id !== this.cancelTarget!.id);
    this.acceptedOrders = this.acceptedOrders.filter(id => id !== this.cancelTarget!.id);
    this.closeCancel();
    this.closeDetails();
  }

  private loadAvailableOrders(){
    // Busca ON_THE_WAY e READY em paralelo, mescla resultados e evita duplicatas.
    // ON_THE_WAY -> inRouteOrders (já em rota)
    // READY -> pedidosDisponiveis (apenas se não estiverem em rota)
    this.orderService.findByStatus('ON_THE_WAY').subscribe({
      next: (onRes: any) => {
        const onMapped: Order[] = Array.isArray(onRes) ? onRes.map((r: any) => this.mapBackendToOrder(r)) : [];

        this.orderService.findByStatus('READY').subscribe({
          next: (readyRes: any) => {
            const readyMapped: Order[] = Array.isArray(readyRes) ? readyRes.map((r: any) => this.mapBackendToOrder(r)) : [];

            // Junta os dois tipos de pedidos em disponíveis
            const allDisponiveis = [...readyMapped, ...onMapped];

            // Atualiza lista de disponíveis e também os que já estão em rota
            this.pedidosDisponiveis = allDisponiveis;
            this.inRouteOrders = onMapped;
          },
          error: () => {
            // Se READY falhar, mostra só os ON_THE_WAY
            this.pedidosDisponiveis = [...onMapped];
            this.inRouteOrders = onMapped;
          }
        });
      },
      error: () => {
        // Se ON_THE_WAY falhar, tenta carregar só os READY
        this.orderService.findByStatus('READY').subscribe({
          next: (r: any) => {
            const readyMapped: Order[] = Array.isArray(r) ? r.map((rr: any) => this.mapBackendToOrder(rr)) : [];
            this.pedidosDisponiveis = readyMapped;
            this.inRouteOrders = [];
          },
          error: () => {
            this.pedidosDisponiveis = [];
            this.inRouteOrders = [];
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
      address: r.address ?? r.clientAddress ?? '',
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

