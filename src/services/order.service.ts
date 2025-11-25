import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderPayload } from '../interfaces/order.interface';

@Injectable({ providedIn: 'root' })
export class OrderService {
  // Ajuste a baseUrl se necessário
  private baseUrl = '/orders';

  constructor(private http: HttpClient) {}

  create(order: OrderPayload): Observable<any> {
    return this.http.post(this.baseUrl, order);
  }
}
