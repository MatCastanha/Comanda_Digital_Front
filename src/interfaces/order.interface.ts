export interface OrderItemPayload {
  quantity: number;
  price: number;
  dish: { id: number | string };
}

export interface OrderPayload {
  moment: string; // ISO
  status: string; // e.g. 'PENDING'
  client?: { id: number | string };
  items: OrderItemPayload[];
}
