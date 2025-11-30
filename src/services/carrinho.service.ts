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
    if (!item) return;
    // identifica o dishId preferencialmente, fallback para id
    const incomingDishId = item.dishId ?? item.id ?? null;
    const incomingQty = item.quantidade ?? item.quantity ?? 1;

    if (incomingDishId !== null) {
      // procura existente por dishId ou id
      const found = this.items.find(i => String(i.dishId ?? i.id) === String(incomingDishId));
      if (found) {
        // aumenta quantidade existente (não cria duplicata)
        found.quantidade = (found.quantidade ?? found.quantity ?? 0) + Number(incomingQty);
        this.itemAddedSubject.next(found);
        this.itemsChangedSubject.next(this.items);
        return;
      }
      // não encontrou: cria novo item clonado para evitar referências externas
      const toAdd = {
        ...item,
        dishId: incomingDishId,
        id: item.id ?? incomingDishId,
        quantidade: Number(incomingQty)
      };
      this.items.push(toAdd);
      this.itemAddedSubject.next(toAdd);
      this.itemsChangedSubject.next(this.items);
      return;
    }

    // fallback quando não há id/dishId: adiciona por referência (como antes)
    const fallback = { ...item, quantidade: incomingQty };
    this.items.push(fallback);
    this.itemAddedSubject.next(fallback);
    this.itemsChangedSubject.next(this.items);
  }

  // Retorna itens do carrinho
  listar() {
    // retorna cópia superficial para evitar mutações acidentais de fora
    return this.items.map(i => ({ ...i }));
  }

  // Remove um item (por identidade ou por id se disponível)
  remover(item: any) {
    if (!item) return;
    const targetDishId = item.dishId ?? item.id ?? null;
    if (targetDishId !== null) {
      this.items = this.items.filter(i => String(i.dishId ?? i.id) !== String(targetDishId));
      this.itemsChangedSubject.next(this.items);
      return;
    }
    // fallback por referência
    const idx = this.items.indexOf(item);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.itemsChangedSubject.next(this.items);
    }
  }

  // Limpa o carrinho
  clear() {
    this.items = [];
    this.itemsChangedSubject.next(this.items);
  }

  // Atualiza quantidade de um item (por id ou referência)
  atualizarQuantidade(item: any, quantidade: number) {
    if (!item) return;
    const targetDishId = item.dishId ?? item.id ?? null;
    if (targetDishId !== null) {
      const found = this.items.find(i => String(i.dishId ?? i.id) === String(targetDishId));
      if (found) {
        found.quantidade = Number(quantidade);
        this.itemsChangedSubject.next(this.items);
        return;
      }
    }
    // fallback por referência
    const idx = this.items.indexOf(item);
    if (idx >= 0) {
      this.items[idx].quantidade = Number(quantidade);
      this.itemsChangedSubject.next(this.items);
    }
  }
}
