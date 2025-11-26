import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarrinhoService } from '../carrinho.service';
import { OrderService } from '../../../services/order.service';
import { ClientService } from '../../../services/client.service';
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
  // util simples para remover máscaras (CPF etc.)
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
  savingOrder = false;

  constructor(private carrinhoService: CarrinhoService, private router: Router, private orderService: OrderService, private clientService: ClientService) {}

  // Navega para a tela de perfil do cliente
  goToPerfil(): void {
    this.router.navigate(['/cliente/perfil']);
  }

  goBack() {
    // Volta para a tela do cliente. Usamos router.navigate para garantir comportamento consistente.
    this.router.navigate(['/cliente']);
  }

  ngOnInit(): void {
    // Busca itens do serviço de carrinho (retorna array em memória)
    this.syncFromService();

    // Assina eventos de mudança nos itens para atualizar a lista quando outro componente alterar
    this.carrinhoService.itemsChanged$.subscribe(() => this.syncFromService());
    // tenta obter dados do cliente para exibir endereço no resumo
    this.loadClientInfo();
  }

  private loadClientInfo() {
    this.clientService.getClient().subscribe({
      next: (c) => this.applyClientToView(c),
      error: () => { /* sem cliente, mantém valor padrão */ }
    });
  }

  private applyClientToView(c: any) {
    if (!c) return;
    let addr = '';
    const addrObj = c.address || c.addressDTO || null;
    if (addrObj) {
      const parts = [] as string[];
      if (addrObj.logradouro) parts.push(addrObj.logradouro);
      if (addrObj.bairro) parts.push(addrObj.bairro);
      if (addrObj.localidade) parts.push(addrObj.localidade);
      if (addrObj.uf) parts.push(addrObj.uf);
      addr = parts.join(', ');
    }
    if (!addr && c.endereco) addr = c.endereco;
    if (addr) this.endereco = addr + (c.addressNumber ? ' / ' + c.addressNumber : '');
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
    console.debug('Carrinho sync: stored=', stored, 'mapped=', this.itensCarrinho, 'valorTotal=', this.valorTotal);
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
    console.debug('calcularTotais -> valorTotal=', this.valorTotal, 'itens=', this.itensCarrinho.map(i=>({id:i.id,quant:i.quantidade,subtotal:i.subtotal}))); 
  }

  atualizarQuantidade(item: CarrinhoItem, delta: number): void {
    if (delta < 0 && item.quantidade === 1) {
      // se for diminuir quando quantidade=1, remove
      this.removerItem(item);
      return;
    }
    const nova = Math.max(0, (item.quantidade || 0) + delta);
    // atualizar no serviço e sincronizar
    console.debug('atualizarQuantidade -> item', item, 'delta', delta, 'nova', nova);
    this.carrinhoService.atualizarQuantidade(item, nova);
    // sincroniza novamente para refletir mudança
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
    if (this.savingOrder) return;
    this.savingOrder = true;

    // Monta payload minimamente compatível com DTOs Java comuns.
    // Alguns backends preferem receber apenas 'items' e 'client' e definem moment/status no servidor.
    // Prefer fetching client from backend; do not rely on localStorage as source-of-truth
    const clientId = null;
    let storedClient: any = null;
    const itemsPayload = this.itensCarrinho.map(i => ({
      quantity: Number(i.quantidade) || 1,
      price: Number(typeof i.preco === 'number' ? i.preco : Number(i.preco)) || 0,
      dish: { id: Number(i.id) }
    }));

    // Payload enxuto — remove 'moment' e 'status' para evitar incompatibilidades se o backend gerar automaticamente
    const payload: any = {
      items: itemsPayload
    };
    if (clientId) {
      // preserve stored id as-is (could be cpf string or numeric id)
      payload.client = { id: clientId };
    }

    // Se já temos clientId local, chama direto; caso contrário, tenta obter do backend
    if (storedClient && (storedClient.id !== undefined && storedClient.id !== null || storedClient.cpf)) {
      // Se temos id (pode ser 0) use direto
      if (storedClient.id !== undefined && storedClient.id !== null) {
        payload.client = { id: storedClient.id, cpf: storedClient.cpf };
        // valida items antes de enviar
        if (!this.validateItems(payload)) { this.savingOrder = false; return; }
        this.sendOrder(payload);
        return;
      }

      // Se só temos CPF, NÃO tente sobrescrever/`saveOrUpdate` com payload parcial
      // isso pode apagar campos existentes no backend (evita regressão vista em produção).
      this.savingOrder = false;
      alert('Precisamos de seus dados completos antes de finalizar o pedido. Atualize seu perfil.');
      this.router.navigate(['/cliente/perfil']);
      return;
    }

    // If we don't have a cached client, ask backend for the current client and attach it
    this.clientService.getClient().subscribe({
      next: (client) => {
        if (client && (client.cpf || client.id !== undefined && client.id !== null)) {
          // se backend já retorna id use direto (aceita id = 0)
          if (client.id !== undefined && client.id !== null) {
            payload.client = { id: client.id, cpf: client.cpf };
            // do not store client in localStorage; backend is the source of truth
            if (!this.validateItems(payload)) { this.savingOrder = false; return; }
            this.sendOrder(payload);
            return;
          }

          // se só temos cpf no retorno do backend, NÃO tente sobrescrever o registro enviando
          // apenas {cpf} — isso pode zerar outros campos no banco. Requeira atualização do perfil.
          this.savingOrder = false;
          alert('Precisamos de seus dados completos antes de finalizar o pedido. Atualize seu perfil.');
          this.router.navigate(['/cliente/perfil']);
        } else {
          alert('Precisamos de seus dados (CPF) antes de finalizar o pedido.');
          this.savingOrder = false;
          this.router.navigate(['/cliente/perfil']);
        }
      },
      error: (err) => {
        this.savingOrder = false;
        this.router.navigate(['/cliente/perfil']);
      }
    });
  }

  private sendOrder(payload: any): void {
    // valida payload.client.id mais uma vez antes de enviar
    if (!payload || !payload.client || payload.client.id === undefined || payload.client.id === null) {
      console.error('Tentativa de enviar pedido sem client.id', payload);
      this.savingOrder = false;
      alert('Erro interno: cliente inválido. Atualize seu perfil e tente novamente.');
      this.router.navigate(['/cliente/perfil']);
      return;
    }
    // Não envie um possible 'id' nulo para o backend (pode confundir mapeamento)
    if ('id' in payload && (payload.id === null || payload.id === undefined)) {
      delete payload.id;
    }
    // Remova moment/status se não quisermos forçar o backend
    if ('moment' in payload && (payload.moment === null || payload.moment === undefined)) delete payload.moment;
    if ('status' in payload && (payload.status === null || payload.status === undefined)) delete payload.status;
    // Garante que dish.id existam como valores primitivos (não NaN)
    payload.items = payload.items.map((it: any) => ({ ...it, dish: { id: it?.dish?.id } }));
    console.debug('Enviando payload de pedido:', payload);
    // DEBUG: mostrar o payload em um alert para captura rápida (remover depois)
    try {
      alert(JSON.stringify(payload, null, 2));
    } catch (e) {
      console.debug('Falha ao alertar payload, imprimindo no console', payload);
    }
    // continua com o envio (alert é só para inspeção rápida)
    this.orderService.create(payload).subscribe({
      next: (res) => {
        console.log('Pedido criado com sucesso', res);
        this.savingOrder = false;
        this.carrinhoService.clear();
        this.syncFromService();
        this.router.navigate(['/cliente/pedido/aprovado'], { state: { order: res } });
      },
      error: (err) => {
        console.error('Erro criando pedido', err);
        this.savingOrder = false;
        let msg = 'Erro ao criar pedido. Tente novamente.';
        try {
          if (err && err.error) {
            msg = typeof err.error === 'string' ? err.error : (err.error.message || JSON.stringify(err.error));
          } else if (err && err.message) {
            msg = err.message;
          }
        } catch (e) {}
        alert(msg);
      }
    });
  }

  // Valida que cada item possui dish.id numérico não-nulo e quantidade/price coerentes
  private validateItems(payload: any): boolean {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      alert('Carrinho vazio. Adicione itens antes de finalizar o pedido.');
      return false;
    }
    for (let i = 0; i < payload.items.length; i++) {
      const it = payload.items[i];
      const dishId = Number(it?.dish?.id);
      if (!dishId || !isFinite(dishId) || dishId <= 0) {
        const nome = this.itensCarrinho[i]?.nome || `item ${i + 1}`;
        alert(`Item inválido no carrinho: "${nome}" sem identificador válido.`);
        return false;
      }
      const qty = Number(it.quantity || 0);
      if (!qty || qty <= 0) {
        alert(`Quantidade inválida para o item ${i + 1}.`);
        return false;
      }
      const price = Number(it.price || 0);
      if (isNaN(price) || price < 0) {
        alert(`Preço inválido para o item ${i + 1}.`);
        return false;
      }
    }
    return true;
  }
}
