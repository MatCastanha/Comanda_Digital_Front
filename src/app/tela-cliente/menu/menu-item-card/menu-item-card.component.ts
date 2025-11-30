import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemMenu } from '../menu.component';
import { FavoritesService } from '../../../../services/favorites.service';

@Component({
  selector: 'app-menu-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-item-card.component.html',
  styleUrls: ['./menu-item-card.component.css']
})
export class MenuItemCardComponent {
  @Input() item!: ItemMenu;
  @Output() add = new EventEmitter<ItemMenu>();
  @Output() open = new EventEmitter<ItemMenu>();
  isFav = false;

  constructor(private fav: FavoritesService) {}

  ngOnChanges() {
    this.isFav = this.fav.isFavorite(this.item?.id);
  }

  onAdd() {
    this.add.emit(this.item);
  }

  onToggleFav(ev?: Event) {
    if (ev) ev.stopPropagation();
    this.fav.toggle(this.item);
    this.isFav = this.fav.isFavorite(this.item?.id);
  }

  onOpen() {
    this.open.emit(this.item);
  }
}
