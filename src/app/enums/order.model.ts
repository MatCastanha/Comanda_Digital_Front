import { OrderStatus } from './order-status.enum';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  displayNumber: string; // e.g. Pedido Nº 00146
  date: string; // formatted date string
  address: string; // rua, número, bairro
  restaurantAddress?: string;
  clientAddress?: string;
  items: OrderItem[];
  status: OrderStatus;
}
