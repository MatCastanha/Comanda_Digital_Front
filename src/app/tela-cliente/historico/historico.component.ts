import { Component } from '@angular/core';
import { CarrinhoService } from '../../../services/carrinho.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './historico.component.html',
  styleUrl: './historico.component.css'
})
export class HistoricoComponent {
  tab: 'favoritos' | 'historico' = 'favoritos';
  favoritos: any[] = [];
  constructor(public carrinho: CarrinhoService, private fav: FavoritesService, private router: Router) {
    this.favoritos = this.fav.list();
    this.fav.changed$.subscribe(list => this.favoritos = list.slice());
  }

  get cartCount(): number {
    return this.carrinho.listar().length;
  }

  abrirDetalhe(item: any) {
    if (!item || !item.id) return;
    this.router.navigate(['/item-detalhe', item.id]);
  }

  toggleFav(item: any) {
    this.fav.toggle(item);
  }

  reorderToCart(item: any) {
    // adiciona ao carrinho (sem backend) como demonstração
    this.carrinho.adicionar({ ...item, quantidade: 1 });
  }

  displayPrice(item: any): string {
    if (!item) return '';
    const p = item.preco ?? item.price ?? item.precoStr ?? null;
    if (p === null || p === undefined) return '';
    if (typeof p === 'number') return 'R$ ' + p.toFixed(2).replace('.', ',');
    const s = String(p).trim();
    // evita duplicar R$
    if (/^R\$/.test(s)) return s;
    // if already formatted with comma or dot, just prefix
    return 'R$ ' + s;
  }
}
