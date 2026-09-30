# SUR Giveaway

## Importação por imagens (fluxo principal)

Não exige nenhuma credencial. Selecione de 1 a 5 prints PNG/JPG/WebP de até 10 MB cada, clique em **Ler @usuários das imagens**, revise os nomes e confirme a lista. Duplicados entre imagens são unidos: cada username tem uma chance. Blacklist e exclusão do organizador continuam disponíveis.

O OCR roda localmente no navegador com Tesseract.js; imagens e textos não são enviados a APIs nem persistidos. Worker, WASM e modelo de idioma são servidos pelo próprio app, preparados automaticamente por `predev`/`prebuild`. A instalação requer baixar os pacotes npm; a leitura não depende de CDN externo. O modelo eng lê os caracteres de usernames, não interpreta quem é autor ou pessoa marcada. Detectamos @ explícitos; nomes sem @, erros de leitura, marcações e textos pequenos precisam ser conferidos manualmente. O texto bruto e as miniaturas estão disponíveis para revisão. Há cancelamento e limite de 3 minutos por lote.

No fluxo de imagens, não reconstruímos comentários nem contagens: a exportação identifica `source: images`, arquivos e a lista revisada. Alterar imagens/nomes invalida a confirmação anterior. Durante resultado, tudo fica bloqueado. A escolha editorial continua em **Configurações avançadas → Curadoria / Simulação**, identificada na tela e nas exportações; a função randomDraw permanece independente.

A integração Meta abaixo continua opcional na aba **Link do Instagram (API)**.

Ferramenta interna do Sempre Um Rock (@sempreumrock) para importar comentários de posts/reels próprios, aplicar regras e sortear vencedores e suplentes. Interface escura, responsiva, com curadoria explicitamente separada do sorteio.

## Stack e execução

Next.js 16.3.7 (App Router), React 19, TypeScript, Tailwind CSS 4, lucide-react, Vitest e Playwright. Node.js 22.13+ recomendado. Sem banco e sem backend separado.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. A interface funciona sem credenciais; importar um post exige a configuração Meta abaixo. Não há dados fictícios no fluxo de produção.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Testes de navegador: instale Google Chrome e execute `npm run test:e2e`. O Playwright inicia o servidor local automaticamente. Os testes interceptam a API com fixtures: não consultam nem alteram a conta real. `npm run format` formata o código.

## Arquitetura

```text
app/
  page.tsx, layout.tsx, globals.css
  api/instagram/post/route.ts  # única API da aplicação
components/
  GiveawayApp.tsx             # estado em memória e fluxo
  PostImporter.tsx            # URL, carregamento, resumo do post
  ParticipantTable.tsx        # busca, paginação local, comentários por autor
  GiveawayRules.tsx           # filtros e blacklist
  DrawPanel.tsx               # animação, resultados, controles de curadoria
  useLocalSettings.ts         # preferências locais validadas
lib/
  instagram/
    credentials.ts            # server-only, valida configuração
    client.ts                 # transporte, timeout, erros, paginação
    media.ts                  # procura shortcode nas mídias da conta
    comments.ts               # comentários e respostas paginados
    errors.ts, types.ts, url.ts
  giveaway/
    types.ts, normalize.ts, eligibility.ts
    draw.ts                   # randomDraw + Web Crypto
    curation.ts               # seleção manual, sem chamar randomDraw
    export.ts                 # texto e JSON com tipo do resultado
scripts/check-instagram.mjs    # diagnóstico seguro e descoberta do ID
 tests/                       # regras, segurança, integração simulada e E2E
```

A URL só é analisada; nunca é requisitada pelo backend. O cliente Meta fala exclusivamente com `graph.instagram.com`. O adaptador de mídias percorre `/{accountId}/media` até encontrar o shortcode em `permalink`; não assume que existe conversão pública de shortcode para media ID. O adaptador de comentários percorre `/{mediaId}/comments` e `/{commentId}/replies`. Respostas também participam das mesmas regras.

A paginação reconstrói URLs usando cursores, nunca segue cegamente `paging.next`. Cursor repetido/ausente ou falha de página aborta a importação inteira. Erros da Meta são convertidos para mensagens fixas; tokens e mensagens brutas não são retornados nem registrados.

## Variáveis de ambiente

Use `.env.local` apenas no servidor. O arquivo está no `.gitignore`. Nunca use prefixo `NEXT_PUBLIC_` nestas variáveis.

| Variável               | Uso                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `META_ACCESS_TOKEN`    | Obrigatória: **Instagram User access token**, do fluxo Instagram Login.                                                               |
| `INSTAGRAM_ACCOUNT_ID` | Obrigatória: ID numérico da conta profissional retornado por esse mesmo fluxo.                                                        |
| `META_API_VERSION`     | Obrigatória: versão habilitada no app Meta, no formato `vNN.0`. Escolha a versão mostrada no painel; não usamos uma versão implícita. |
| `META_APP_ID`          | Reservada para o ID do aplicativo Instagram usado na autorização. Não é necessária nas leituras com token já emitido.                 |
| `META_APP_SECRET`      | Reservada para troca/renovação server-side de tokens. Não é utilizada nesta entrega, que recebe um token previamente emitido.         |

Não são necessários Page ID, Facebook Page token ou banco. O projeto implementa **Instagram API with Instagram Login**. Não misture tokens/permissões de Facebook Login ou da antiga Basic Display API.

## Conectar a conta Business: passo a passo

1. Entre no [Meta for Developers](https://developers.facebook.com/apps/) com um usuário que administra o aplicativo. Crie um aplicativo e escolha o caso de uso/produto **Instagram** que ofereça **API setup with Instagram login**. Os nomes dos menus podem variar por idioma e configuração do painel.
2. Abra **Instagram → API setup with Instagram login**. Confira os identificadores do aplicativo Instagram exibidos nessa configuração. Se guardar `META_APP_ID` e `META_APP_SECRET`, use os valores desse fluxo, não credenciais de outro aplicativo.
3. Na área **Generate access tokens**, adicione a conta profissional `@sempreumrock`. Entre no Instagram com essa conta e autorize o acesso. Caso o painel exija convite de tester, adicione a conta em **App roles / Instagram testers** e aceite o convite nas configurações de apps/sites da própria conta Instagram antes de gerar o token.
4. Conceda **`instagram_business_basic`** (perfil e mídias) e **`instagram_business_manage_comments`** (comentários). Estas são as duas permissões utilizadas pelo SUR Giveaway; publicação e mensagens não são necessárias. Para conta própria vinculada aos papéis do app, siga o caminho de teste/Standard Access permitido pelo painel. Para atender contas externas, solicite Advanced Access/App Review e verificações que a Meta exigir antes do uso.
5. Gere o **Instagram User access token** para essa conta e coloque-o em `META_ACCESS_TOKEN` no `.env.local`. Não cole tokens no navegador do SUR Giveaway, em issues ou em mensagens de suporte. Registre a validade indicada pela Meta; o app não renova tokens automaticamente.
6. Preencha `META_API_VERSION` com a versão selecionada no painel Meta (formato `vNN.0`). As versões podem evoluir; mantenha a versão explícita e verifique compatibilidade antes de mudá-la.
7. Execute `npm run instagram:check`. O script consulta `GET https://graph.instagram.com/{version}/me?fields=user_id,username` com Authorization no header. Ele imprime **somente username e ID** em caso de sucesso, nunca o token. Confira que o username é `sempreumrock`; copie o `user_id` impresso para `INSTAGRAM_ACCOUNT_ID`. Também é possível obter esse ID na conta adicionada ao painel/na resposta de autorização. Não use username, Page ID ou App ID neste campo.
8. Execute novamente `npm run instagram:check` para verificar que o ID configurado coincide com o token. Reinicie `npm run dev` depois de editar `.env.local`.
9. Cole o permalink de um post/reel **publicado pela conta conectada** e clique em **Carregar comentários**. Confirme legenda, data, comentários, usuários únicos e exclusões antes de sortear. Teste primeiro um post pequeno com comentários e respostas conhecidos.
10. Confira os dois modos: sorteio usa Web Crypto; em **Configurações avançadas**, curadoria permite selecionar manualmente alguém, inclusive excluído, para testes/editorial. Essa seleção recebe identificação permanente de CURADORIA / SIMULAÇÃO na tela, texto copiado e JSON.

A entrega não inclui OAuth público, callback ou renovação automática: o operador emite e troca o token no servidor. Quando expirar, gere/renove pelo fluxo oficial e atualize o ambiente. Para uma automação futura, implemente Business Login e a renovação na camada server-only.

## Documentação da integração

Consulta realizada em 29/09/2026. A coleção oficial da Meta no Postman confirma o fluxo profissional com Instagram Login e os escopos `instagram_business_*`. Algumas páginas de developers.facebook.com exigiram login ou retornaram limite de consultas durante a pesquisa; o roteiro deve ser conferido no painel autenticado ao conectar a conta. A integração real ainda precisa ser validada com as credenciais da equipe.

- [Coleção oficial Meta — Instagram Login](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login)
- [Meta — Get started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started/)
- [Meta — Business Login e tokens](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/)
- [Meta — Comment moderation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/comment-moderation/)

## Regras e aleatoriedade

- Uma chance por usuário e uma chance por comentário são alternativas mutuamente exclusivas.
- Menções são usernames distintos, sem diferenciar maiúsculas/minúsculas. Repetir a mesma @menção não aumenta o mínimo. O parser não comprova que a conta marcada existe e não verifica seguidores/curtidas.
- Duplicados idênticos são removidos **por autor**, usando igualdade exata do texto. Espaços e caixa diferentes contam como textos diferentes. IDs repetidos pela paginação são sempre deduplicados.
- A blacklist ignora `@` inicial e caixa. Comentários do organizador podem ser excluídos; autores indisponíveis não são elegíveis.
- No modo comentário, a probabilidade de cada usuário é proporcional à quantidade de comentários válidos restantes. Depois de selecionado, o usuário sai do conjunto antes de escolher o próximo vencedor/suplente. O comentário exibido é escolhido uniformemente entre os comentários válidos daquele usuário.
- `crypto.getRandomValues()` com **rejection sampling** evita viés de módulo. Não utiliza `Math.random()`. Não há lista expandida de tickets em memória.
- A animação é decorativa e não muda a seleção. Post e regras ficam congelados até **Novo sorteio**.
- O JSON inclui modo, data, vencedores, suplentes, mídia, horário da importação, regras, blacklist e snapshot de participantes. Não inclui tokens. Esse arquivo contém dados dos participantes; guarde-o no espaço interno da equipe.
- A exportação é um registro local, não uma certificação externa imutável. Não há histórico persistente ou auditoria em servidor.

## Endpoint e erros

`POST /api/instagram/post`, com `Content-Type: application/json`:

```json
{ "url": "https://www.instagram.com/p/SHORTCODE/" }
```

Sucesso: `{ media, comments, importedAt }`. Erro: `{ error, code? }`, sem dados parciais. Há mensagens para URL inválida, configuração pendente, mídia ausente, token inválido/expirado, permissões, rate limit, indisponibilidade e paginação. Zero comentários é sucesso com lista vazia e aviso na tela.

A API de mídias próprias não permite distinguir com certeza “post de outra conta” de “removido/não acessível”. Por isso a mensagem explica essas possibilidades, sem fazer uma alegação falsa de propriedade. Não existe scraping ou fallback não oficial.

## Deploy na Vercel

1. Publique o repositório quando autorizado e importe o projeto na Vercel, preset **Next.js**, Node 22.x ou superior compatível.
2. Adicione as variáveis acima em **Settings → Environment Variables** nos ambientes necessários. Não envie `.env.local` ao repositório. Não compartilhe credenciais de produção com previews não confiáveis.
3. Execute build com `npm run build`. O build não precisa acessar a Meta. Após mudar variáveis, faça um novo deploy.
4. Como é uma ferramenta interna **sem autenticação própria**, configure proteção de acesso no deployment (Vercel Deployment Protection ou proxy autenticado da organização) cobrindo **produção, previews e `/api/*`** antes de disponibilizar. Confirme que uma janela anônima sem acesso não consegue chamar a API. A disponibilidade de cada recurso de proteção depende do plano da Vercel.
5. O Route Handler declara `maxDuration = 300`. Configure um plano/runtime que permita essa duração. O adaptador encerra em até 250 segundos e cada chamada em até 20 segundos; o navegador aguarda até 290 segundos. Limites menores do provedor também podem interromper a importação. Não há processamento em background.
6. Teste um post pequeno pela URL protegida. Proteção de origem no endpoint reduz requisições entre sites, mas **não substitui autenticação**. Não foi adicionada limitação distribuída por IP, pois não há armazenamento compartilhado; use controles da plataforma se necessário.

## Limitações e manutenção

A lista corresponde a todos os comentários e respostas que a API autorizada disponibilizar e cuja paginação terminar com sucesso. Comentários apagados, indisponíveis ou restritos podem não ser retornados. A Meta não fornece snapshot transacional: comentários podem entrar/sair durante a importação. A contagem da interface do Instagram pode divergir. Feche as participações antes de importar conforme as regras do evento.

A busca percorre mídias da conta, portanto posts antigos custam mais chamadas. Respostas são buscadas por comentário; publicações grandes podem atingir rate limit, duração ou limite de resposta/memória da hospedagem. Nesses casos a operação falha, sem autorizar sorteio sobre importação parcial; volumes muito grandes exigirão uma evolução explícita para jobs/armazenamento, fora desta entrega sem banco.

Nada de posts, comentários ou resultados é salvo no localStorage. Apenas blacklist, regras e número padrão de suplentes são persistidos. Recarregar a página perde os dados da sessão; exporte antes. Revogar o token interrompe futuras consultas.

Os testes cobrem URL, menções, duplicados, blacklist, chances, pesos, ausência de repetição, Web Crypto, rejection sampling, separação de curadoria, paginação, sanitização de erros, endpoint e fluxo de navegador. Credenciais e aprovação Meta são externas ao projeto; os testes simulados não comprovam permissões reais da conta.
