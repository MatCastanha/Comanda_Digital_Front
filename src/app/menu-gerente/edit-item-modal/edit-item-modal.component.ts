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
    
    // Prepara objeto de saída; anexa File se foi selecionado para permitir upload via FormData
    const out: any = { ...this.editForm };
    if ((this.editForm as any).file) {
      out.file = (this.editForm as any).file;
    }
    // Emite o item atualizado para o componente pai
    this.itemUpdated.emit(out as MenuItem);
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

