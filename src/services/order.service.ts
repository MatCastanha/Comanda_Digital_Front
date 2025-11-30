import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderPayload } from '../interfaces/order.interface';

@Injectable({ providedIn: 'root' })
export class OrderService {
  // Ajuste a baseUrl se necessário (usar host do backend em dev)
  private baseUrl = 'http://localhost:8080/orders';

  constructor(private http: HttpClient) {}

  create(order: OrderPayload): Observable<any> {
    return this.http.post(this.baseUrl, order);
  }

  // Buscar todos os pedidos
  findAll(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  // Buscar um pedido por id
  findById(id: number | string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  // Buscar por status
  findByStatus(status: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/${status}`);
  }

  // Adiciona/atualiza um item no rascunho (carrinho)
  addItem(orderId: number | string, item: { quantity: number; price: number; dishId: number | string } ): Observable<any> {
    // O controller espera OrderItemInputDTO no body
    const body = {
      quantity: item.quantity,
      price: item.price,
      dishId: item.dishId
    };
    return this.http.post(`${this.baseUrl}/${orderId}/items`, body);
  }

  // Remove ou diminui um item (PATCH)
  removeItem(orderId: number | string, item: { quantity: number; dishId: number | string } ): Observable<any> {
    const body = {
      quantity: item.quantity,
      dishId: item.dishId
    };
    return this.http.patch(`${this.baseUrl}/${orderId}/items/remove`, body);
  }

  // Finaliza o pedido (POST /{orderId}/finalize)
  finalize(orderId: number | string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${orderId}/finalize`, null);
  }

  // Atualiza status via PATCH /{id}/status?status=...
  updateStatus(id: number | string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, null, { params: { status } });
  }

  // Avançar/Voltar etapa
  nextStep(id: number | string): Observable<any> { return this.http.post(`${this.baseUrl}/${id}/next`, null); }
  previousStep(id: number | string): Observable<any> { return this.http.post(`${this.baseUrl}/${id}/previous`, null); }
}
