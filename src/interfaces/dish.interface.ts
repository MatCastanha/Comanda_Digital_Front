// Estrutura exata dos dados vindos do Back-end Java (em Inglês/JSON)
export interface Dish {
    id: number;
    UrlImage?: string; 
    name: string;        // Corresponde a 'nome'
    price: number;       // Corresponde a 'preco'
    category: string;    // Corresponde a 'categoria'
    tag?: string;
    description?: string;
}