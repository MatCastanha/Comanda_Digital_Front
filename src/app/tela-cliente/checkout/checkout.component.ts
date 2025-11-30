import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarrinhoService } from '../../../services/carrinho.service';
import { ClientService } from '../../../services/client.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  endereco = 'Rua sei lá faltou ideia';
  pagamento = 'Pagamento na entrega';
  valorSubtotal = 0;
  shipping = 10; // R$ 10,00

  constructor(private carrinho: CarrinhoService, private router: Router, private clientService: ClientService) {}

  ngOnInit(): void {
    // ngOnInit inicializado
    this.recalc();
    // opcional: ouvir mudanças no carrinho
    this.carrinho.itemsChanged$.subscribe(() => this.recalc());
    // tenta preencher endereço com dados do cliente persistido
    this.clientService.getClient().subscribe({
      next: (c: any) => {
        if (!c) return;
        const addrObj = c.address || c.addressDTO || null;
        if (addrObj) {
          const parts: string[] = [];
          if (addrObj.logradouro) parts.push(addrObj.logradouro);
          if (addrObj.bairro) parts.push(addrObj.bairro);
          if (addrObj.localidade) parts.push(addrObj.localidade);
          if (addrObj.uf) parts.push(addrObj.uf);
          this.endereco = parts.join(', ') + (c.addressNumber ? ' / ' + c.addressNumber : '');
        } else if (c.endereco) {
          this.endereco = c.endereco + (c.addressNumber ? ' / ' + c.addressNumber : '');
        }
      },
      error: () => { /* sem cliente */ }
    });
  }

  private recalc() {
    const items = this.carrinho.listar() || [];
    this.valorSubtotal = items.reduce((acc: number, it: any) => {
      const qtd = it.quantidade || 1;
      const preco = typeof it.preco === 'number' ? it.preco : parseFloat(String(it.preco).replace(/R\$|\s|\.|,/g, m => (m === ',' ? '.' : '')) ) || 0;
      return acc + preco * qtd;
    }, 0);
  }

  voltar() {
    this.router.navigate(['/cliente/carrinho']);
  }

  finalizarPedido() {
    // aqui só demonstrativo — o backend será integrado depois
    // Finalizar pedido (demo) — sem logs de depuração
    alert('Pedido finalizado (demo)');
    this.router.navigate(['/cliente']);
  }
}
