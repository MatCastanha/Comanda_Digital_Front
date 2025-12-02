// Modal para editar um item já existente.
// Comentários no estilo "como se fosse eu falando": explico inputs, outputs e cada método.
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem } from '../overview/overview.component'; 
// Import de animações (usado para slide-in do painel)
import { trigger, state, style, transition, animate } from '@angular/animations'; 


@Component({
  selector: 'app-edit-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-item-modal.component.html',
  styleUrls: ['./edit-item-modal.component.css'],
  // Animação simples: painel entra/saida pela direita
  animations: [
    trigger('slideIn', [
      // Estado inicial (fora da tela, à direita)
      state('void', style({ transform: 'translateX(100%)' })),
      // Transição de entrada (vem da direita para 0)
      transition('void => *', [
        animate('300ms ease-out')
      ]),
      // Transição de saída (vai para fora da tela)
      transition('* => void', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class EditItemModalComponent implements OnInit {
  // Input: o item que o pai quer editar — é preenchido antes do ngOnInit
  @Input() item!: MenuItem; // O item que vem do OverviewComponent
  // Outputs: eventos para fechar e enviar o item atualizado
  @Output() close = new EventEmitter<void>();
  @Output() itemUpdated = new EventEmitter<MenuItem>(); 

  // editForm: cópia parcial do MenuItem usada pelo formulário do modal
  editForm: Partial<MenuItem> = {};

  // Ao iniciar, clono os dados do item para editForm — assim não altero o objeto original até o submit
  ngOnInit(): void {
    this.editForm = { ...this.item };
    // Se o preço vindo for número, formatamos para exibição (ex.: 9 -> 'R$ 9,00')
    const p = (this.editForm as any).preco;
    if (p !== undefined && p !== null && typeof p === 'number') {
      const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(p);
      (this.editForm as any).preco = `R$ ${formatted}`;
    }
  }
  
  // Fecha o modal sem salvar (emite para o pai)
  onCancel(): void {
    this.close.emit();
  }

  // Valida e emite o item atualizado
  onSubmit(): void {
    if (!this.editForm.nome || !this.editForm.preco || !this.editForm.categoria) {
        alert('Preencha os campos obrigatórios.');
        return;
    }

    // Normaliza preço: aceita string formatada ('R$ 9,00'|'9.000'|'9000') ou number
    const rawPrice = (this.editForm as any).preco;
    let priceNum = 0;
    if (typeof rawPrice === 'number') {
      priceNum = rawPrice;
    } else if (typeof rawPrice === 'string') {
      let s = rawPrice.replace(/R\$/gi, '').replace(/\s/g, '');
      s = s.replace(/\./g, '').replace(/,/g, '.');
      s = s.replace(/[^0-9.\-]/g, '');
      priceNum = parseFloat(s) || 0;
    }

    if (priceNum <= 0) { alert('Preço deve ser maior que 0'); return; }

    // Prepara objeto de saída com preco numérico
    const out: any = { ...this.editForm };
    out.preco = priceNum;
    if ((this.editForm as any).file) {
      out.file = (this.editForm as any).file;
    }
    this.itemUpdated.emit(out as MenuItem);
  }

  // Handler: enquanto digita, permitimos apenas números, ponto e vírgula/comma
  onPriceInput(event: any): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/[^0-9\.,]/g, '');
    const hasDec = /[\.,].*$/.test(v);
    if (!hasDec) {
      v = v.replace(/^0+(\d)/, '$1');
      const digits = v.replace(/\./g, '').replace(/,/g, '');
      if (digits.length === 0) { (this.editForm as any).preco = ''; return; }
      const num = parseInt(digits, 10);
      const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      (this.editForm as any).preco = formatted;
    } else {
      v = v.replace(/\./g, '').replace(/\s/g, '');
      v = v.replace(/\./g, ',');
      (this.editForm as any).preco = v;
    }
  }

  // Formata o preço para 'R$ X.xxx,yy' no blur
  formatPrice(): void {
    const raw = ((this.editForm as any).preco || '').toString().replace(/\s/g, '');
    if (!raw) return;
    let normalized = raw.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(normalized);
    if (isNaN(num) || num <= 0) { (this.editForm as any).preco = ''; return; }
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    (this.editForm as any).preco = `R$ ${formatted}`;
  }

  // Quando o usuário seleciona um arquivo local, leio como Base64 e atualizo editForm.foto
  // Observação: aqui não faço upload para servidor — só pré-visualizo via Base64
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // Atualiza a pré-visualização (editForm.UrlImage) com o Base64 da imagem
        this.editForm.UrlImage = reader.result as string;
      };
      reader.readAsDataURL(file);
      // Guarda referência do File para envio posterior (permitir substituição da imagem existente)
      (this.editForm as any).file = file;
    }
  }
}

