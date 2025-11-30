export interface ClientDTO {
  id?: number;
  // O backend usa 'cpf' como identificador (Long cpf)
  cpf?: string | number;
  name?: string; // corresponde a 'name' na entidade
  midName?: string; // corresponde ao sobrenome / midName
  // Endereço: suportamos objeto compatível com AddressDTO retornado pelo backend
  address?: {
    id?: number;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    cep?: string;
  };
  // número do endereço (addressNumber na entidade)
  addressNumber?: number | string;
  // Também mantemos campos auxiliares convenientes para o formulário
  endereco?: string; // string única mostrada no campo (logradouro, bairro, cidade - UF)
  numero?: string | number;
  cep?: string;
  // telefone foi removido do formulário; mantenha no backend se necessário
  salvarComo?: string;
}
