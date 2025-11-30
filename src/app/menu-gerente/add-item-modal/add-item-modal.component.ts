// Componente de modal para adicionar um item ao cardápio.
// Comentários escritos no mesmo tom que você pediu: explicando o que cada bloco faz, sem alterar a lógica.
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; 
import { trigger, transition, style, animate } from '@angular/animations';
import { MenuItem } from '../overview/overview.component'; // Importa a interface do item do cardápio

@Component({
  selector: 'app-add-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './add-item-modal.component.html',
  styleUrls: ['./add-item-modal.component.css']
  ,
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(20px)', opacity: 0 }),
        animate('220ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ transform: 'translateX(20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class AddItemModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() itemAdded = new EventEmitter<MenuItem>();

  
  // Modelo de formulário (usando FormsModule simples para agilidade)
  newItem: Partial<MenuItem> = {
    nome: '',
    preco: '',
    categoria: 'Pizza',
    descricao: '',
    UrlImage: ''
 
 
  };
  // --------------------------------------------------
  // Método: onFileSelected
  // - Quando o usuário escolhe um arquivo, aqui eu pego o primeiro arquivo
  // - Atualizo o campo `newItem.foto` com um texto simples (aqui o código original usava apenas o nome do arquivo)
  // - Não faço upload real, apenas guardo a referência/nome para exibição
  // --------------------------------------------------
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      // Guarda o arquivo selecionado para envio direto (evita depender somente do dataURL)
      (this.newItem as any).file = file;
      // Lê o arquivo como Base64 (DataURL) para pré-visualização e envio
      const reader = new FileReader();
      reader.onload = () => {
        this.newItem.UrlImage = reader.result as string; // base64/data:url
      };
      reader.readAsDataURL(file);

      // arquivo selecionado (pré-visualização carregada)
    }

  }

  // Handler: enquanto digita, permitimos apenas números, ponto e vírgula/comma
  onPriceInput(event: any): void {
    const input = event.target as HTMLInputElement;
    // remove tudo que não seja dígito, ponto ou vírgula
    let v = input.value.replace(/[^0-9\.,]/g, '');
    // se o usuário está digitando apenas dígitos, vamos formatar com separador de milhares
    // mas sem prefixo ainda — faremos prefixo no blur para evitar problemas de caret
    // detecta se há parte decimal
    const hasDec = /[\.,].*$/.test(v);
    if (!hasDec) {
      // remove zeros à esquerda
      v = v.replace(/^0+(\d)/, '$1');
      // formata milhares: transforma '4450' em '4.450'
      const digits = v.replace(/\./g, '').replace(/,/g, '');
      if (digits.length === 0) {
        this.newItem.preco = '';
        return;
      }
      const num = parseInt(digits, 10);
      const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      this.newItem.preco = formatted;
    } else {
      // mantém decimal como o usuário digitou, apenas normaliza separador para vírgula
      v = v.replace(/\./g, '').replace(/\s/g, '');
      // replace first dot with comma if multiple
      v = v.replace(/\./g, ',');
      this.newItem.preco = v;
    }
  }

  // Formata o preço para 'R$ X.xxx,yy' no blur
  formatPrice(): void {
    const raw = (this.newItem.preco || '').toString().replace(/\s/g, '');
    if (!raw) return;

    // Normaliza: aceita tanto '4.450' quanto '4450' e também '12,34' ou '12.34'
    let normalized = raw.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(normalized);
    if (isNaN(num) || num <= 0) {
      this.newItem.preco = '';
      return;
    }

    // Formata em pt-BR com símbolo R$
    const formatted = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    this.newItem.preco = `R$ ${formatted}`;
  }

  // Fecha o modal sem enviar nada (emit para o componente pai)
  onCancel(): void {
    this.close.emit();
  }

  // Envia o novo item para o componente pai
  // Mantive a validação mínima que já existia (nome, preço e categoria obrigatórios)
  onSubmit(): void {
    // Validação mínima
    // Normaliza e valida preço (garante number e não-negativo)
    if (!this.newItem.nome || this.newItem.categoria == null) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    // Converte string -> number se necessário
    const rawPrice = (this.newItem as any).preco;
    let priceNum = 0;
    if (typeof rawPrice === 'number') {
      priceNum = rawPrice;
    } else if (typeof rawPrice === 'string') {
      // Remove prefix 'R$', espaços, e normaliza separadores
      let s = rawPrice.replace(/R\$/gi, '').replace(/\s/g, '');
      // remove pontos de milhar, converte vírgula decimal para ponto
      s = s.replace(/\./g, '').replace(/,/g, '.');
      // garante que só reste números e ponto
      s = s.replace(/[^0-9.\-]/g, '');
      priceNum = parseFloat(s) || 0;
    }

    if (priceNum <= 0) {
      alert('Preço deve ser maior que 0');
      return;
    }

    // Não sobrescreve o modelo exibido (para não perder a formatação no campo).
    // Emitimos uma cópia com `preco` numérico para o serviço aceitar tanto string quanto number.
    const emitItem: MenuItem = {
      id: (this.newItem.id as any) || 0,
      UrlImage: this.newItem.UrlImage || '',
      nome: this.newItem.nome as string,
      preco: priceNum as any,
      categoria: this.newItem.categoria as string,
      tag: this.newItem.tag,
      descricao: this.newItem.descricao,
    };

    // Anexa o arquivo selecionado, se houver, para que o serviço envie FormData
    const file = (this.newItem as any).file;
    if (file) {
      (emitItem as any).file = file;
    }

    // Emitindo item para o componente pai
    this.itemAdded.emit(emitItem as MenuItem);
  }

}

