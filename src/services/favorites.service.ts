import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private apiBase = 'http://localhost:8080/dishes';
  private items: any[] = [];
  private subj = new BehaviorSubject<any[]>([]);
  changed$ = this.subj.asObservable();

  constructor(private http: HttpClient) {
    // Inicializa consultando o backend para popular favoritos
    this.fetchFavorites().subscribe({ next: () => {}, error: () => { this.items = []; this.subj.next([]); } });
  }

  // Busca favoritos no backend: GET /dishes/favorites
  fetchFavorites(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/favorites`).pipe(
      map(list => {
        this.items = Array.isArray(list) ? list.slice() : [];
        this.subj.next(this.items.slice());
        return this.items;
      })
    );
  }

  list() {
    return this.items.slice();
  }

  isFavorite(id: any): boolean {
    if (id === undefined || id === null) return false;
    return this.items.some(i => String(i.id) === String(id));
  }

  // Alterna favorito no backend: PATCH /dishes/{id}/favorite
  toggle(item: any): void {
    if (!item) return;
    const id = item.id !== undefined ? item.id : null;
    if (id === null) return;
    this.http.patch<any>(`${this.apiBase}/${id}/favorite`, {}).subscribe({
      next: (updated: any) => {
        // backend should return updated dish; se não, buscamos novamente
        if (updated && updated.id !== undefined) {
          const exists = this.items.findIndex(i => String(i.id) === String(updated.id));
          if (updated.favorite) {
            if (exists < 0) this.items.push(updated);
            else this.items[exists] = updated;
          } else {
            if (exists >= 0) this.items.splice(exists, 1);
          }
          this.subj.next(this.items.slice());
        } else {
          // fallback: re-fetch full favorites list
          this.fetchFavorites().subscribe();
        }
      },
      error: () => {
        // falha: refetch para garantir consistência
        this.fetchFavorites().subscribe();
      }
    });
  }
}
