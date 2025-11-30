import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientDTO } from '../interfaces/client.interface';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private baseUrl = 'http://localhost:8080/client';

  constructor(private http: HttpClient) {}

  // Busca o cliente do backend (se existir)
  getClient(): Observable<ClientDTO> {
    return this.http.get<ClientDTO>(this.baseUrl);
  }

  // Salva ou atualiza o cliente
  saveOrUpdate(dto: ClientDTO): Observable<ClientDTO> {
    return this.http.post<ClientDTO>(this.baseUrl, dto);
  }

  // Tenta obter endereço a partir do CEP usando o backend; se falhar, cai no ViaCEP
  getAddressByCep(cep: string): Observable<any> {
    const clean = cep.replace(/\D/g, '');
    if (!clean) throw new Error('CEP inválido');

    // Primeiro tenta rota interna no backend (endpoints fornecidos: GET /address/{cep})
    const backendUrl = `http://localhost:8080/address/${clean}`;
    return new Observable((subscriber) => {
      this.http.get(backendUrl).subscribe({
        next: (res) => subscriber.next(res),
        error: () => {
          // fallback para ViaCEP
          const viaCep = `https://viacep.com.br/ws/${clean}/json/`;
          this.http.get(viaCep).subscribe({
            next: (r) => subscriber.next(r),
            error: (e) => subscriber.error(e)
          });
        }
      });
    });
  }

  // Salva ou atualiza o endereço no backend usando o CEP (POST /address/{cep})
  saveAddressByCep(cep: string): Observable<any> {
    const clean = (cep || '').replace(/\D/g, '');
    if (!clean) throw new Error('CEP inválido');
    const backendUrl = `http://localhost:8080/address/${clean}`;
    return this.http.post(backendUrl, {});
  }
}
