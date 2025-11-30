import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators'; 
import { Dish } from '../interfaces/dish.interface'; 
import { MenuItem } from '../app/menu-gerente/overview/overview.component'; 

const API_URL = 'http://localhost:8080/dishes';

@Injectable({
  providedIn: 'root'
})
export class DishService {

  constructor(private http: HttpClient) { }

  // Converte um objeto Dish (do back-end) para um MenuItem (para o front-end)
  private mapDishToMenuItem(dish: any): MenuItem {
    // Protege contra respostas do backend incompletas (por exemplo, price undefined ou string)
    const rawPrice = typeof dish.price === 'number' ? dish.price : (dish.price ? parseFloat(dish.price) : NaN);
    const safePrice = Number.isFinite(rawPrice) ? rawPrice : 0;
    const precoStr = `R$ ${safePrice.toFixed(2).replace('.', ',')}`;

    // Resolve campo de imagem retornado pelo backend. O backend pode
    // devolver caminhos relativos (ex: "/images/xxx.png") — nesse caso
    // precisamos prefixar com o host para o front conseguir carregar.
    const backendOrigin = API_URL.replace('/dishes', '');
    const possibleImageFields = [
      (dish as any).UrlImage,
      (dish as any).urlImage,
      (dish as any).urlImagem,
      (dish as any).imageUrl,
      (dish as any).imagem,
      (dish as any).path,
      (dish as any).filePath,
    ];
    let rawImg: any = '';
    for (const f of possibleImageFields) {
      if (f && typeof f === 'string' && f.trim() !== '') {
        rawImg = f;
        break;
      }
    }

    let resolvedImg = '';
    if (typeof rawImg === 'string' && rawImg.trim() !== '') {
      const t = rawImg.trim();
      // já é URL completa
      if (/^https?:\/\//i.test(t)) {
        resolvedImg = t;
      } else {
        // caminho relativo do backend: prefixar com origin
        // remove possíveis barras duplicadas
        resolvedImg = `${backendOrigin}${t.startsWith('/') ? t : '/' + t}`;
      }
    }

    return {
      id: dish.id || 0,
      UrlImage: resolvedImg,
      nome: dish.name || dish.nome || '',
      categoria: dish.category || dish.categoria || '',
      tag: dish.tag || '',
      descricao: dish.description || dish.descricao || '',
      preco: precoStr,
    } as MenuItem;
  }
  
  // [NOVO] Converte um objeto MenuItem (do front-end) para um Dish (para o back-end)
  private mapMenuItemToDish(menuItem: MenuItem): Dish {
    // Normaliza o preço: aceita number ou string formatada ("R$ 49,90")
    let priceNum = 0;
    const raw = (menuItem as any).preco;
    if (typeof raw === 'number') {
      priceNum = raw;
    } else if (typeof raw === 'string') {
      // Remove o prefixo 'R$', espaços, e separadores de milhar (pontos),
      // então converte a vírgula decimal para ponto.
      const withoutSymbol = raw.replace('R$', '').replace(/\s/g, '');
      const withoutThousands = withoutSymbol.replace(/\./g, '');
      const normalized = withoutThousands.replace(/,/g, '.');
      const parsed = parseFloat(normalized);
      priceNum = isNaN(parsed) ? 0 : parsed;
    }

    // Envia 'urlImage' (camelCase) para combinar com a serialização comum em Java backends
    // Se a imagem for um dataURL (base64 inline), não enviamos isso no JSON.
    // Muitos backends esperam uma URL ou um upload multipart; enviar base64 aqui
    // pode causar erro 500 ou falha de validação. Enviar string vazia evita bloqueio.
    const urlImageValue = (menuItem as any).UrlImage || '';
    const urlImageToSend = typeof urlImageValue === 'string' && urlImageValue.startsWith('data:')
      ? ''
      : urlImageValue;

    const out: any = {
      id: menuItem.id,
      urlImage: urlImageToSend,
      name: menuItem.nome,
      price: priceNum,
      category: menuItem.categoria,
      tag: menuItem.tag,
      description: menuItem.descricao,
    };

    return out as Dish;
}

  // Normaliza preço vindo do MenuItem
  private normalizePrice(raw: any): number {
    if (typeof raw === 'number') return raw;
    if (typeof raw !== 'string') return 0;
    const withoutSymbol = raw.replace('R$', '').replace(/\s/g, '');
    const withoutThousands = withoutSymbol.replace(/\./g, '');
    const normalized = withoutThousands.replace(/,/g, '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Converte dataURL (base64) para Blob
  private dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Constrói um Blob contendo o payload multipart/form-data manualmente
  // Isso permite controlar exatamente o header Content-Type (sem charset)
  private buildMultipartBody(form: FormData, boundary: string): Blob {
    const CRLF = '\r\n';
    const parts: (string | Blob)[] = [];

    for (const entry of (form as any).entries()) {
      const name = entry[0];
      const value = entry[1];
      parts.push(`--${boundary}${CRLF}`);
      if (value instanceof Blob) {
        // File/Blob field
        const filename = (value as any).name || 'file';
        const contentType = (value as any).type || 'application/octet-stream';
        parts.push(`Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}`);
        parts.push(`Content-Type: ${contentType}${CRLF}${CRLF}`);
        parts.push(value as Blob);
        parts.push(CRLF);
      } else {
        // Text field
        parts.push(`Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}`);
        parts.push(String(value));
        parts.push(CRLF);
      }
    }

    parts.push(`--${boundary}--${CRLF}`);
    return new Blob(parts);
  }


  // 1. READ: Buscar todos os pratos
  findAll(): Observable<MenuItem[]> { 
    return this.http.get<Dish[]>(API_URL)
      .pipe(
        map(dishes => dishes.map(this.mapDishToMenuItem)) 
      );
  }

  // [COMPLETO] 2. READ: Buscar um prato por ID
  findById(id: number): Observable<MenuItem> {
      return this.http.get<Dish>(`${API_URL}/${id}`).pipe(
        map(this.mapDishToMenuItem)
      );
  }

  // 4. CREATE: Criar um novo prato (POST)
  create(menuItem: MenuItem): Observable<MenuItem> {
    const urlImageValue = (menuItem as any).UrlImage || '';
    const priceNum = this.normalizePrice((menuItem as any).preco);

    // Se o componente forneceu um File diretamente (mais confiável), use-o
    const fileObj = (menuItem as any).file;
    if (fileObj && fileObj instanceof File) {
      const filename = (fileObj as any).name || `${(menuItem.nome || 'upload').replace(/\s+/g, '_')}.png`;
      const form = new FormData();
      form.append('file', fileObj, filename);
      // aliases para compatibilidade com backends variados
      form.append('image', fileObj, filename);
      form.append('imagem', fileObj, filename);
      form.append('fileImage', fileObj, filename);
      form.append('picture', fileObj, filename);
      form.append('urlImage', filename);
      form.append('name', (menuItem as any).nome || (menuItem as any).name || '');
      form.append('nome', (menuItem as any).nome || (menuItem as any).name || '');
      form.append('price', String(priceNum));
      form.append('category', menuItem.categoria || '');
      form.append('description', menuItem.descricao || '');
      if (menuItem.tag) form.append('tag', menuItem.tag);

      return this.http.post<any>(API_URL, form).pipe(
        map(json => this.mapDishToMenuItem(json))
      );
    }

    // Se receber um dataURL (base64), converte para Blob e envia como multipart
    if (typeof urlImageValue === 'string' && urlImageValue.startsWith('data:')) {
      const blob = this.dataURLtoBlob(urlImageValue);
      const filename = `${(menuItem.nome || 'upload').replace(/\s+/g, '_')}.png`;
      const form = new FormData();
      form.append('file', blob, filename);
      form.append('image', blob, filename);
      form.append('imagem', blob, filename);
      form.append('fileImage', blob, filename);
      form.append('picture', blob, filename);
      form.append('urlImage', filename);
      form.append('name', (menuItem as any).nome || (menuItem as any).name || '');
      form.append('nome', (menuItem as any).nome || (menuItem as any).name || '');
      form.append('price', String(priceNum));
      form.append('category', menuItem.categoria || '');
      form.append('description', menuItem.descricao || '');
      if (menuItem.tag) form.append('tag', menuItem.tag);

      return this.http.post<any>(API_URL, form).pipe(
        map(json => this.mapDishToMenuItem(json))
      );
    }

    // Caso padrão: JSON com metadados (sem enviar base64 inline)
    const dishToSend: Dish = this.mapMenuItemToDish(menuItem);
    return this.http.post<Dish>(API_URL, dishToSend).pipe(
      map(this.mapDishToMenuItem)
    );
  }

  // [COMPLETO] 5. UPDATE: Atualizar um prato (PUT)
  // ESTE MÉTODO CORRIGE O ERRO "A propriedade 'update' não existe"
  update(id: number, menuItem: MenuItem): Observable<MenuItem> { 
    const urlImageValue = (menuItem as any).UrlImage || '';
    const priceNum = this.normalizePrice((menuItem as any).preco);
    // Sempre enviar JSON via PUT para atualizar metadados.
    // Se for necessário enviar/atualizar a imagem, use o endpoint dedicado PATCH /{id}/image.
    const dishToSend: Dish = this.mapMenuItemToDish(menuItem);
    return this.http.put<Dish>(`${API_URL}/${id}`, dishToSend).pipe(
      map(this.mapDishToMenuItem)
    );
  }

  // Upload separado de imagem para um prato existente.
  // Backend deve expor um endpoint como POST /dishes/{id}/image que aceite multipart/form-data.
  uploadImage(id: number, file: File | Blob, filename?: string) {
    const name = filename || ((file as any).name || `upload_${id}.png`);
    const form = new FormData();
    // O backend espera o campo 'file' no @RequestParam
    form.append('file', file as any, name);
    // aliases opcionais (não necessários se backend usa 'file')
    form.append('image', file as any, name);
    form.append('imagem', file as any, name);
    // Use PATCH para o endpoint de imagem conforme o backend atualizado
    return this.http.patch<any>(`${API_URL}/${id}/image`, form).pipe(
      map(json => this.mapDishToMenuItem(json))
    );
  }

  // [COMPLETO] 6. DELETE: Deletar um prato (DELETE)
  // ESTE MÉTODO CORRIGE O ERRO "A propriedade 'delete' não existe"
  delete(id: number): Observable<void> { 
    // O retorno é vazio, mas a chamada é necessária
    return this.http.delete<void>(`${API_URL}/${id}`);
  }
}