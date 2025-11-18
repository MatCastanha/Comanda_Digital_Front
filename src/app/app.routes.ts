import { Routes } from '@angular/router';

export const routes: Routes = [
  // Rota 1: Tela do Gerente (Cardápio)
  { 
    path: 'gerente', 
    // Carregamento assíncrono
    loadComponent: () => import('./menu-gerente/overview/overview.component').then(m => m.OverviewComponent),
    title: 'Gerente | Cardápio' 
  },
  
  // Rota 2: Tela da Cozinha (Painel Kanban)
  { 
    path: 'cozinha', 
    // CORREÇÃO: Caminho do arquivo PainelComponent
    loadComponent: () => import('./modulo-cozinha/painel/painel.component').then(m => m.PainelComponent),
    title: 'Cozinha | Pedidos' 
  },
  
  // Rotas Flutuantes (Assíncronas)
  { 
    path: 'motoboy', 
    loadComponent: () => import('./modulo-cozinha/painel/painel.component').then(m => m.PainelComponent), 
    title: 'Motoboy | Rota' 
  },
  { 
    path: 'cliente', 
    loadComponent: () => import('./menu-gerente/overview/overview.component').then(m => m.OverviewComponent), 
    title: 'Cliente | Pedido' 
  },

  // Rota Padrão: Redireciona para o Gerente
  { 
    path: '', 
    redirectTo: 'gerente', 
    pathMatch: 'full' 
  },
  
  // Rota Curinga
  { 
    path: '**', 
    redirectTo: 'gerente' 
  },
];