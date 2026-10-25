# Contato Flow 1.6.6 — extensão Chrome

Extensão local para importar contatos e organizar uma fila de mensagens de texto e fotos no WhatsApp Web. Construída a partir da análise funcional do WabulkXpress, com código independente.

## Instalar o ZIP

1. Extraia `Contato-Flow-Chrome.zip` em uma pasta permanente.
2. No Chrome, abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique **Carregar sem compactação** e selecione a pasta `Contato-Flow-Chrome` que contém `manifest.json`.
5. Fixe a extensão na barra do Chrome e clique no ícone para abrir o painel.

Não é necessário Python, Node.js ou REA para usar o ZIP pronto. O ZIP não instala por duplo clique e não é uma extensão assinada pela Chrome Web Store.

## Usar

1. Abra o WhatsApp Web e conecte sua conta por QR code, se necessário.
2. No painel, escolha um arquivo **.xlsx ou .csv**, ou cole uma lista. Na planilha, use a primeira linha como cabeçalho. Selecione a aba e as colunas de telefone/nome e clique **Importar contatos**.
3. Prefira números como texto com DDI, por exemplo `+5511999999999`. No modo Brasil, telefones de 10 ou 11 dígitos recebem `55`. O modo internacional exige DDI já informado.
4. Escreva a mensagem, usando `{{nome}}`, `{{telefone}}` e outras colunas, como `{{empresa}}`. Confira as prévias com as setas.
5. Opcionalmente, em **Adicionar foto**, escolha JPG, PNG ou WebP de até 5 MB. A mesma foto será usada na campanha, com o texto personalizado como legenda (até 1.024 caracteres). Também é possível enviar a foto sem legenda.
6. Configure os intervalos e a pausa entre lotes. O mínimo é 30 segundos. O tempo de carregamento da conversa pode aumentar o intervalo. Esses intervalos não garantem evitar restrições do WhatsApp.
7. Confirme a autorização dos contatos, clique **Iniciar envio automático** e revise o resumo. Uma aba dedicada do WhatsApp será aberta. Não mude de conversa nem digite nessa aba enquanto a fila estiver ativa.
8. A fila envia os contatos e continua os próximos lotes automaticamente após os intervalos. Não é necessário clicar em “Retomar fila” entre lotes. Use **Pausar fila** ou **Retomar fila** apenas para controle manual ou após corrigir uma interrupção. Um envio já acionado pode terminar mesmo após pausar. Fechar o painel não interrompe a fila; fechar a aba do WhatsApp pausa a operação. Não feche o Chrome nem suspenda o computador para continuar enviando.
9. Exporte o relatório CSV. Para apagar a campanha e seus dados, pause, aguarde a operação atual e use **Nova campanha**.

A aba do WhatsApp é ativada a cada contato. Use um perfil separado do Chrome se não quiser que isso interfira em outras atividades.

## Como ler os resultados

- **Pendente:** ainda não tentada.
- **Abrindo / Enviando:** operação em andamento.
- **Submetida:** o botão foi acionado e o campo limpou ou a prévia da foto fechou; não confirma entrega ou leitura.
- **Erro:** a tentativa não foi concluída. Falhas de localização do input/prévia da foto, confirmadas antes da autorização de envio, têm até três tentativas automáticas com espera progressiva; depois o contato é registrado como erro e a fila continua. Botão de envio ausente antes do clique registra erro e avança sem classificar o contato como enviado. Outros erros, como identidade do destinatário não confirmada, pausam a fila. O relatório não os classifica como enviados.
- **Incerta:** pode ter ocorrido envio, mas não foi possível confirmar. Confira a conversa, depois clique **Já conferi os envios incertos**. A extensão não reenviará esses contatos.
- **Revisada:** resultado incerto conferido manualmente, excluído de novas tentativas.

Se a identidade do destinatário não puder ser confirmada, ou o resultado após um clique for incerto, a fila pausa. O atraso entre lotes não é uma pausa manual e termina automaticamente. Nunca transforme erro ou resultado incerto em “enviado” só para avançar. O relatório preserva esses estados.

## Dados e permissões

A lista, mensagem e resultados ficam em `chrome.storage.local`; a foto fica no IndexedDB local, sem servidor próprio e sem telemetria. O WhatsApp recebe o número, o texto e a foto das mensagens submetidas. As URLs de abertura também contêm número/texto e podem constar no histórico do navegador; apagar a campanha não limpa esse histórico nem as mensagens do WhatsApp.

Permissões: `storage` para persistência, `alarms` para a fila e acesso apenas a `https://web.whatsapp.com/*` para operar sua interface. Não solicita acesso a todos os sites. Bibliotecas são locais, sem código remoto. Dados locais não são criptografados pela extensão.

## Validação e limites

O núcleo, a mídia e a fila possuem testes automatizados. A interface, o background e o content script foram exercitados no Chromium com APIs Chrome e WhatsApp simulados, sem envio real. O Chromium deste ambiente proíbe extensões locais por política administrativa, por isso não foi possível validar a extensão carregada de fato neste ambiente. A interface real do WhatsApp e os diferentes tipos de conversa ainda precisam de teste com um número seu. Conversas com identificadores LID, sem telefone verificável na página, são recusadas pelo adaptador.

A versão 1.6.6 envia **texto ou uma foto JPG/PNG/WebP por campanha**, com legenda opcional. Não inclui vídeo, áudio, PDF, galerias, fotos diferentes por contato, email/SMS, IA ou agendamento por data. Para planilhas .xls, salve como .xlsx. A extensão não é afiliada ao WhatsApp/Meta e não foi publicada na loja.

## Desenvolvimento

Node.js 24 e npm. Na raiz:

```sh
npm ci
npm run build
npm test
npm run test:dom
npm run test:browser
npm run package
```

O teste de navegador usa `/usr/bin/chromium`. Ele simula as APIs Chrome e o armazenamento de mídia do worker, intercepta o domínio WhatsApp e responde com HTML local. Não conecte uma conta real nesse perfil de teste.

Arquivos: `extension/` (produto), `tests/` (testes), `docs/ANALISE-REA.md` (análise), `docs/rea-original.json` (evidência REA).

## Atualizar das versões anteriores para 1.6.6

Pause a campanha, feche a aba dedicada do WhatsApp, substitua os arquivos na mesma pasta de instalação e clique **Recarregar** em `chrome://extensions`. Reabra o painel. Para contatos já marcados como erro na versão anterior, crie uma nova campanha com a lista desejada; contatos submetidos ou incertos não são recolocados na fila automaticamente.

## Foto e legenda em uma única mensagem

A extensão usa automação do WhatsApp Web, não uma chamada à API oficial da Meta. Internamente, cada operação de foto contém um único objeto `{type: 'image', media, caption}`. O arquivo é colado na conversa por um evento de colagem com a imagem, a legenda personalizada é preenchida nesse editor e a mídia é enviada pelo botão ou, na ausência de controle reconhecido, por um único Enter no campo da legenda. Não há envio de texto separado nem fallback para texto quando a foto falha. A prévia do painel mantém foto e legenda no mesmo balão; dimensões, fontes, quebra visual de linha e formatação são determinadas pelo WhatsApp no destino.

A detecção aceita imagem, canvas ou imagem de fundo na prévia, botão acessível “Enviar/Send” e novos ícones, inclusive quando a prévia fica dentro do rodapé da conversa. Usa elementos criados após colar a foto para não confundir mensagens antigas ou o editor de texto com a prévia.

A colagem usa `ClipboardEvent` com `DataTransfer`, sem ler ou alterar a área de transferência do sistema. Se o WhatsApp rejeitar eventos sintéticos, a prévia não abrirá e a tentativa terminará com diagnóstico; não equivale a um Ctrl+V físico. Após reconhecer a foto e conferir a legenda, a extensão clica em Enviar automaticamente, observa a limpeza do campo ou fechamento da prévia, abre imediatamente o próximo contato e aguarda o delay nessa conversa antes de enviar. Não é necessário clicar em Enviar ou Retomar a cada contato/lote.

Na versão 1.3, a conferência anterior ao clique aceita que o WhatsApp recrie o botão ao preencher a legenda. O envio continua exigindo destinatário confirmado, prévia única, mesma assinatura visual da mídia e campo preenchido quando houver legenda. O worker registra o horário mínimo de envio e rejeita autorização antecipada, inclusive com a próxima conversa já aberta. Pausar durante essa espera mantém o próximo contato pendente.

Na versão 1.5, a legenda não precisa corresponder exatamente ao texto personalizado: se foi solicitada uma legenda, basta que o campo esteja preenchido. Isso permite o envio mesmo se parte do texto ou de um link estiver ausente ou diferente. Foto sem legenda continua permitida quando a campanha não tem texto. O preenchimento emite `input` caso o navegador não o faça e aguarda a atualização do editor; não insere HTML do usuário.

Após o acionamento do envio, a fila avança quando o campo de texto limpa ou a prévia da foto fecha. Não aguarda mensagem aparecer no histórico, tiques, entrega nem leitura pelo destinatário. Se a interface não limpar/fechar em até 20 segundos, o resultado permanece incerto e não há repetição automática.

## Janela diária de envio

Na etapa de intervalos, configure **Usar janela diária de envio**, **Enviar a partir de** e **Enviar até**. O padrão é 08:00–18:00, no fuso local do computador que executa o Chrome, exibido no painel. O início está incluído; o fim não. Horários como 22:00–06:00 atravessam a meia-noite; início e fim iguais são rejeitados. Desmarque a opção para enviar sem restrição de horário.

Fora da janela, a campanha continua ativa em espera e retoma automaticamente, sem clicar em Retomar, enquanto Chrome/WhatsApp permanecem abertos. O delay e as pausas de lote continuam valendo; se terminarem fora da janela, o envio aguarda a próxima abertura. A fila verifica a janela também antes do clique. Pausa manual cancela a retomada automática; fechar o Chrome ou a aba ainda exige revisão e retomada manual. Se o computador suspender, a execução só pode continuar quando ele voltar e estiver dentro da janela.

Na versão 1.6.1, localizar o campo de legenda não depende de o botão Enviar estar habilitado. O campo é preenchido primeiro; o clique só é autorizado depois de o botão ficar disponível. O editor é localizado novamente após receber foco e pode ter até três tentativas de preenchimento enquanto continuar vazio. Se `insertText` estiver indisponível, há uma tentativa de colagem de texto simples. Não se acrescenta texto a uma legenda já preenchida, nem se repete um clique de envio.

Na versão 1.6.2, após colar a imagem o fluxo aguarda no mínimo 3 segundos, localiza a prévia e exige que imagem/campo permaneçam estáveis por 500 ms. Se a tela demorar mais para abrir, continua aguardando dentro do limite de preparação. Após preencher a legenda e emitir input, aguarda mais 1,5 segundo antes de liberar o clique. Essas esperas são adicionais ao delay entre contatos e à janela diária. Quando presente, o contêiner `media-caption-input-container` é priorizado dentro da prévia. O conteúdo é inserido como texto simples, sem interpretar HTML.

Na versão 1.6.3, o editor recebe foco e o cursor é posicionado dentro do parágrafo, quando houver. Apenas a estrutura vazia é limpa; legendas preenchidas não são apagadas. Após insertText/input, o editor atual recebe também change. A espera mínima após colar a foto continua em 3 segundos; após a legenda, passa a 1 segundo antes de aguardar o botão habilitado e a autorização de envio. Campos aninhados, campos de texto simples e um editor reutilizado dentro do contêiner explícito de legenda são reconhecidos. O aviso da fila mostra cada etapa de preparação para tornar uma eventual parada identificável.

Na versão 1.6.4, a preparação localiza a imagem nova e um único editor de legenda sem depender do seletor do botão Enviar. O botão é localizado separadamente depois do preenchimento. A inserção retoma a abordagem da versão 1.2: focar o editor completo, selecionar seu conteúdo vazio e executar insertText, sem apagar manualmente parágrafos/nós internos. Permanecem input/change, esperas, tentativas em campo vazio, agendamento e delay. O envio ainda exige um botão reconhecido e habilitado; não há clique por coordenadas nem envio de foto sem a legenda solicitada.

Na versão 1.6.5, o botão é procurado a partir da prévia já identificada. A detecção aceita rótulos de envio com “mensagem” e “(Enter)”, controles acessíveis sem tag button e marcadores de mídia. Ícone e contêiner do mesmo controle são contados uma única vez. Um botão reutilizado pode ser aceito dentro do painel de mídia, sem selecionar o antigo botão da conversa. Controles desabilitados e ações de agendamento não são acionados; se houver mais de um botão de envio candidato, a extensão não escolhe por posição.

Na versão 1.6.6, se nenhum botão de envio for reconhecido após a espera de preparação, a extensão pode usar o atalho Enter no campo da legenda. A prévia deve ser única, o destinatário confirmado e a legenda solicitada preenchida; a janela e o delay continuam obrigatórios. O atalho não é usado para contornar botão reconhecido desabilitado nem controles ambíguos. Há uma única pressão de tecla, sem clique adicional. O relatório distingue atalho e clique; a prévia precisa fechar para a fila continuar. Se o WhatsApp ignorar o evento de teclado ou inserir uma quebra de linha, o resultado será incerto após o timeout e não será repetido. O evento é sintético: não equivale a uma tecla física garantida em todas as versões do WhatsApp.

O diagnóstico distingue controles habilitados e reconhecidos/desabilitados, conta controles da prévia e lista até cinco identificadores de ícones. Não inclui legenda, telefones, HTML ou imagens.
