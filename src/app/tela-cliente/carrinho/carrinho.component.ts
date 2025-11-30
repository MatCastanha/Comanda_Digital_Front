import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarrinhoService } from '../../../services/carrinho.service';
import { OrderService } from '../../../services/order.service';
import { ClientService } from '../../../services/client.service';
import { OrderPayload } from '../../../interfaces/order.interface';
import { forkJoin } from 'rxjs';

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
    // cálculo finalizado (logs de depuração removidos em limpeza)
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
    // Ação de continuar/finalizar acionada (sem logs de depuração)
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
      dishId: Number(i.id)
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
      // Preferimos enviar o CPF porque o backend busca cliente por CPF.
      const cleanCpf = (c: any) => String(c?.cpf || '').replace(/[^\d]/g, '');
      const storedCpf = cleanCpf(storedClient);
      if (storedCpf && storedCpf.length === 11) {
        payload.client = { cpf: storedCpf };
        this.sendOrder(payload);
        return;
      }

      // Se não temos CPF válido, solicitar atualização do perfil
      this.savingOrder = false;
      alert('Precisamos de seus dados completos antes de finalizar o pedido. Atualize seu perfil.');
      this.router.navigate(['/cliente/perfil']);
      return;
    }

    // If we don't have a cached client, ask backend for the current client and attach it
    this.clientService.getClient().subscribe({
      next: (client) => {
        // O backend busca por CPF. Limpa o CPF (apenas dígitos) e envia somente ele.
        const cleanCpf = (c: any) => String(c?.cpf || '').replace(/[^\d]/g, '');
        const cpfString = cleanCpf(client);

        if (cpfString && cpfString.length === 11) {
          payload.client = { cpf: cpfString };
          this.sendOrder(payload);
          return;
        }

        alert('CPF do cliente é inválido ou nulo. Por favor, atualize seu perfil.');
        this.savingOrder = false;
        this.router.navigate(['/cliente/perfil']);
      },
      error: (err) => {
        this.savingOrder = false;
        this.router.navigate(['/cliente/perfil']);
      }
    });
  }

  private sendOrder(payload: any): void {
    // valida payload.client.cpf (backend busca por CPF)
    if (!payload || !payload.client || !payload.client.cpf) {
      console.error('Tentativa de enviar pedido sem client.cpf', payload);
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
    // items já estão na forma esperada ({ quantity, price, dishId })
    // payload pronto para envio (logs de depuração removidos)
    // continua com o envio (alert é só para inspeção rápida)
    // envia payload para criação do pedido

    // 1) Cria rascunho de pedido (DRAFT)
    this.orderService.create(payload).subscribe({
      next: (res) => {
        // resposta do create
        const orderId = res && (res.id ?? res.orderId ?? res.order_id ?? null);
        if (!orderId) {
          this.savingOrder = false;
          console.error('Create retornou sem order id:', res);
          alert('Servidor não retornou id do pedido. Verifique servidor.');
          return;
        }

        // 2) Adiciona todos os itens via POST /orders/{orderId}/items
        const itemCalls = this.itensCarrinho.map(it => {
          const body = { quantity: Number(it.quantidade) || 1, price: Number(it.preco) || 0, dishId: Number(it.id) };
          return this.orderService.addItem(orderId, body);
        });

        if (itemCalls.length === 0) {
          // nenhum item: finaliza direto
          this.finalizeOrderFlow(orderId, res);
          return;
        }

        forkJoin(itemCalls).subscribe({
          next: (added) => {
            // 3) Finaliza o pedido
            this.finalizeOrderFlow(orderId, res);
          },
          error: (e) => {
            console.error('Erro ao adicionar items ao pedido:', e);
            this.savingOrder = false;
            alert('Falha ao adicionar itens ao pedido. Tente novamente.');
          }
        });
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

  private finalizeOrderFlow(orderId: any, createResponse: any) {
    this.orderService.finalize(orderId).subscribe({
      next: (finalOrder) => {
        this.savingOrder = false;
        this.carrinhoService.clear();
        this.syncFromService();
        // navega com o pedido finalizado recebido do backend
        this.router.navigate(['/cliente/pedido/aprovado'], { state: { order: finalOrder } });
      },
      error: (e) => {
        console.error('Erro ao finalizar pedido:', e);
        this.savingOrder = false;
        alert('Falha ao finalizar o pedido. Tente novamente.');
      }
    });
  }

  
}
