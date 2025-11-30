import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, timer } from 'rxjs';
import { CarrinhoService } from '../../../services/carrinho.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnDestroy {
  visible = false;
  message = '';
  private sub: Subscription | null = null;

  constructor(private carrinho: CarrinhoService) {
    this.sub = this.carrinho.itemAdded$.subscribe(item => {
      this.show(`${item.nome || item.name || 'Item'} adicionado ao carrinho`);
    });
  }

  show(msg: string) {
    this.message = msg;
    this.visible = true;
    // esconde depois de 2.5s
    timer(2500).subscribe(() => this.visible = false);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
