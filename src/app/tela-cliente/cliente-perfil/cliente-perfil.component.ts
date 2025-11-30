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
  // local helper to show a small inline notification when user clicks help link
  showCepNote = false;
  cepNoteMessage = '';

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
          salvarComo: c.salvarComo || (c as any).saveAs || (c as any).alias || (c as any).complement,
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

  notifyUnknownCep(ev?: Event) {
    if (ev) ev.preventDefault();
    this.cepNoteMessage = 'Eu também não sei seu CEP';
    this.showCepNote = true;
    // esconder após 2.5s, similar ao toast
    setTimeout(() => this.showCepNote = false, 2500);
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
    const rawCpf = this.unmaskCpf(String(this.model.cpf || ''));
    const cpfNumber = rawCpf ? Number(rawCpf) : null;
    const payload: any = {
      // Sempre envie o CPF que está no campo (sem máscara). Enviamos como number
      cpf: cpfNumber,
      name: this.model.name,
      midName: this.model.midName,
      salvarComo: this.model.salvarComo
    };

    // Inclui id se existir (ajuda backend a atualizar o registro em vez de criar outro)
    // teste explícito contra null/undefined para aceitar id === 0 quando aplicável
    if (this.model.id !== undefined && this.model.id !== null) {
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
      // backend agora tem campo 'complement' no model Client — envie também
      payload.complement = this.model.salvarComo;
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

    // payload do cliente preparado para envio
    this.clientService.saveOrUpdate(payload).subscribe({
      next: (res) => {
        this.saving = false;
        // Atualiza o model com o retorno do servidor para refletir valores reais salvos
        try {
          if (res) {
            this.model.id = (res as any).id ?? this.model.id;
            const respCpf = (res as any).cpf ?? (res as any).CPF ?? null;
            this.model.cpf = respCpf ? this.formatCpf(String(respCpf)) : this.model.cpf;
            this.model.name = (res as any).name ?? this.model.name;
            this.model.midName = (res as any).midName ?? this.model.midName;
            this.model.salvarComo = (res as any).salvarComo || (res as any).saveAs || (res as any).alias || (res as any).complement || this.model.salvarComo;
            // se o servidor retornar endereços, atualiza também
            const addr = (res as any).address || (res as any).addressDTO || null;
            if (addr) {
              this.foundAddress = addr;
              this.model.endereco = [addr.logradouro, addr.bairro, addr.localidade, addr.uf].filter(Boolean).join(', ');
              this.model.cep = this.formatCep(String(addr.cep || this.model.cep || ''));
              this.model.numero = (res as any).addressNumber ?? this.model.numero;
            }
          }
        } catch (e) {
          console.warn('Erro ao aplicar resposta do servidor no model', e);
        }
        // Assegura que o campo CPF esteja desbloqueado para edição (se o usuário quiser alterar)
        this.cpfLocked = false;
        // Navega para a tela principal do cliente (comportamento anterior)
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
    // formatação aplicada em tempo real (sem logs)
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

  // Ao perder foco do campo CEP: converte para apenas dígitos, salva o Address no backend
  // e, se o cliente já tiver CPF, tenta associar o endereço ao cliente (salvando o client).
  onCepBlur() {
    try {
      const digits = this.unmaskCep(String(this.model.cep || ''));
      // atualiza o campo para somente dígitos (conforme solicitado)
      this.model.cep = digits;
      if (!digits || digits.length < 8) return;

      // chama POST /address/{cep} para salvar/atualizar o address no backend
      this.clientService.saveAddressByCep(digits).subscribe({
        next: (addr: any) => {
          // atualiza view com endereço retornado
          this.foundAddress = addr;
          const parts: string[] = [];
          if (addr.logradouro) parts.push(addr.logradouro);
          if (addr.bairro) parts.push(addr.bairro);
          if (addr.localidade) parts.push(addr.localidade);
          if (addr.uf) parts.push(addr.uf);
          this.model.endereco = parts.join(', ');

          // Se já temos CPF no form, atualiza o cliente para associar o address
          if (this.model.cpf) {
            const payload: any = {};
            const rawCpf = this.unmaskCpf(String(this.model.cpf || ''));
            payload.cpf = rawCpf ? Number(rawCpf) : null;
            if (this.model.id !== undefined && this.model.id !== null) payload.id = this.model.id;
            payload.address = addr;
            payload.addressNumber = this.model.numero;
            // salva cliente com o novo address (não interfere nos outros campos)
            this.clientService.saveOrUpdate(payload).subscribe({
              next: (res) => {
                // atualiza model com resposta do servidor se houver
                try {
                  const addrResp = (res as any).address || (res as any).addressDTO || null;
                  if (addrResp) {
                    this.foundAddress = addrResp;
                    this.model.endereco = [addrResp.logradouro, addrResp.bairro, addrResp.localidade, addrResp.uf].filter(Boolean).join(', ');
                    this.model.cep = String(addrResp.cep || digits);
                    this.model.numero = (res as any).addressNumber ?? this.model.numero;
                  }
                } catch (e) { /* ignore */ }
              },
              error: (err) => { console.warn('Falha ao associar address ao cliente', err); }
            });
          }
        },
        error: (e) => {
          console.warn('Falha ao salvar address via CEP', e);
        }
      });
    } catch (e) {
      console.warn('onCepBlur error', e);
    }
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
