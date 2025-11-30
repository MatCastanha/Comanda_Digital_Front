
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-busca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './busca.component.html',
  styleUrls: ['./busca.component.css']
})
export class BuscaComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  searchTerm = '';
  recent: string[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    const raw = localStorage.getItem('recentSearches');
    this.recent = raw ? JSON.parse(raw) : [];
  }

  ngAfterViewInit(): void {
    // Tenta focar o input para abrir teclado em mobile
    setTimeout(() => { try { this.searchInput?.nativeElement.focus(); } catch(e){} }, 50);
  }

  doSearch() {
    const term = (this.searchTerm || '').trim();
    if (!term) return;
    this.pushRecent(term);
    // Navega para home (cliente) passando state com o termo
    this.router.navigate(['/cliente'], { state: { search: term } });
  }

  selectRecent(term: string) {
    this.searchTerm = term;
    this.doSearch();
  }

  private pushRecent(term: string) {
    this.recent = [term, ...this.recent.filter(x => x !== term)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(this.recent));
  }

  goBack() { this.router.navigate(['/cliente']); }
}
