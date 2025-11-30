import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router'; // IMPORT NECESSÁRIO!
import { ToastComponent } from './shared/toast/toast.component';

// Você não precisa mais importar o OverviewComponent aqui se estiver usando rotas.
// Se OverviewComponent for a rota principal, ela será carregada pelo RouterOutlet.

@Component({
  selector: 'app-root',
  standalone: true,
  // O RouterOutlet deve ser importado para ser reconhecido
  // O CommonModule não é estritamente necessário se você não usar NgIf, NgFor, etc. no app.component.html
  imports: [
    CommonModule,
    RouterOutlet, // ADICIONADO: Essencial para <router-outlet>
    ToastComponent
  ], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Sistema de Gerenciamento';
}

