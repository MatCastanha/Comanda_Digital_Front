import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private storageKey = 'app:favorites';
  private items: any[] = [];
  private subj = new BehaviorSubject<any[]>([]);
  changed$ = this.subj.asObservable();

  constructor() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      this.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      this.items = [];
    }
    this.subj.next(this.items.slice());
  }

  list() {
    return this.items.slice();
  }

  isFavorite(id: any): boolean {
    if (id === undefined || id === null) return false;
    return this.items.some(i => String(i.id) === String(id));
  }

  toggle(item: any) {
    if (!item) return;
    const id = item.id !== undefined ? item.id : null;
    if (id === null) return;
    const exists = this.items.findIndex(i => String(i.id) === String(id));
    if (exists >= 0) {
      this.items.splice(exists, 1);
    } else {
      this.items.push(item);
    }
    this.save();
    this.subj.next(this.items.slice());
  }

  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (e) {
      // ignore
    }
  }
}
