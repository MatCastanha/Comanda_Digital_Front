import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ClientService } from '../../../services/client.service';
import { ClientDTO } from '../../../interfaces/client.interface';

@Component({
  selector: 'app-cliente-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cliente-perfil.component.html',
  styleUrls: ['./cliente-perfil.component.css']
})
export class ClientePerfilComponent {
  model: ClientDTO = {};
  saving = false;
  foundAddress: any = null;
  // indica se o CPF veio do backend e não pode ser alterado
  cpfLocked = false;
  originalCpf?: string;

  constructor(private clientService: ClientService, private router: Router) {
    // tenta carregar o cliente atual. Ajusta campos para o nosso formulário.
    this.clientService.getClient().subscribe({
      next: (c) => {
        if (!c) return;
        // If backend returns nested address, map to form fields and keep object
        const addr = (c as any).address || (c as any).addressDTO || null;
        if (addr) {
          this.foundAddress = addr;
          this.model.endereco = [addr.logradouro, addr.bairro, addr.localidade, addr.uf].filter(Boolean).join(', ');
          this.model.cep = addr.cep || this.model.cep;
          this.model.numero = (c as any).addressNumber ?? this.model.numero;
        }

        this.model = {
          id: (c as any).id,
          cpf: this.formatCpf(String(c.cpf || '')),
          name: c.name,
          midName: c.midName,
          endereco: this.model.endereco || (c as any).endereco,
          numero: this.model.numero || (c as any).numero,
          cep: this.model.cep || (c as any).cep,
          salvarComo: c.salvarComo || (c as any).saveAs || (c as any).alias,
          address: addr,
          addressNumber: (c as any).addressNumber
        } as ClientDTO;
        // Guardamos o CPF original apenas para referência; não bloqueamos automaticamente.
        if (c && c.cpf) {
          this.originalCpf = String(c.cpf);
        }
      },
      error: () => { /* ignora, formulário vazio */ }
    });
  }

  salvar() {
    if (!this.model.cpf) {
      alert('CPF é obrigatório para prosseguir.');
      return;
    }
    if (!this.model.endereco) {
      alert('Endereço é obrigatório.');
      return;
    }
    this.saving = true;

    // Montar payload compatível com backend: incluir address (obj) e addressNumber
    const payload: any = {
      // Sempre envie o CPF que está no campo (sem máscara).
      cpf: this.unmaskCpf(String(this.model.cpf || '')),
      name: this.model.name,
      midName: this.model.midName,
      salvarComo: this.model.salvarComo
    };

    // Inclui id se existir (ajuda backend a atualizar o registro em vez de criar outro)
    if (this.model.id) {
      payload.id = this.model.id;
    } else {
      // tenta recuperar id salvo localmente (se o app já tiver guardado o cliente no localStorage)
      try {
        const stored = localStorage.getItem('client');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            // prefer id se for numérico, senão apenas envie cpf (não force id string)
            if (parsed.id && !isNaN(Number(parsed.id))) {
              payload.id = parsed.id;
            } else if (parsed.cpf) {
              payload.cpf = String(parsed.cpf);
            }
          }
        }
      } catch (e) {}
    }

    // Enviar aliases por precaução caso o backend espere outro nome de campo
    if (this.model.salvarComo) {
      payload.saveAs = this.model.salvarComo;
      payload.alias = this.model.salvarComo;
    }

    // Aliases para nomes — alguns backends esperam snake_case ou outros campos
    if (this.model.name) {
      payload.firstName = this.model.name;
      payload.nome = this.model.name;
      payload.fullName = (this.model.name + (this.model.midName ? ' ' + this.model.midName : '')).trim();
    }
    if (this.model.midName) {
      payload.lastName = this.model.midName;
      payload.sobrenome = this.model.midName;
      payload.mid_name = this.model.midName;
    }

    // se encontrarmos um objeto de endereço (via CEP), envie como 'address' e 'addressNumber'
    if (this.foundAddress) {
      payload.address = this.foundAddress;
      payload.addressNumber = this.model.numero;
    } else if (this.model.cep || this.model.endereco) {
      // fallback: enviar um address mínimo com cep e logradouro (quando não tivermos objeto completo)
      payload.address = {
        cep: this.model.cep,
        logradouro: this.model.endereco
      };
      payload.addressNumber = this.model.numero;
    }

    console.log('Salvar cliente payload:', payload);
    this.clientService.saveOrUpdate(payload).subscribe({
      next: (res) => {
        this.saving = false;
        // O backend usa 'cpf' como identificador; use cpf como clientId
        // Não gravar em localStorage: dados do cliente devem ser persistidos no backend apenas.
        // Se o frontend precisar de cache, que seja opcional e não obrigatório. Aqui não armazenamos.
        this.router.navigate(['/cliente']);
      },
      error: (err) => {
        this.saving = false;
        console.error('Erro salvando cliente', err);
        alert('Erro ao salvar dados do cliente. Tente novamente.');
      }
    });
  }

  toggleCpfLock() {
    this.cpfLocked = !this.cpfLocked;
  }

  // Formata CPF no padrão 000.000.000-00 a partir de apenas dígitos
  private formatCpf(digits: string): string {
    const d = (digits || '').toString().replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    // aplica máscara progressivamente
    const part1 = d.slice(0, 3);
    const part2 = d.length > 3 ? d.slice(3, 6) : '';
    const part3 = d.length > 6 ? d.slice(6, 9) : '';
    const part4 = d.length > 9 ? d.slice(9, 11) : '';
    let out = part1;
    if (part2) out += '.' + part2;
    if (part3) out += '.' + part3;
    if (part4) out += '-' + part4;
    return out;
  }

  // Remove tudo que não for dígito
  private unmaskCpf(value: string): string {
    return (value || '').toString().replace(/\D/g, '').slice(0, 11);
  }

  // Handler para o input do CPF — formata enquanto o usuário digita
  onCpfInput(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const raw = input.value || '';
    const digits = (raw || '').replace(/\D/g, '').slice(0, 11);
    const formatted = this.formatCpf(digits);
    console.log('onCpfInput raw=', raw, 'digits=', digits, 'formatted=', formatted);
    this.model.cpf = formatted;
  }

  // Evita teclas não numéricas (permite backspace, del, setas, tab)
  onCpfKeyDown(ev: KeyboardEvent) {
    // Permitir teclas de controle/cmd e setas, deletar, backspace, tab e enter
    if (ev.ctrlKey || ev.metaKey) return;
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
    if (allowed.includes(ev.key)) return;
    if (/\d/.test(ev.key)) return;
    // allow paste via ctrl/cmd+v
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'v') return;
    ev.preventDefault();
  }

  // Ao focar no campo CPF, mostre apenas dígitos (sem máscara) para edição
  onCpfFocus(ev: FocusEvent) {
    try {
      const raw = String(this.model.cpf || '');
      const digits = raw.replace(/\D/g, '').slice(0, 11);
      this.model.cpf = digits;
      // pequeno timeout para reposicionar valor do input do navegador
      setTimeout(() => {
        const el = ev.target as HTMLInputElement;
        if (el && el.setSelectionRange) {
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    } catch (e) {
      console.warn('onCpfFocus error', e);
    }
  }

  // Ao perder foco, reaplica a máscara
  onCpfBlur() {
    try {
      const digits = String(this.model.cpf || '').replace(/\D/g, '').slice(0, 11);
      this.model.cpf = this.formatCpf(digits);
      console.log('onCpfBlur -> formatted cpf=', this.model.cpf);
    } catch (e) {
      console.warn('onCpfBlur error', e);
    }
  }

  onCepChange() {
    const cep = (this.model.cep || '').toString().replace(/\D/g, '');
    if (!cep || cep.length < 8) return;
    this.clientService.getAddressByCep(cep).subscribe({
      next: (addr: any) => {
        // ViaCEP: logradouro, bairro, localidade, uf
        if (addr) {
          const parts: string[] = [];
          if (addr.logradouro) parts.push(addr.logradouro);
          if (addr.bairro) parts.push(addr.bairro);
          if (addr.localidade) parts.push(addr.localidade);
          if (addr.uf) parts.push(addr.uf);
          this.model.endereco = parts.join(', ');
          // guarda o objeto de endereço completo para enviar depois
          this.foundAddress = addr;
          // preenche cep formatado
          this.model.cep = this.formatCep(String(addr.cep || cep));
        }
      },
      error: (e) => {
        console.warn('Não foi possível obter endereço via CEP', e);
      }
    });
  }

  // Formata CEP como 00000-000 a partir de dígitos
  private formatCep(digits: string): string {
    const d = (digits || '').toString().replace(/\D/g, '').slice(0, 8);
    if (!d) return '';
    if (d.length <= 5) return d;
    return d.slice(0,5) + '-' + d.slice(5);
  }

  // Remove máscara do CEP
  private unmaskCep(value: string): string {
    return (value || '').toString().replace(/\D/g, '').slice(0, 8);
  }

  // Formata enquanto o usuário digita no campo CEP
  onCepInput(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 8);
    this.model.cep = this.formatCep(digits);
  }

  onCepKeyDown(ev: KeyboardEvent) {
    if (ev.ctrlKey || ev.metaKey) return;
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
    if (allowed.includes(ev.key)) return;
    if (/\d/.test(ev.key)) return;
    ev.preventDefault();
  }

  cancelar() {
    this.router.navigate(['/cliente']);
  }
}
