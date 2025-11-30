// Popup simples para confirmar remoção de um item do cardápio.
// Comentários: explico o propósito das propriedades e métodos.
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-remove-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './remove-popup.component.html',
  styleUrls: ['./remove-popup.component.css']
})
export class RemovePopupComponent {
  // Nome do item exibido na pergunta de confirmação (ex: "Pizza Doce")
  @Input() itemName: string = 'este item';
  // Eventos para o componente pai: fechar sem remover ou confirmar remoção
  @Output() close = new EventEmitter<void>();
  @Output() confirmRemove = new EventEmitter<void>();

  // Usuário confirmou a remoção -> emite para o componente pai realizar o delete
  onConfirm(): void {
    this.confirmRemove.emit();
  }

  // Usuário cancelou -> apenas fecha o popup
  onCancel(): void {
    this.close.emit();
  }
}
