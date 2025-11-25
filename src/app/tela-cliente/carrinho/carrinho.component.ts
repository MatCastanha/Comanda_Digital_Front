import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarrinhoService } from '../carrinho.service';
import { OrderService } from '../../../services/order.service';
import { OrderPayload } from '../../../interfaces/order.interface';

// Estrutura simples do item do carrinho usada neste componente
interface CarrinhoItem {
  id?: number | string;
  nome: string;
  descricao?: string;
  preco: number | string;
  UrlImage?: string;
  urlImagem?: string;
  quantidade: number;
  subtotal?: number;
}

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './carrinho.component.html',
  styleUrls: ['./carrinho.component.css']
})
export class CarrinhoComponent implements OnInit {

  itensCarrinho: CarrinhoItem[] = [];
  // checkout fields moved into carrinho
  endereco = 'Rua sei lá faltou ideia';
  pagamento = 'Pagamento na entrega';
  shipping = 10; // R$ 10
  orderPlaced = false; // mostra feedback após finalizar
  valorTotal = 0;

  constructor(private carrinhoService: CarrinhoService, private router: Router, private orderService: OrderService) {}

  goBack() {
    // Volta para a tela do cliente. Usamos router.navigate para garantir comportamento consistente.
    this.router.navigate(['/cliente']);
  }

  ngOnInit(): void {
    // Busca itens do serviço de carrinho (retorna array em memória)
    this.syncFromService();

    // Assina eventos de mudança nos itens para atualizar a lista quando outro componente alterar
    this.carrinhoService.itemsChanged$.subscribe(() => this.syncFromService());
  }

  private syncFromService() {
    const stored = this.carrinhoService.listar() || [];
    this.itensCarrinho = stored.map((it: any) => {
      const precoNum = this.toNumberPrice(it.preco);
      const quantidade = typeof it.quantidade === 'number' ? it.quantidade : (it.quantidade ? Number(it.quantidade) : 1);
      return {
        id: it.id,
        nome: it.nome || it.name || '',
        descricao: it.descricao || it.description || '',
        preco: precoNum,
        UrlImage: it.UrlImage || it.urlImage || it.urlImagem || it.image || '',
        quantidade,
        subtotal: precoNum * quantidade
      } as CarrinhoItem;
    });
    this.calcularTotais();
  }

  private toNumberPrice(v: any): number {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    let s = String(v);
    s = s.replace(/R\$|\s/g, '');
    s = s.replace(/\./g, '');
    s = s.replace(/,/g, '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  calcularTotais(): void {
    this.valorTotal = this.itensCarrinho.reduce((acc, item) => {
      item.subtotal = this.toNumberPrice(item.preco) * (item.quantidade || 0);
      return acc + (item.subtotal || 0);
    }, 0);
  }

  atualizarQuantidade(item: CarrinhoItem, delta: number): void {
    if (delta < 0 && item.quantidade === 1) {
      // se for diminuir quando quantidade=1, remove
      this.removerItem(item);
      return;
    }
    const nova = Math.max(0, (item.quantidade || 0) + delta);
    // atualizar no serviço e sincronizar
    this.carrinhoService.atualizarQuantidade(item, nova);
    this.syncFromService();
  }

  removerItem(item: CarrinhoItem) {
    this.carrinhoService.remover(item);
    this.syncFromService();
  }

  clearCart(): void {
    // Limpa totalmente o carrinho no serviço e sincroniza
    this.carrinhoService.clear();
    this.syncFromService();
  }

  openDetail(item: CarrinhoItem) {
    // se tivermos id, navega pela rota com id; caso contrário envia no state
    if (item.id !== undefined && item.id !== null) {
      this.router.navigate(['/item-detalhe', item.id]);
      return;
    }
    this.router.navigateByUrl('/item-detalhe', { state: { item } });
  }

  irParaCheckout(): void {
    // Navega para a tela de checkout
    // Antes o botão navegava para a tela de checkout.
    // Agora integramos o checkout na própria tela do carrinho: rolar/abrir a seção de checkout.
    // Como já mostramos os cards na página, apenas focamos o footer (UX leve).
    console.log('Botão continuar/finalizar clicado. itens=', this.itensCarrinho.length, 'valor=', this.valorTotal);
  }

  finalizarPedido(): void {
    if (this.itensCarrinho.length === 0) return;

    const payload: OrderPayload = {
      moment: new Date().toISOString(),
      status: 'PENDING',
      // client: { id: 1 }, // opcional: setar cliente quando tiver
      items: this.itensCarrinho.map(i => ({
        quantity: i.quantidade,
        price: typeof i.preco === 'number' ? i.preco : Number(i.preco) || 0,
        dish: { id: i.id ?? 0 }
      }))
    };

    console.log('Enviando pedido ao backend', payload);
    this.orderService.create(payload).subscribe({
      next: (res) => {
        console.log('Pedido criado com sucesso', res);
        this.carrinhoService.clear();
        this.syncFromService();
        this.orderPlaced = true;
      },
      error: (err) => {
        console.error('Erro criando pedido', err);
        // manter carrinho para tentativa posterior; mostrar feedback de erro
        alert('Erro ao criar pedido. Tente novamente.');
      }
    });
  }
}
