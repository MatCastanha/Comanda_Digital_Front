import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-pedido-aprovado',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pedido-aprovado.component.html',
  styleUrls: ['./pedido-aprovado.component.css']
})
export class PedidoAprovadoComponent {
  order: any = null;
  displayAddressLabel: string = 'Casa';
  displayTotal: string = 'R$0,00';

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.order = nav && nav.extras && (nav.extras as any).state ? (nav.extras as any).state.order : null;
    // Processa order recebido para extrair complemento e total formatado
    if (this.order) {
      try {
        // Extrai cliente/address complement (vários aliases possíveis)
        const client = (this.order as any).client || (this.order as any).clientDTO || null;
        let saveAs = '';
        if (client) {
          saveAs = client.salvarComo || client.saveAs || client.alias || client.complement || client.complemento || '';
        }
        // Se não encontrou no client, tenta no address aninhado
        if (!saveAs && this.order.address) {
          const a = this.order.address;
          saveAs = a.complement || a.alias || a.saveAs || a.salvarComo || '';
        }
        this.displayAddressLabel = saveAs && String(saveAs).trim().length > 0 ? String(saveAs) : 'Casa';

        // Extrai total: backend pode retornar 'total', 'price', 'amount' ou calcular via items
        const possibleTotals = [(this.order as any).total, (this.order as any).price, (this.order as any).amount, (this.order as any).valor];
        let totalNum: number | null = null;
        for (const t of possibleTotals) {
          if (t !== undefined && t !== null && !isNaN(Number(t))) { totalNum = Number(t); break; }
        }
        // Se não veio total, calcule pelos items
        if (totalNum === null) {
          const items = (this.order as any).items || [];
          let acc = 0;
          for (const it of items) {
            const p = it.price ?? it.unitPrice ?? it.preco ?? it.valor ?? 0;
            const q = it.quantity ?? it.qty ?? it.quantidade ?? 1;
            const pn = Number(p) || 0;
            const qn = Number(q) || 0;
            acc += pn * qn;
          }
          totalNum = acc;
        }
        this.displayTotal = this.formatCurrency(totalNum || 0);
      } catch (e) {
        console.warn('Erro ao processar order em PedidoAprovado:', e);
      }
    }
  }

  rastrear() {
    this.router.navigate(['/cliente/rastreio'], { state: { order: this.order } });
  }

  fechar() {
    this.router.navigate(['/cliente']);
  }

  private formatCurrency(n: number): string {
    try {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch (e) {
      // Fallback simples
      return 'R$ ' + (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
    }
  }
}
