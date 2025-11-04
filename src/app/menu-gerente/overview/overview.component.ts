// Caminho: src/app/menu-gerente/overview/overview.component.ts (versão final e completa)

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AddItemModalComponent } from '../add-item-modal/add-item-modal.component';
import { RemovePopupComponent } from '../remove-popup/remove-popup.component';
import { EditItemModalComponent } from '../edit-item-modal/edit-item-modal.component'; 

export interface MenuItem {
  id: number;
  foto?: string;
  nome: string;
  preco: string;
  categoria: string;
  tag?: string;
  descricao?: string;
}

@Component({
  selector: 'app-overview',
  standalone: true, 
  imports: [
    CommonModule, 
    FormsModule, 
    AddItemModalComponent, 
    RemovePopupComponent,
    EditItemModalComponent
  ],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  
  menuItems: MenuItem[] = [
    { id: 1, foto: 'pizza_sq.jpg', nome: 'Pizza Mussarela', preco: 'R$ 49,90', categoria: 'Pizza', tag: 'Mussarela', descricao: 'Descrição da Pizza Mussarela.' },
    { id: 2, foto: 'pizza_sq.jpg', nome: 'Pizza Pepperoni', preco: 'R$ 49,90', categoria: 'Pizza', tag: 'Pepperoni', descricao: 'Descrição da Pizza Pepperoni.' },
    { id: 3, foto: 'coca_sq.jpg', nome: 'Coca', preco: 'R$ 8,00', categoria: 'Bebida', tag: 'Coca', descricao: 'Bebida refrescante de 350ml.' },
    { id: 4, foto: 'chocolate_sq.jpg', nome: 'Pizza Chocolate', preco: 'R$ 56,00', categoria: 'Doce', tag: 'Chocolate', descricao: 'Pizza doce com chocolate e frutas.' },
  ];

  filteredItems: MenuItem[] = [...this.menuItems];
  searchTerm: string = '';
  
  // Controle de Modais (Propriedades que o HTML precisa)
  isAddItemModalOpen: boolean = false;
  isEditItemModalOpen: boolean = false; 
  isRemovePopupOpen: boolean = false;
  selectedItem: MenuItem | null = null; 

  ngOnInit(): void {
    this.applyFilter();
  }

  // --- Lógica de Abertura/Fechamento ---
  openAddItemModal(): void {
    this.isAddItemModalOpen = true;
  }
  
  openEditItem(item: MenuItem): void { // <-- Função que o HTML precisa
    this.selectedItem = item; 
    this.isEditItemModalOpen = true; 
  }

  openRemoveConfirm(item: MenuItem): void {
    this.selectedItem = item;
    this.isRemovePopupOpen = true;
  }
  
  closeModal(): void {
    this.isAddItemModalOpen = false;
    this.isEditItemModalOpen = false; 
    this.isRemovePopupOpen = false;
    this.selectedItem = null;
    this.applyFilter();
  }

  // --- Lógica de CRUD ---
  
  onItemAdded(newItem: MenuItem): void {
    this.menuItems.unshift({ ...newItem, id: Date.now() });
    this.closeModal(); 
  }
  
  onItemUpdated(updatedItem: MenuItem): void { // <-- Função que o HTML precisa
    if (this.selectedItem) {
      const index = this.menuItems.findIndex(i => i.id === this.selectedItem!.id);
      if (index !== -1) {
        this.menuItems[index] = { ...this.menuItems[index], ...updatedItem };
      }
    }
    this.closeModal();
  }

  onRemoveConfirmed(): void {
    if (this.selectedItem) {
      this.menuItems = this.menuItems.filter(i => i.id !== this.selectedItem!.id);
    }
    this.closeModal();
  }
  
  // Lógica de Filtro
  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredItems = this.menuItems.filter(
      item =>
        item.nome.toLowerCase().includes(term) ||
        item.categoria.toLowerCase().includes(term)
    );
  }
}