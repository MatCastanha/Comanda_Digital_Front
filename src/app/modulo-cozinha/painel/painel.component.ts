import { Component, OnInit, OnDestroy, signal } from '@angular/core';
// Importações de Módulos Comuns Standalone
import { NgIf, NgFor, NgClass, DatePipe } from '@angular/common'; 
// Importações Corretas do CDK Drag & Drop (Standalone Components)
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop'; 


// --- TIPAGEM (Mantida Simples) ---
interface OrderItem {
  name: string;
  qty: number;
}
export interface Order { 
  id: string; 
  orderId: number; 
  table: string;
  status: 'A PREPARAR' | 'EM PREPARO' | 'PRONTO' | 'ENTREGUE';
  items: OrderItem[];
  timestamp: Date;
  // sinaliza uma animação visual breve quando o status mudar
  justUpdated?: boolean;
}

// --- VARIÁVEIS GLOBAIS (Assumidas pelo Ambiente, para não dar erro) ---
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

  // SINAL DA DATA E HORA ATUAL - Atualiza a cada segundo
  currentDateTime = signal<Date>(new Date());
  private updateIntervalId: any;

  // Dados do Kanban (Exemplos para o design)
  toPrepare = signal<Order[]>([
    { id: '1', orderId: 100, table: '', status: 'A PREPARAR', items: [{name: 'Pizza Margherita', qty: 1}, {name: 'Batata Frita', qty: 1}], timestamp: new Date(Date.now() - 5 * 60 * 1000) },
    { id: '2', orderId: 101, table: '', status: 'A PREPARAR', items: [{name: 'Refrigerante 600ml', qty: 2}, {name: 'Pizza Pepperoni', qty: 1}], timestamp: new Date(Date.now() - 3 * 60 * 1000) }
  ]);
  inProgress = signal<Order[]>([
    { id: '3', orderId: 98, table: '', status: 'EM PREPARO', items: [{name: 'Pizza Quatro Queijos', qty: 1}], timestamp: new Date(Date.now() - 9 * 60 * 1000) }
  ]);
  ready = signal<Order[]>([
    { id: '4', orderId: 97, table: '', status: 'PRONTO', items: [{name: 'Pizza Chocolate', qty: 1}], timestamp: new Date(Date.now() - 15 * 60 * 1000) }
  ]);
  delivered = signal<Order[]>([
    { id: '5', orderId: 96, table: '', status: 'ENTREGUE', items: [{name: 'Refrigerante 2L', qty: 1}], timestamp: new Date(Date.now() - 20 * 60 * 1000) }
  ]);

  constructor() {}
  
  // Fonte da logo (usa /assets/logo.png por padrão; fallback para /favicon.ico)
  logoSrc = '/assets/logo.png';

  // Query de busca (signal)
  searchQuery = signal('');
  
  ngOnInit() { 
    // Inicia a atualização de data/hora a cada segundo
    this.updateIntervalId = setInterval(() => {
      this.currentDateTime.set(new Date());
    }, 1000);
  }

  ngOnDestroy() {
    // Limpar o intervalo ao destruir o componente
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
    }
  }

  listenForOrders() { 
    console.log('Atualizando pedidos...'); 
  }

  onLogoError() {
    // fallback quando /assets/logo.png não existir
    if (this.logoSrc !== '/favicon.ico') {
      this.logoSrc = '/favicon.ico';
    }
  }

  // Filtra uma lista de pedidos com base na searchQuery (número, mesa ou item)
  filterOrders(list: Order[]): Order[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(o => {
      if (o.orderId.toString().includes(q)) return true;
      if (o.table && o.table.toLowerCase().includes(q)) return true;
      if (o.items && o.items.some(i => i.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }

  /**
   * Calcula o tempo decorrido entre o timestamp do pedido e a hora atual
   * Retorna uma string formatada (ex: "há 5 minutos", "há 2 horas")
   */
  getTimeElapsed(timestamp: Date): string {
    const now = this.currentDateTime();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'há alguns segundos';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    }
  }
  // CORREÇÃO CRÍTICA NGTSC(2345): Tipagem correta do evento CdkDragDrop
  drop(event: CdkDragDrop<Order[]>) { 
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // Lógica de atualização de status (mínima)
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

    // Comente a linha abaixo se o Firebase não estiver configurado:
    // this.updateOrderStatus(movedOrder.id, newStatus); 
    // sinalizar atualização visual
    movedOrder.justUpdated = true;
    setTimeout(() => movedOrder.justUpdated = false, 700);
  }

  // Cores baseadas no Figma (para a barra lateral do card)
  getStatusColor(status: Order['status']): string {
    switch (status) {
        case 'A PREPARAR': return 'border-red-500';
        case 'EM PREPARO': return 'border-orange-500';
        case 'PRONTO': return 'border-green-500';
        case 'ENTREGUE': return 'border-blue-500';
        default: return '';
    }
  }

  /**
   * Move um pedido para o próximo status por clique em botão de ação
   * A PREPARAR → EM PREPARO → PRONTO → ENTREGUE
   */
  moveOrderToNextStatus(orderId: number): void {
    const currentToPrepare = this.toPrepare();
    const currentInProgress = this.inProgress();
    const currentReady = this.ready();
    const currentDelivered = this.delivered();

    // Procura o pedido em cada lista e o move para a próxima
    let orderIndex = currentToPrepare.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      const [order] = currentToPrepare.splice(orderIndex, 1);
      order.status = 'EM PREPARO';
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      this.toPrepare.set([...currentToPrepare]);
      this.inProgress.set([...currentInProgress, order]);
      return;
    }

    orderIndex = currentInProgress.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      const [order] = currentInProgress.splice(orderIndex, 1);
      order.status = 'PRONTO';
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      this.inProgress.set([...currentInProgress]);
      this.ready.set([...currentReady, order]);
      return;
    }

    orderIndex = currentReady.findIndex(o => o.orderId === orderId);
    if (orderIndex !== -1) {
      const [order] = currentReady.splice(orderIndex, 1);
      order.status = 'ENTREGUE';
      order.justUpdated = true;
      setTimeout(() => order.justUpdated = false, 700);
      this.ready.set([...currentReady]);
      this.delivered.set([...currentDelivered, order]);
      return;
    }
  }
}