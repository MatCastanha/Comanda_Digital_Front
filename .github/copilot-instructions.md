## Visão rápida do projeto

- Projeto: aplicação Angular (gerada com Angular CLI 18.x). Código na pasta `src/`.
- Build / dev: `npm start` -> `ng serve` (ver `package.json/scripts`). Testes: `npm test` (`ng test`, Karma).
- Estrutura: componentes dentro de `src/app/` (cada componente tem `.ts`, `.html`, `.css`, `.spec.ts`). Ex.: `src/app/cadastro-prato/`.

## Arquitetura e padrões importantes

- Framework: Angular (v18), TypeScript. Dependências listadas em `package.json`.
- Application bootstrap minimal: `src/app/app.config.ts` usa `provideRouter(routes)` e `provideZoneChangeDetection(...)`.
  - Observação: `src/app/app.routes.ts` atualmente exporta `export const routes: Routes = [];` — rotas globais não foram definidas aqui.
- Componentes standalone: exemplos usam `standalone: true` (ex.: `CadastroPratoComponent` em `src/app/cadastro-prato/cadastro-prato.component.ts`). Para componentes standalone lembre de adicionar módulos em `imports` (ex.: `FormsModule`, `CommonModule`) quando necessário.
  - Exemplo detectado: `cadastro-prato.component.html` usa `[(ngModel)]` — isso requer `FormsModule` importado no `imports` do componente ou provisionado globalmente.

## Como iniciar / checar rapidamente

- Rodar dev server: `npm start` (usa `ng serve`, porta padrão 4200).
- Build produção: `npm run build` (conforme `angular.json` a saída vai para `dist/dish-app`).
- Testes unitários: `npm test` (Karma + Jasmine). Arquivos de teste seguem `*.spec.ts` ao lado dos componentes.

## Convenções de código e estilo do repositório

- Naming: pasta por componente com nome kebab-case, arquivos em camel/pascal conforme tipo (ex.: `cadastro-prato.component.ts`, `.html`, `.css`, `.spec.ts`).
- Assets estáticos: `angular.json` inclui `public/` como diretório de assets — coloque imagens/publicos estáticos lá para referência simples.
- CSS global: `src/styles.css` listado em `angular.json`.

## Pontos de atenção para agentes de código

- Antes de modificar um componente standalone que usa `ngModel`, verifique/adicione `FormsModule` em `imports` do componente para evitar erros em tempo de execução.
- Rotas: `app.routes.ts` está vazio; se for adicionar páginas, registre novas rotas lá e atualize `appConfig` se necessário.
- Ao adicionar chamadas HTTP, siga o padrão Angular Services (crie serviços em `src/app/services/` e injete nos componentes). Não há serviços HTTP existentes a serem espelhados neste repositório.

## Exemplos rápidos (onde olhar)

- `package.json` — scripts e dependências (start/build/test).
- `angular.json` — configuração de build, assets (`public/`) e estilos.
- `src/app/app.config.ts` — bootstrap providers (router, zone change detection).
- `src/app/app.routes.ts` — arquivo de rotas (atualmente vazio).
- `src/app/cadastro-prato/` — exemplo de componente standalone + template usando `ngModel`.

## Objetivos de mudança seguros e pequenas melhorias

- Garantir que componentes standalone importem módulos necessários (FormsModule, CommonModule).
- Definir rotas básicas em `app.routes.ts` se novos componentes de página forem adicionados.
- Documentar novas integrações (APIs externas) no README quando ocorrerem.

Se algo estiver impreciso ou você quiser que eu mescle o conteúdo com um arquivo existente, diga qual parte devemos ajustar ou forneça links/arquivos adicionais para incorporar.
