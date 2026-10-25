# Validação da versão 1.6.6

- `npm test`: 23 testes passaram, zero falhas. Abrangem CSV/telefones, personalização, limites, exportação, persistência de mídia, rejeição de formatos, tokens da fila, pausa, reinício e resultados incertos.
- `npm run test:browser`: 16 verificações passaram no Chromium. Incluem XLSX real, deduplicação, campos personalizados, rascunho, fluxo de texto, pausa, relatório, destinatário incorreto, lista colada, renderização sem execução de HTML, foto persistida, foto + legenda em um único clique, ausência de exceções e layout estreito.
- `npm run test:dom`: 32 regressões passaram: prévia clássica, prévia dentro de `#main/footer`, canvas, fundo CSS, textarea, editor previamente oculto rejeição de prévias ambíguas, três estruturas com emojis-imagem, marcador de envio sem role, aceitação de conteúdo diferente não vazio, editor recriado sem texto e evento input de apoio.
- A página de teste usa a política `script-src 'self'; object-src 'none'`, equivalente à restrição de scripts do manifesto. ExcelJS funciona como biblioteca local, sem CDN.
- `npm run package`: ZIPs gerados e reabertos com validação de CRC e verificação dos arquivos obrigatórios do manifesto.
- Teste de dois lotes consecutivos: intervalo mínimo/máximo de 30 segundos, um contato por lote e pausa de 30 segundos. A próxima conversa abriu em menos de 10 segundos, sem clique antecipado; o segundo envio ocorreu automaticamente após pelo menos 60 segundos de relógio real; cada contato recebeu uma operação com arquivo e legenda juntos, sem envio de texto separado.
- Código Python original não executado. Inspeção REA e leitura estática documentadas separadamente.

## Não validado neste ambiente

O Chromium gerenciado bloqueou `Extensions.loadUnpacked` por política administrativa. A política foi preservada. Os testes de navegador exercitam os arquivos reais de UI, background e content script, com fronteiras de APIs Chrome/IndexedDB do worker e WhatsApp simuladas. Isso não comprova o ciclo de vida real de um service worker MV3, nem compatibilidade com todas as versões da interface do WhatsApp.

Nenhuma conta de WhatsApp foi conectada; nenhuma mensagem real foi enviada. Faça a primeira validação no Chrome com um único número seu e uma imagem de teste. Confira destinatário, imagem, legenda e relatório antes de usar uma lista maior. Interrompa a campanha se aparecer um resultado incerto; a extensão não o repetirá automaticamente.

A versão distribuída envia uma foto por campanha, opcionalmente com legenda, ou texto sem foto. Não inclui vídeos, áudios, PDFs ou galerias.

A falha real relatada pelo usuário na 1.0 foi usada para revisar os seletores, mas a conta real do usuário não está acessível neste ambiente. O resultado dos testes simulados não comprova a compatibilidade com todas as versões atuais do WhatsApp Web.

Na versão 1.2, o teste de navegador recebe o arquivo via evento `paste`, confere uma colagem e um clique de envio, a legenda final e a continuidade sem intervenção. O receptor de colagem é simulado: a aceitação de ClipboardEvent sintético pelo WhatsApp real permanece não validada.

A regressão da versão 1.3 recria o botão após o evento de digitação da legenda. O teste exige clique automático único no botão atual. Também verifica o horário mínimo no worker e a invalidação da autorização quando o usuário pausa na próxima conversa. A captura do usuário não fornece o DOM real; essa correção resolve uma condição reproduzida nos testes, mas não confirma a causa exata na conta do usuário.

## Regressão da legenda na versão 1.4

Antes da correção, o novo teste falhou: `🚨 Oferta\nPreço R$ 17,32\n\nhttps://example.com` foi lido como `🚨 OfertaPreço R$ 17,32\n\n\nhttps://example.com`. O leitor anterior perdia a separação antes do primeiro bloco e acrescentava quebras extras. Após a correção, esse caso passou.

O teste integrado converte o emoji em imagem com `alt`, recria o editor e o botão após input, e exige uma notificação de input, um clique de envio e legenda final correspondente. Verifica a continuidade após 60 segundos de intervalo real. Na versão 1.4, os testes negativos rejeitavam texto descartado pelo editor, URLs e sequências de emojis diferentes. A versão 1.5 substitui essa regra pela presença de conteúdo, conforme solicitado. Esses cenários reproduzem uma falha do código; não constituem inspeção do DOM da conta real do usuário.

## Validação da regra solicitada na versão 1.5

O teste integrado remove o emoji inicial da legenda no editor, tornando seu conteúdo e comprimento diferentes do texto da campanha. Exige um único clique automático, confirmação pelo texto realmente enviado, abertura do próximo contato e intervalo real de pelo menos 60 segundos antes do segundo envio. O teste de DOM aceita conteúdo não vazio diferente e rejeita o campo vazio quando foi solicitada uma legenda. Não há mais bloqueio por igualdade exata da legenda.

## Janela diária e avanço sem leitura na versão 1.6

Testes de relógio controlado cobrem 08:00 inclusivo, 18:00 exclusivo, minutos, virada da meia-noite, janela desativada, validação de horários, retomada automática, pausa manual e fechamento da janela entre READY e VERIFY. A ausência de botão antes do clique registra erro e segue sem contabilizar envio.

O teste de navegador não cria `.message-out` nem indicadores de entrega/leitura. O fluxo real do content script deve avançar apenas com campo limpo ou prévia fechada. A configuração da janela é salva e restaurada na interface; nesse teste de envio ela é desativada para não depender do horário do ambiente. O intervalo entre os dois envios continua sendo medido em relógio real.

## Preenchimento da legenda na versão 1.6.1

Um teste novo falhou no código anterior: a prévia não era encontrada quando o botão começava desabilitado. Depois da correção, a legenda é preenchida antes de exigir o botão habilitado. A suíte também cobre editor recriado por foco ou input, três tentativas em campo vazio sem duplicação, rejeição se o editor descartar todo o texto e colagem de texto simples quando insertText falha.

O teste integrado troca o campo ao receber foco, mantém o botão desabilitado até o input e verifica um único preenchimento aceito, um clique automático e continuidade com delay real. O usuário ainda não forneceu a mensagem exata do novo erro; os testes reproduzem condições concretas do código, mas não identificam definitivamente a causa na conta real.

## Pausas de preparação na versão 1.6.2

O teste integrado atrasa a criação da prévia por 2,2 segundos no primeiro contato e 3,5 segundos no segundo. Registra os horários de paste, input e clique; exige pelo menos 3 segundos antes do input (e pelo menos 3,5 segundos no segundo cenário) e 1,5 segundo entre input e clique. Mantém as verificações de envio único e delay real de 60 segundos entre contatos. O teste de DOM confirma a escolha do campo dentro de media-caption-input-container quando há outro editor na prévia, preservando os demais campos e o texto literal.

## Foco e eventos na versão 1.6.3

A suíte de DOM verifica que campos com parágrafo editável aninhado, campo reutilizado no contêiner de legenda e contenteditable plaintext-only recebem texto literal, um input e um change. O botão no teste só habilita após change. O teste integrado também exige change para liberar o botão e verifica esperas mínimas de 3 segundos antes do input e 1 segundo entre input e clique, mantendo o delay entre contatos. As etapas da fila são testadas contra mensagens de aba incorreta e operação cancelada.

A captura fornecida mostra o campo vazio, mas não contém o DOM ou o estado interno do WhatsApp. Essas correções são verificadas em cenários reproduzidos; o comportamento na conta real permanece não validado neste ambiente.

## Preparação independente do botão na versão 1.6.4

Comparação com abb2aa0 (versão 1.2) confirmou a inserção no editor completo por seleção nativa e insertText. Essa abordagem foi retomada sem restaurar a comparação exata de caracteres removida a pedido do usuário.

O teste de DOM cria foto e campo sem botão e só adiciona Enviar depois de input. O teste integrado usa inicialmente um botão sem aria-label/data-icon de envio; change da legenda torna o botão reconhecível. Ambos exigem preenchimento antes de localizar o botão, preservando os campos de outras conversas. Trata-se de reprodução controlada de uma dependência do código, não de prova de que essa é a causa na conta real.

## Localização do botão na versão 1.6.5

Seis regressões adicionais cobrem rótulos em português/inglês com (Enter), marcador media-send, marcadores aninhados do mesmo controle, botão reutilizado e desabilitação no ancestral/ação de agendamento. As variantes positivas exigem exatamente um controle e um clique. O teste integrado habilita um botão cujo único seletor reconhecível é aria-label="Enviar mensagem (Enter)", exige um clique e mantém a medição do delay entre contatos.

O usuário confirmou que a legenda foi preenchida na versão anterior. Esse fluxo foi preservado. Os testes cobrem causas reproduzíveis de falha na identificação do botão; o seletor exato na conta real ainda não foi inspecionado.

## Alternativa de teclado na versão 1.6.6

Três regressões de DOM verificam uma única sequência keydown/keyup Enter no campo correto, ausência de clique adicional, preservação da legenda e bloqueio diante de botão reconhecido desabilitado ou ambíguo. No teste integrado, o primeiro contato usa botão sem seletor reconhecido e deve enviar com um Enter e zero cliques. O segundo usa um clique reconhecido e zero Enter; o intervalo real e a conclusão automática da fila continuam obrigatórios.

O receptor de teclado do WhatsApp é simulado. Isso não prova que a versão real do usuário aceita eventos sintéticos nem que Enter está configurado para enviar nessa conta. Se a prévia não fechar, o adaptador registra resultado incerto, pausa e não repete a ação.
