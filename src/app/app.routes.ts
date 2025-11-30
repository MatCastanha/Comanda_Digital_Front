import { Routes } from '@angular/router';

export const routes: Routes = [
  // Rota 1: Tela do Gerente (Cardápio)
  { 
    path: 'gerente', 
    // Carregamento assíncrono
    loadComponent: () => import('./menu-gerente/overview/overview.component').then(m => m.OverviewComponent),
    title: 'Gerente | Cardápio' 
  },
	// Rota detalhe do item
	{
	  path: 'item-detalhe/:id',
	  loadComponent: () => import('./tela-cliente/item-detalhe/item-detalhe.component').then(m => m.ItemDetalheComponent),
	  title: 'Detalhe do Item'
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
		// Rota do cliente: agora carrega o novo HomeComponent como tela inicial.
		loadComponent: () => import('./tela-cliente/home/home.component').then(m => m.HomeComponent),
		title: 'Cliente | Início' 
	},

	// Rota do carrinho do cliente
	{
		path: 'cliente/carrinho',
		loadComponent: () => import('./tela-cliente/carrinho/carrinho.component').then(m => m.CarrinhoComponent),
		title: 'Carrinho'
	},



	// Rota de busca (tela móvel)
	{
		path: 'cliente/busca',
		loadComponent: () => import('./tela-cliente/busca/busca.component').then(m => m.BuscaComponent),
		title: 'Buscar'
	},

	// Histórico / Favoritos (usar histórico como placeholder)
	{
		path: 'cliente/historico',
		loadComponent: () => import('./tela-cliente/historico/historico.component').then(m => m.HistoricoComponent),
		title: 'Histórico'
	},

	// Tela de confirmação / feedback do pedido
	{
		path: 'cliente/pedido/aprovado',
		loadComponent: () => import('./tela-cliente/pedido-aprovado/pedido-aprovado.component').then(m => m.PedidoAprovadoComponent),
		title: 'Pedido Aprovado'
	},

	// Perfil do cliente (formulário)
	{
		path: 'cliente/perfil',
		loadComponent: () => import('./tela-cliente/cliente-perfil/cliente-perfil.component').then(m => m.ClientePerfilComponent),
		title: 'Perfil'
	},

	// Rota Padrão: 
	{
		path: '',
		redirectTo: 'gerente',
		pathMatch: 'full'
	},

	// Rota Curinga -> Cliente
	{
		path: '**',
		redirectTo: 'gerente'
	},
];