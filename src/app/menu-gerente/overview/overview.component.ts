// Caminho: src/app/menu-gerente/overview/overview.component.ts (versão final e completa)

// ============================================================================
// IMPORTS - Importações necessárias do Angular
// ============================================================================
// Component: Decorator para criar um componente Angular
// OnInit: Interface para executar código quando o componente inicia
// CommonModule: Módulo que fornece *ngIf, *ngFor, etc.
// FormsModule: Módulo que permite usar [(ngModel)] para two-way binding
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// [NOVO] Importações para Comunicação com o Back-end
import { DishService } from '../../../services/dish.service'; // Serviço que você criou

// Componentes do menu-gerente que este componente usa
import { AddItemModalComponent } from '../add-item-modal/add-item-modal.component';
import { RemovePopupComponent } from '../remove-popup/remove-popup.component';
import { EditItemModalComponent } from '../edit-item-modal/edit-item-modal.component'; 

// ============================================================================
// INTERFACE - Define a estrutura de cada item do cardápio
// ATENÇÃO: Se o Back-end usa 'price: number' e 'name', você terá que fazer o mapeamento
// no DishService ou corrigir esta interface (o que foi solicitado a NÃO fazer).
// ============================================================================
// MenuItem define o que cada item do menu tem: id, foto, nome, preço, etc
export interface MenuItem {
  id: number;                // ID único do item (para identificar)
  UrlImage?: string;             // Caminho da foto do item
  nome: string;              // Nome do item (Pizza Mussarela, Coca, etc)
  preco: string;             // Preço formatado (R$ 49,90)
  categoria: string;         // Categoria do item (Pizza, Bebida, Doce)
  tag?: string;              // Tag adicional (Mussarela, Coca, etc)
  descricao?: string;        // Descrição do item
}

// ============================================================================
// DECORATOR @Component - Configuração do componente
// ============================================================================
@Component({
  selector: 'app-overview',
  standalone: true, 
  imports: [
    CommonModule,               // Fornece *ngIf, *ngFor, etc.
    FormsModule,                // Fornece [(ngModel)] para inputs
    AddItemModalComponent,      // Modal para adicionar novos itens
    RemovePopupComponent,       // Popup para confirmar remoção
    EditItemModalComponent      // Modal para editar itens existentes
  ],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {
  
  // [MODIFICADO] Inicializa vazio para carregar dados do Back-end
  menuItems: MenuItem[] = []; 

 filteredItems: MenuItem[] = []; // Inicializa como vazio. Será preenchido após carregar os dados.
  searchTerm: string = '';
  
  // ============================================================================
  // CONSTRUCTOR - Injeção de dependência do serviço
  // ============================================================================
  constructor(private dishService: DishService) {} // [NOVO]

  // ============================================================================
  // FILTROS - Variáveis que controlam como os itens são exibidos
  // ============================================================================
  // selectedCategory: A categoria selecionada no momento
  // Começa com 'Todas' para mostrar todos os itens sem filtro
  selectedCategory: string = 'Todas';

  // allCategories: Lista das categorias que aparecem como botões de filtro
  // Deve ser igual às categorias dos itens (Pizza, Doce, Bebida)
  allCategories: string[] = ['Todas', 'Pizza', 'Doce', 'Bebida'];

  // ============================================================================
  // MODAIS - Variáveis para controlar quais modais estão abertos ou fechados
  // ============================================================================
  // isAddItemModalOpen: true = modal de adicionar está visível, false = escondido
  isAddItemModalOpen: boolean = false;

  // isEditItemModalOpen: true = modal de editar está visível, false = escondido
  isEditItemModalOpen: boolean = false; 

  // isRemovePopupOpen: true = popup de confirmação de remoção está visível, false = escondido
  isRemovePopupOpen: boolean = false;

  // selectedItem: Armazena o item que está sendo editado ou removido
  // null = nenhum item selecionado no momento
  selectedItem: MenuItem | null = null;

  // ============================================================================
  // MÉTODO LIFECYCLE - ngOnInit executa quando o componente carrega
  // ============================================================================
  ngOnInit(): void {
    this.loadDishes(); // [MODIFICADO] Chama a função de carregamento do Back-end
  }  
  
  // ============================================================================
  // MÉTODO DE LEITURA (READ) - Carrega todos os pratos do Back-end
  // ============================================================================
  loadDishes(): void {
    this.dishService.findAll().subscribe({
        next: (dishes) => {
            // Assume-se que o serviço DishService mapeia a resposta JSON para MenuItem[]
            this.menuItems = dishes;
            
            // Opcional: Atualiza a lista de categorias dinamicamente
            const uniqueCategories = new Set(dishes.map(d => d.categoria));
            this.allCategories = ['Todas', ...Array.from(uniqueCategories)];

            this.applyCombinedFilter(); // CORRIGIDO: Filtra a lista APÓS os dados serem carregados.
        },
        error: (err) => {
            console.error('Erro ao carregar pratos do Back-end:', err);
            // Em caso de erro, a lista permanece vazia
        }
    });
  }
  // --- Lógica de Abertura/Fechamento ---

  // ============================================================================
  // MÉTODOS PARA ABRIR/FECHAR MODAIS
  // ============================================================================
  
  // openAddItemModal: Abre o modal para adicionar um novo item ao cardápio
  openAddItemModal(): void {
    this.isAddItemModalOpen = true;
  }
  
  // openEditItem: Abre o modal para editar um item existente
  // Recebe o item como parâmetro e armazena em selectedItem
  openEditItem(item: MenuItem): void { // <-- Função que o HTML precisa
    this.selectedItem = item; 
    this.isEditItemModalOpen = true; 
  }

  // openRemoveConfirm: Abre o popup para confirmar a remoção de um item
  // Armazena o item selecionado antes de pedir confirmação
  openRemoveConfirm(item: MenuItem): void {
    this.selectedItem = item;
    this.isRemovePopupOpen = true;
  }
  
  // closeModal: Fecha todos os modais e reseta as variáveis
  // Também aplica os filtros novamente para atualizar a lista após operações
  closeModal(): void {
    this.isAddItemModalOpen = false;
    this.isEditItemModalOpen = false; 
    this.isRemovePopupOpen = false;
    this.selectedItem = null;
    this.loadDishes(); // [MODIFICADO] Recarrega do Back-end para atualizar a lista
  }

  // ============================================================================
  // MÉTODO PARA FILTRO POR CATEGORIA
  // ============================================================================
  
  // applyCategoryFilter: Muda a categoria selecionada e aplica o filtro
  // Recebe a categoria (Pizza, Doce, Bebida ou Todas)
  applyCategoryFilter(category: string): void {
    // Define qual categoria está selecionada (muda visual dos botões)
    this.selectedCategory = category;

    // Aplica o filtro combinado (texto + categoria) para atualizar a lista
    this.applyCombinedFilter();
  }

  // ============================================================================
  // MÉTODOS PARA ADICIONAR, EDITAR E REMOVER ITENS (CRUD) - LÓGICA DE BACK-END
  // ============================================================================
  
  // onItemAdded: Executado quando um novo item é adicionado via modal
  // Chama o Back-end para criar o item
  onItemAdded(newItem: MenuItem): void {
    // payload recebido do modal

    // [MODIFICADO] Chamada ao Back-end (POST)
    this.dishService.create(newItem).subscribe({
        next: (createdDish) => {
            // createdDish retornado
            this.menuItems.unshift(createdDish); // Adiciona o item retornado com ID
            this.closeModal(); 
        },
        error: (e) => {
            console.error('Erro ao adicionar prato:', e);
            // Exibe mensagem amigável com detalhe do status/resposta quando disponível
            const status = e?.status || 'desconhecido';
            const body = e?.error || e?.message || JSON.stringify(e);
            alert(`Falha ao adicionar prato (status: ${status}). Resposta: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
        }
    });
  }
  
  // onItemUpdated: Executado quando um item é editado via modal
  // Encontra o item na lista e substitui suas informações
  onItemUpdated(updatedItem: MenuItem): void { // <-- Função que o HTML precisa
    if (this.selectedItem && this.selectedItem.id) {
        // [MODIFICADO] Chamada ao Back-end (PUT)
                this.dishService.update(this.selectedItem.id, updatedItem).subscribe({
                        next: (updatedDish) => {
                                const index = this.menuItems.findIndex(i => i.id === updatedDish.id);
                                if (index !== -1) {
                                        this.menuItems[index] = updatedDish;
                                }
                                // Se o objeto enviado pelo modal continha um File, envie-o separadamente
                                const fileObj = (updatedItem as any).file;
                                if (fileObj && fileObj instanceof File) {
                                    this.dishService.uploadImage(updatedDish.id, fileObj).subscribe({
                                        next: (withImage) => {
                                            const idx2 = this.menuItems.findIndex(i => i.id === withImage.id);
                                            if (idx2 !== -1) this.menuItems[idx2] = withImage;
                                            this.closeModal();
                                        },
                                        error: (e) => {
                                            console.error('Erro ao enviar imagem:', e);
                                            // Fecha o modal mesmo se falhar o upload da imagem
                                            this.closeModal();
                                        }
                                    });
                                } else {
                                    this.closeModal();
                                }
                        },
                        error: (e) => console.error('Erro ao atualizar prato:', e)
                });
    }
  }

  // onRemoveConfirmed: Executado quando o usuário confirma a remoção de um item
  // Remove o item da lista e fecha o popup
  onRemoveConfirmed(): void {
    if (this.selectedItem && this.selectedItem.id) {
        // [MODIFICADO] Chamada ao Back-end (DELETE)
        this.dishService.delete(this.selectedItem.id).subscribe({
            next: () => {
                // Remove o item da lista local após o sucesso do Back-end
                this.menuItems = this.menuItems.filter(i => i.id !== this.selectedItem!.id);
                this.closeModal();
            },
            error: (e) => console.error('Erro ao remover prato:', e)
        });
    }
  } 
  // Lógica de Filtro COMBINADA (Texto + Categoria)
  applyCombinedFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    
    let tempItems = this.menuItems;

    // A. FILTRO DE TEXTO: Aplica a busca por texto no nome/categoria
    if (term) {
      tempItems = tempItems.filter(
        item =>
          item.nome.toLowerCase().includes(term) ||
          item.categoria.toLowerCase().includes(term)
      );
    }

    // B. FILTRO DE CATEGORIA: Aplica a categoria selecionada
    if (this.selectedCategory !== 'Todas') {
      tempItems = tempItems.filter(item => 
        item.categoria === this.selectedCategory
      );
    }

    this.filteredItems = tempItems;
  }
}