// IMPORTAÇÕES PRINCIPAIS
import { Component, OnInit, OnDestroy, signal } from '@angular/core';

// Importações de Módulos Comuns para usar directives como *ngIf, *ngFor, etc
import { NgIf, NgFor, NgClass, DatePipe } from '@angular/common'; 

// Importações do CDK Drag & Drop para permitir arrastar e soltar cards entre colunas
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop'; 
import { OrderService } from '../../../services/order.service';



// DEFINIÇÃO DE TIPOS E INTERFACES
// Interface que define a estrutura de um item dentro de um pedido (nome e quantidade)
interface OrderItem {
  name: string;
  qty: number;
}

// Interface que define a estrutura completa de um pedido do sistema
export interface Order { 
  id: string;                                           // ID único do pedido
  orderId: number;                                      // Número do pedido para exibição
  table: string;                                    
  status: 'A PREPARAR' | 'EM PREPARO' | 'PRONTO' | 'ENTREGUE';  // Estado atual do pedido
  items: OrderItem[];                                   // Lista de itens do pedido
  timestamp: Date;                                      // Data/hora de criação do pedido
  receivedAt?: Date;                                    // quando o pedido foi marcado como RECEIVED
  deliveredAt?: Date;                                   // quando o pedido foi marcado como DELIVERED
  justUpdated?: boolean;                                // Flag para animar quando o status muda
}

// Declarações globais (variables do ambiente externo que podem estar disponíveis)
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string;
@Component({
  selector: 'app-painel',
  standalone: true,
  imports: [
    // Imports Standalone Corretos:
    NgIf, NgFor, NgClass, DatePipe,// Comuns
    CdkDrag, CdkDropList, CdkDropListGroup // CDK Drag & Drop
  ], 
  templateUrl: './painel.component.html',
  styleUrl: './painel.component.css',
})
export class PainelComponent implements OnInit, OnDestroy {

  // ========== SINAIS (SIGNALS) - Estado Reativo do Componente ==========
  // Um Signal é como uma variável reativa que notifica quando muda
  
  // SINAL DA DATA E HORA ATUAL - Atualiza a cada segundo
  currentDateTime = signal<Date>(new Date());
  private updateIntervalId: any;  // ID do intervalo que atualiza a hora

  // ========== COLUNAS DO KANBAN - Listas de pedidos por status ==========
  // Cada sinal armazena um array de pedidos em cada etapa do fluxo
  
  // Sinais iniciados vazios — iremos popular com dados reais do backend
  toPrepare = signal<Order[]>([]);
  inProgress = signal<Order[]>([]);
  ready = signal<Order[]>([]);
  delivered = signal<Order[]>([]);

  constructor(private orderService: OrderService) {}
  
  // ========== PROPRIEDADES AUXILIARES ==========
  
  // Caminho da logo - tenta usar /assets/logo.png e faz fallback para favicon
  logoSrc = '/assets/logo.png';

  // Sinal para armazenar o texto de busca digitado pelo usuário
  searchQuery = signal('');
  
  // ========== LIFECYCLE - ngOnInit (quando o componente é inicializado) ==========
  ngOnInit() { 
    // Inicia um intervalo que atualiza a data/hora a cada 1000ms (1 segundo)
    // Isso faz o relógio no header ficar sempre com a hora correta
    this.updateIntervalId = setInterval(() => {
      this.currentDateTime.set(new Date());
    }, 1000);

    // Carrega pedidos reais ao inicializar
    this.loadOrders();
  }

  // Atualiza / Recarrega pedidos (botão 'refresh')
  listenForOrders() {
    this.loadOrders();
  }

  // Carrega todos os pedidos do backend e popula as colunas
  loadOrders(): void {
    this.orderService.findAll().subscribe({
      next: (orders: any[]) => {
        if (!Array.isArray(orders)) return;
        // Filtra pedidos não DRAFT
        const real = orders.filter(o => {
          const st = (o.status || o.state || '').toString().toUpperCase();
          return st !== 'DRAFT';
        });

        // Mapeia e ordena por data de criação (mais antigos primeiro)
        const mapped = real.map(o => this.mapBackendOrder(o))
                           .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

        // Limpa listas e popula com os itens mapeados
        const toPrepareArr: Order[] = [];
        const inProgressArr: Order[] = [];
        const readyArr: Order[] = [];
        const deliveredArr: Order[] = [];

        for (const o of mapped) {
          switch (o.status) {
            case 'A PREPARAR': toPrepareArr.push(o); break;
            case 'EM PREPARO': inProgressArr.push(o); break;
            case 'PRONTO': readyArr.push(o); break;
            case 'ENTREGUE': deliveredArr.push(o); break;
            default: break;
          }
        }

        this.toPrepare.set(toPrepareArr);
        this.inProgress.set(inProgressArr);
        this.ready.set(readyArr);
        this.delivered.set(deliveredArr);
      },
      error: (err) => {
        console.error('Erro ao carregar pedidos:', err);
      }
    });
  }

  // Mapeia um objeto de pedido do backend para a interface local Order
  private mapBackendOrder(o: any): Order {
    const id = o.id ?? o.orderId ?? String(o.id ?? Math.random());
    const orderId = o.orderNumber ?? o.orderId ?? (typeof o.id === 'number' ? o.id : NaN);
    const table = o.table ?? o.tableNumber ?? '';
    // Determina timestamp a partir de propriedades comuns
    const tsRaw = o.moment ?? o.createdAt ?? o.timestamp ?? o.created ?? o.dateTime;
    const timestamp = tsRaw ? new Date(tsRaw) : new Date();
    // Mapeia status backend para labels em português usados pela UI
    const backendStatus = (o.status || '').toString().toUpperCase();
    let statusLabel: Order['status'] = 'A PREPARAR';
    if (backendStatus === 'RECEIVED') statusLabel = 'A PREPARAR';
    else if (backendStatus === 'IN_PREPARATION') statusLabel = 'EM PREPARO';
    else if (backendStatus === 'READY') statusLabel = 'PRONTO';
    else if (backendStatus === 'DELIVERED') statusLabel = 'ENTREGUE';

    const items: OrderItem[] = (o.items || []).map((it: any) => ({
      name: it.dish?.name || it.dishName || it.name || it.productName || it.description || 'Item',
      qty: it.quantity ?? it.qty ?? 1
    }));

    // tenta extrair timestamps de received/delivered (varia conforme backend)
    const receivedRaw = o.receivedAt ?? o.receivedTimestamp ?? o.statusTimestamps?.received ?? o.timestamps?.received;
    const deliveredRaw = o.deliveredAt ?? o.deliveredTimestamp ?? o.statusTimestamps?.delivered ?? o.timestamps?.delivered;
    const receivedAt = receivedRaw ? new Date(receivedRaw) : undefined;
    const deliveredAt = deliveredRaw ? new Date(deliveredRaw) : undefined;

    return {
      id: String(id),
      orderId: Number(orderId) || 0,
      table,
      status: statusLabel,
      items,
      timestamp,
      receivedAt,
      deliveredAt
    } as Order;
  }

  // ========== LIFECYCLE - ngOnDestroy (quando o componente é destruído) ==========
  ngOnDestroy() {
    // Para o intervalo de atualização de hora
    // Isso libera memória e evita vazamentos de memória
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
  }

  // ========== MÉTODOS DE AÇÃO - Handlers de cliques de botão ==========
  
  // Método executado quando clica o botão de ATUALIZAR pedidos
  // (implementado acima para chamar loadOrders)

  // Método executado quando a imagem da logo FALHA ao carregar
  onLogoError() {
    // Se /assets/logo.png não existir, tenta usar o favicon como fallback
    if (this.logoSrc !== '/favicon.ico') {
      this.logoSrc = '/favicon.ico';
    }
  }

  // ========== MÉTODOS DE FILTRAGEM E BUSCA ==========
  
  // Filtra uma lista de pedidos com base no texto digitado na busca
  // Procura por: número do pedido, mesa ou nome de algum item
  filterOrders(list: Order[]): Order[] {
    // Pega o texto de busca e converte para minúsculas para comparação
    const q = this.searchQuery().toLowerCase().trim();
    // Se não houver texto, retorna todos os pedidos
    if (!q) return list;
    // Filtra apenas os pedidos que correspondem à busca
    return list.filter(o => {
      // Verifica se o número do pedido contém o texto procurado
      if (o.orderId.toString().includes(q)) return true;
      // Verifica se a mesa contém o texto procurado
      if (o.table && o.table.toLowerCase().includes(q)) return true;
      // Verifica se algum item do pedido tem o nome procurado
      if (o.items && o.items.some(i => i.name.toLowerCase().includes(q))) return true;
      // Se não achou em nada, não inclui na busca
      return false;
    });
  }


  /**
   * Calcula o tempo decorrido entre o timestamp do pedido e a hora atual
   * Retorna uma string formatada (ex: "há 5 minutos", "há 2 horas")
   */
  getTimeElapsed(timestamp: Date): string {
    // Pega a hora atual do sinal
    const now = this.currentDateTime();
    // Calcula a diferença em segundos entre agora e quando foi criado
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    // Se menos de 60 segundos, mostra uma mensagem genérica
    if (diffInSeconds < 60) {
      return 'há alguns segundos';
    } 
    // Se menos de 1 hora, converte para minutos
    else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } 
    // Se 1 hora ou mais, converte para horas
    else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    }
  }
  
  // ========== MÉTODOS DE DRAG & DROP - Arrastar e Soltar Cards entre Colunas ==========
  
  // Executado quando um card é arrastado de uma coluna para outra
  // O evento contém informações sobre qual card foi movido e para onde
  // CORREÇÃO CRÍTICA NGTSC(2345): Tipagem correta do evento CdkDragDrop
  drop(event: CdkDragDrop<Order[]>) { 
    // Bloqueia arrastar pedidos que já estão na coluna ENTREGUE (histórico)
    if (event.previousContainer.id === 'deliveredList') {
      return;
    }

    // Se o card foi soltado na MESMA coluna, apenas reordena a posição
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    // Se foi soltado em uma coluna DIFERENTE, transfere o card
    transferArrayItem(
      event.previousContainer.data,   // Remove da coluna antiga
      event.container.data,           // Adiciona na coluna nova
      event.previousIndex,            // Posição antiga
      event.currentIndex              // Posição nova
    );

    // Determina qual é o novo status baseado no ID da coluna destino
    let newStatus: Order['status'];
    switch (event.container.id) {
      case 'toPrepareList': newStatus = 'A PREPARAR'; break;
      case 'inProgressList': newStatus = 'EM PREPARO'; break;
      case 'readyList': newStatus = 'PRONTO'; break;
      case 'deliveredList': newStatus = 'ENTREGUE'; break;
      default: return;
    }


    const movedOrder = event.container.data[event.currentIndex];
    movedOrder.status = newStatus;

    // Persistência local do início/final do preparo
    const backendId = (movedOrder.orderId && movedOrder.orderId > 0) ? movedOrder.orderId : movedOrder.id;
    if (newStatus === 'EM PREPARO') {
      this.setPrepStart(backendId);
    } else if (newStatus === 'PRONTO' || newStatus === 'ENTREGUE') {
      this.finalizePrep(backendId);
    }

    // Persiste alteração de status no backend
    this.updateOrderStatus(backendId, newStatus);

    // Ativa o flag de "justUpdated" para mostrar uma animação visual
    movedOrder.justUpdated = true;
    setTimeout(() => movedOrder.justUpdated = false, 700);
  }

  // ========== MÉTODOS DE ESTILO E CORES - Retornar classes/cores baseadas no status ==========
  
  // Cores baseadas no Figma (para a barra lateral do card)
  getStatusColor(status: Order['status']): string {
    switch (status) {
        case 'A PREPARAR': return 'border-red-500';      // Vermelho para pedidos novos
        case 'EM PREPARO': return 'border-orange-500';   // Laranja para pedidos em progresso
        case 'PRONTO': return 'border-green-500';        // Verde para pedidos finalizados
        case 'ENTREGUE': return 'border-blue-500';       // Azul para pedidos entregues
        default: return '';
    }
  }

  // ========== MÉTODOS DE TRANSIÇÃO DE STATUS - Mover pedidos entre colunas por botão ==========
  
  /**
   * Move um pedido para o próximo status por clique em botão de ação
   * A PREPARAR → EM PREPARO → PRONTO → ENTREGUE
   */
  moveOrderToNextStatus(orderId: number): void {
    // Faz cópias das listas atuais para evitar problemas de reatividade
    const currentToPrepare = this.toPrepare();
    const currentInProgress = this.inProgress();
    const currentReady = this.ready();
    const currentDelivered = this.delivered();

    // ========== ETAPA 1: De "A PREPARAR" para "EM PREPARO" ==========
    // Procura o pedido em cada lista e o move para a próxima
    let orderIndex = currentToPrepare.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      // Remove o pedido da lista "A PREPARAR"
      const [order] = currentToPrepare.splice(orderIndex, 1);
      // Atualiza o status do pedido
      order.status = 'EM PREPARO';
      // Ativa a animação de atualização por 700ms
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      // Salva as mudanças nas listas (reatividade do Signal)
      this.toPrepare.set([...currentToPrepare]);
      this.inProgress.set([...currentInProgress, order]);
      // Persistir no backend
      const backendId = (order.orderId && order.orderId > 0) ? order.orderId : order.id;
      // marca início do preparo localmente e persiste status
      this.setPrepStart(backendId);
      this.updateOrderStatus(backendId, 'EM PREPARO');
      return;  // Sai do método (pedido já foi movido)
    }

    // ========== ETAPA 2: De "EM PREPARO" para "PRONTO" ==========
    orderIndex = currentInProgress.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      // Remove o pedido da lista "EM PREPARO"
      const [order] = currentInProgress.splice(orderIndex, 1);
      // Atualiza o status do pedido
      order.status = 'PRONTO';
      // Ativa a animação de atualização por 700ms
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      // Salva as mudanças nas listas
      this.inProgress.set([...currentInProgress]);
      this.ready.set([...currentReady, order]);
      const backendId = (order.orderId && order.orderId > 0) ? order.orderId : order.id;
      // finaliza preparo localmente e persiste status
      this.finalizePrep(backendId);
      this.updateOrderStatus(backendId, 'PRONTO');
      return;  // Sai do método
    }

    // ========== ETAPA 3: De "PRONTO" para "ENTREGUE" ==========
    orderIndex = currentReady.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      // Remove o pedido da lista "PRONTO"
      const [order] = currentReady.splice(orderIndex, 1);
      // Atualiza o status do pedido
      order.status = 'ENTREGUE';
      // Ativa a animação de atualização por 700ms
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      // Salva as mudanças nas listas
      this.ready.set([...currentReady]);
      this.delivered.set([...currentDelivered, order]);
      const backendId = (order.orderId && order.orderId > 0) ? order.orderId : order.id;
      // finaliza preparo localmente e persiste status
      this.finalizePrep(backendId);
      this.updateOrderStatus(backendId, 'ENTREGUE');
      return;  // Sai do método
    }
  }

  // Converte label da UI para status esperado pelo backend
  private labelToBackendStatus(label: Order['status']): string {
    switch (label) {
      case 'A PREPARAR': return 'RECEIVED';
      case 'EM PREPARO': return 'IN_PREPARATION';
      case 'PRONTO': return 'READY';
      case 'ENTREGUE': return 'DELIVERED';
      default: return label as string;
    }
  }

  // Atualiza status do pedido no backend via OrderService e recarrega em caso de erro
  updateOrderStatus(id: number | string, newLabelStatus: Order['status']): void {
    const backendStatus = this.labelToBackendStatus(newLabelStatus);
    this.orderService.updateStatus(id, backendStatus).subscribe({
      next: () => {
        // Sucesso — nada extra a fazer (UI já atualizada localmente)
      },
      error: (err) => {
        console.error('Falha ao atualizar status do pedido:', err);
        // Recarrega listas do backend para manter consistência
        this.loadOrders();
      }
    });
  }

  // Retorna mensagem 'Finalizado em X minutos' para pedidos entregues
  getDeliveredMessage(order: Order): string {
    if (order.deliveredAt) {
      const start = order.receivedAt || order.timestamp;
      const end = order.deliveredAt;
      const mins = Math.round((end.getTime() - start.getTime()) / 60000);
      if (!isNaN(mins) && mins >= 0) {
        return `Finalizado em ${mins} minuto${mins !== 1 ? 's' : ''}`;
      }
    }
    // fallback: se não temos deliveredAt, mostra tempo desde criação
    return this.getTimeElapsed(order.timestamp);
  }

  // --- Preparação: persistência local do início/final do preparo (localStorage)
  private prepStartKey(orderId: number | string) { return `prepStart_${orderId}`; }
  private prepDurationKey(orderId: number | string) { return `prepDuration_${orderId}`; }

  // Registra o início do preparo para este pedido (se ainda não registrado)
  private setPrepStart(orderId: number | string) {
    try {
      const k = this.prepStartKey(orderId);
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, new Date().toISOString());
      }
    } catch (e) { /* localStorage pode falhar em ambientes restritos */ }
  }

  // Finaliza o preparo: calcula duração em minutos e armazena em localStorage
  private finalizePrep(orderId: number | string) {
    try {
      const start = localStorage.getItem(this.prepStartKey(orderId));
      if (!start) return;
      const startMs = new Date(start).getTime();
      const mins = Math.round((Date.now() - startMs) / 60000);
      localStorage.setItem(this.prepDurationKey(orderId), String(mins));
    } catch (e) { /* ignore */ }
  }

  // Retorna minutos de preparo: se existir duração final armazenada, retorna ela;
  // senão, se existir start, calcula minutos até agora; caso contrário retorna null.
  getPrepMinutes(order: Order): number | null {
    try {
      const id = order.orderId ?? order.id;
      const dur = localStorage.getItem(this.prepDurationKey(id));
      if (dur !== null) return Number(dur);
      const start = localStorage.getItem(this.prepStartKey(id));
      if (start) {
        const mins = Math.round((Date.now() - new Date(start).getTime()) / 60000);
        return mins;
      }
    } catch (e) { /* ignore */ }
    return null;
  }
}