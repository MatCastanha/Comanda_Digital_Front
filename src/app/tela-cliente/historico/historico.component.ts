import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { OrderService, OrderDTO, OrderItemDTO } from '../../../services/order.service';
import { CarrinhoService } from '../../../services/carrinho.service';
import { FavoritesService } from '../../../services/favorites.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.css'
})
export class HistoricoComponent implements OnInit {
  tab: 'favoritos' | 'historico' = 'favoritos';
  favoritos: any[] = [];
  orders: OrderDTO[] = [];
  loading = false;
  errorMsg = '';

  constructor(private orderService: OrderService, private carrinho: CarrinhoService, private fav: FavoritesService, private router: Router) {}

  ngOnInit(): void {
    this.loadOrders();
    // inicializa favoritos a partir do serviço
    this.favoritos = this.fav.list();
    this.fav.changed$.subscribe(list => this.favoritos = list.slice());
  }

  loadOrders() {
    this.loading = true;
    this.errorMsg = '';
    this.orderService.findAll().subscribe({
      next: (list) => {
        // ordenar por createdAt (se existir) ou por id desc
        this.orders = (list || []).slice().sort((a, b) => {
          const ta = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
          const tb = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
          if (ta || tb) return tb - ta;
          // fallback: id numérico desc
          try { return Number(b.id) - Number(a.id); } catch { return 0; }
        });
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 404) this.errorMsg = 'Nenhum pedido encontrado.';
        else this.errorMsg = 'Erro ao carregar pedidos. Tente novamente mais tarde.';
      }
    });
  }

  // UI helpers
  firstImage(order: OrderDTO): string {
    if (!order || !order.items || order.items.length === 0) return 'assets/placeholder.png';
    const img = order.items[0].dishImage || (order.items[0] as any).image || '';
    return img && img.trim() !== '' ? img : 'assets/placeholder.png';
  }

  titleFor(order: OrderDTO): string {
    if (!order || !order.items) return 'Pedido';
    if (order.items.length === 0) return 'Pedido sem itens';
    // juntar todos os nomes dos pratos com ' + '
    try {
      const names = (order.items || []).map(it => (it as any).dishName || (it as any).name || '').filter(n => n && n.trim() !== '');
      if (names.length === 0) return 'Pedido';
      return names.join(' + ');
    } catch {
      return order.items.length === 1 ? order.items[0].dishName : 'Pedido';
    }
  }

  displayTotal(order: OrderDTO): string {
    if (!order) return '';
    const t = order.total ?? 0;
    return 'R$ ' + Number(t).toFixed(2).replace('.', ',');
  }

  isInProgress(status: string) {
    const s = (status || '').toUpperCase();
    return ['RECEIVED','IN_PREPARATION','READY','ON_THE_WAY'].includes(s);
  }

  isDelivered(status: string) { return String(status || '').toUpperCase() === 'DELIVERED'; }
  isCancelled(status: string) { return String(status || '').toUpperCase() === 'CANCELLED'; }

  acompanhar(order: OrderDTO) {
    if (!order) return;
    // navegar para a tela de rastreio do cliente passando o pedido via navigation state
    // o componente `RastreioComponent` tenta popular a UI a partir do history.state
    try {
      this.router.navigate(['/cliente/rastreio'], { state: { order } });
    } catch (e) {
      // fallback: navegar com query param orderId
      this.router.navigate(['/cliente/rastreio'], { queryParams: { orderId: order.id } });
    }
  }

  pedirNovamente(order: OrderDTO) {
    if (!order || !order.items) return;
    // Reusar itens do pedido e adicionar ao carrinho
    for (const it of order.items) {
      this.carrinho.adicionar({ id: it.dishId ?? null, name: it.dishName, price: it.price, quantity: it.quantity, UrlImage: it.dishImage });
    }
    // opcional: navegar ao carrinho
    this.router.navigate(['/cliente/carrinho']);
  }

  abrirDetalhe(item: any) {
    if (!item) return;
    const id = item.id ?? item._id ?? item.dishId;
    if (id) this.router.navigate(['/item-detalhe', id]);
  }

  toggleFav(item: any) {
    try { this.fav.toggle(item); } catch (e) { console.warn('toggleFav error', e); }
  }
}
