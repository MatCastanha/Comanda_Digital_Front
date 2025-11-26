import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  private items: any[] = [];
  private itemAddedSubject = new Subject<any>();
  // Observable público para componentes escutarem quando um item for adicionado
  itemAdded$ = this.itemAddedSubject.asObservable();
  private itemsChangedSubject = new Subject<any[]>();
  itemsChanged$ = this.itemsChangedSubject.asObservable();

  constructor() { }

  // Adiciona item ao carrinho (memória). Emite evento para feedback visual.
  adicionar(item: any) {
    this.items.push(item);
    this.itemAddedSubject.next(item);
    this.itemsChangedSubject.next(this.items);
  }

  // Retorna itens do carrinho
  listar() {
    return this.items;
  }

  // Remove um item (por identidade ou por id se disponível)
  remover(item: any) {
    if (!item) return;
    const id = item.id !== undefined ? item.id : null;
    if (id !== null) {
      // compara ids como string para evitar mismatch number|string
      this.items = this.items.filter(i => String(i.id) !== String(id));
    } else {
      // fallback por referência
      const idx = this.items.indexOf(item);
      if (idx >= 0) this.items.splice(idx, 1);
    }
    this.itemsChangedSubject.next(this.items);
  }

  // Limpa o carrinho
  clear() {
    this.items = [];
    this.itemsChangedSubject.next(this.items);
  }

  // Atualiza quantidade de um item (por id ou referência)
  atualizarQuantidade(item: any, quantidade: number) {
    if (!item) return;
    const id = item.id !== undefined ? item.id : null;
    if (id !== null) {
      // compara ids convertendo para string para evitar mismatch
      const found = this.items.find(i => String(i.id) === String(id));
      if (found) found.quantidade = quantidade;
    } else {
      const idx = this.items.indexOf(item);
      if (idx >= 0) this.items[idx].quantidade = quantidade;
    }
    this.itemsChangedSubject.next(this.items);
  }
}
