# EQTec — Diário de Obras (MVP)

Interface em desenvolvimento para uma aplicação de diários de obras para construtoras e gerenciadora de obras.

* Documento de Requisitos - Hérmon Almeida;

* Design de UI UX - Hérmon Almeida;

Interface para ser levantada para testes de usabilidade para inicio do desenvolvimento.

MVP do módulo Diário de Obras (RDO), conforme o backlog do produto. Frontend em React + Vite, backend em Node/Express + SQLite.

## Como rodar

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (abra este endereço no navegador)

## Usuários de demonstração

Senha para todos: `Eqtec@123`

| E-mail | Papel | Projeto |
|---|---|---|
| admin@eqc.com.br | Administrador | Todos |
| editor@eqc.com.br | Editor | Kronolog Extrema I |
| validador1@eqc.com.br | Validador Nível 1 | Kronolog Extrema I |
| validador2@eqc.com.br | Validador Nível 2 | Kronolog Extrema I |
| validador3@eqc.com.br | Validador Nível 3 | Kronolog Extrema I |
| editor.guarulhos@eqc.com.br | Editor | KSM Log Guarulhos |

## Escopo desta entrega

Cobre o MVP definido em `EQTec - Backlog do Produto - Diário de Obras - R00.docx`: login e grupos de usuários, portfólio de projetos, dashboard, navegação de RDOs (calendário/lista/grupo), edição do RDO em 6 guias (Clima, Efetivo, Serviços, Comentários, Anexos, Assinatura), fluxo de validação em 3 níveis com reprovação, exportação em PDF, upload de fotos com compressão, e isolamento de dados por projeto.

Fora desta entrega (Fast-Follow/Roadmap no backlog): recuperação de senha por e-mail, painel pluviométrico dedicado, integração financeira Sienge, autopreenchimento de modelos, 2FA, modo escuro, integrações de IA/ponto biométrico.
