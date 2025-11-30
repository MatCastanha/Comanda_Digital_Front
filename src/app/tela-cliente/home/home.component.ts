import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DishService } from '../../../services/dish.service';
import { ClientService } from '../../../services/client.service';
import { MenuItem } from '../../menu-gerente/overview/overview.component';
import { CarrinhoService } from '../../../services/carrinho.service';
import { Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  dishes: MenuItem[] = [];
  filtered: MenuItem[] = [];
  categories: string[] = [];
  selectedCategory = 'Todas';
  search = '';

  greetingName = 'X';
  addressLine1 = '';
  addressLine2 = '';

  constructor(private dishService: DishService, private carrinho: CarrinhoService, private router: Router, private clientService: ClientService, private favs: FavoritesService) {}

  get cartCount(): number {
    return this.carrinho.listar().length;
  }

  ngOnInit(): void {
    // Se vier de navigation state com termo de busca, aplica antes de renderizar
    const s = history.state && (history.state as any).search;
    if (s) this.search = s;
    this.load();
    this.loadClientInfo();
  }

  private loadClientInfo() {
    // Pergunta diretamente ao backend — backend é a fonte da verdade
    this.clientService.getClient().subscribe({
      next: (c) => this.applyClientToView(c),
      error: (err) => { console.debug('Sem cliente no backend', err); }
    });
  }

  private applyClientToView(c: any) {
    if (!c) return;
    // nome: prefira name, fullName ou primeiro nome do cpf
    const name = c.name || c.firstName || c.nome || (c.cpf ? String(c.cpf) : null);
    if (name) this.greetingName = name;
    // endereço: forma de duas linhas: linha1 = logradouro + (bairro), linha2 = localidade, UF
    this.addressLine1 = '';
    this.addressLine2 = '';
    const addrObj = c.address || c.addressDTO || null;
    if (addrObj) {
      const line1Parts: string[] = [];
      if (addrObj.logradouro) line1Parts.push(addrObj.logradouro);
      if (addrObj.bairro) line1Parts.push(addrObj.bairro);
      this.addressLine1 = line1Parts.join(', ');
      const line2Parts: string[] = [];
      if (addrObj.localidade) line2Parts.push(addrObj.localidade);
      if (addrObj.uf) line2Parts.push(addrObj.uf);
      this.addressLine2 = line2Parts.join(', ');
    }
    if ((!this.addressLine1 || this.addressLine1.trim() === '') && c.endereco) {
      // fallback quando backend retorna string única
      const full = String(c.endereco || '');
      // tenta quebrar por vírgula: logradouro/bairro | localidade, UF
      const parts = full.split(',').map(p => p.trim());
      if (parts.length <= 2) {
        this.addressLine1 = full;
        this.addressLine2 = c.addressNumber ? (c.addressNumber + '') : '';
      } else {
        this.addressLine1 = parts.slice(0, Math.max(1, parts.length - 2)).join(', ');
        this.addressLine2 = parts.slice(-2).join(', ');
      }
    }
    if (this.addressLine1 && c.addressNumber) this.addressLine1 += ' / ' + c.addressNumber;
  }

  openBusca() {
    this.router.navigate(['/cliente/busca']);
  }

  load() {
    this.dishService.findAll().subscribe({
      next: (items) => {
        this.dishes = items;
        const set = new Set(items.map(i => i.categoria || 'Outros'));
        this.categories = ['Todas', ...Array.from(set)];
        this.applyFilter();
      },
      error: (e) => console.error('Erro ao carregar pratos', e)
    });
  }

  applyFilter() {
    const term = this.search.trim().toLowerCase();
    this.filtered = this.dishes.filter(d => {
      const matchCat = this.selectedCategory === 'Todas' || d.categoria === this.selectedCategory;
      const matchText = !term || (d.nome && d.nome.toLowerCase().includes(term));
      return matchCat && matchText;
    });
  }

  onCategory(cat: string) {
    this.selectedCategory = cat;
    this.applyFilter();
  }

  addToCart(item: MenuItem) {
    this.carrinho.adicionar({ ...item, quantidade: 1 });
  }

  isFavorite(item: MenuItem) {
    return this.favs.isFavorite(item?.id);
  }

  toggleFavorite(item: MenuItem, ev?: Event) {
    if (ev) ev.stopPropagation();
    this.favs.toggle(item);
  }
}
