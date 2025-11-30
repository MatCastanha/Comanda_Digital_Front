import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Interface tipada para os itens do cardápio
export interface ItemMenu {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  img?: string;
  inCart?: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  template: `<div style="padding:20px;text-align:center">Redirecionando para a Home...</div>`,
  styles: [``]
})
export class MenuComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    // Este componente está obsoleto: redireciona para a Home do cliente
    this.router.navigate(['/cliente']);
  }
}

