# 1.6.6

- Alternativa de envio por Enter no campo da legenda quando nenhum controle de envio é reconhecido após a preparação.
- Atalho único, com foco e cursor no fim do campo; destinatário, prévia, legenda, janela e delay continuam verificados.
- Nenhuma alternativa diante de botão reconhecido desabilitado ou ambíguo; nenhuma repetição após acionar clique ou teclado.
- Relatório distingue clique de atalho; avanço exige fechamento da prévia.
- Diagnóstico com controles habilitados/total e identificadores de ícones, sem conteúdo da mensagem.

# 1.6.5

- Busca do botão ancorada na prévia de mídia já identificada, preservando o preenchimento da legenda.
- Reconhecimento de Enviar/Send mensagem/message, sufixo (Enter), controles acessíveis e marcadores específicos de mídia.
- Deduplicação de ícone, marcador e contêiner de um mesmo botão; suporte a botão reutilizado dentro do painel de mídia.
- Respeito a desabilitação no ancestral e rejeição de ações de agendamento/controles ambíguos.
- Regressões de seletores, clique único e avanço da fila com delay.

# 1.6.4

- Preparação da legenda independente da identificação do botão Enviar: novo detector de imagem + campo, com rejeição de prévias ambíguas.
- Restaurada a inserção nativa da versão 1.2 no editor completo, sem deleteContents nem seleção restrita ao parágrafo.
- Mantidos input/change, colagem da imagem, agendamento, intervalos, validação não vazia e confirmação após clique.
- Regressão integrada: o botão só passa a ter seletor reconhecível depois do evento change da legenda.

# 1.6.3

- Foco no editor e cursor dentro do parágrafo vazio antes de insertText; emissão de change no editor atual após a notificação input.
- Reconhecimento de campos aninhados, contenteditable plaintext-only e campo reutilizado dentro do contêiner explícito de legenda.
- Esperas mínimas de 3 segundos após imagem e 1 segundo após legenda; botão habilitado, delay e janela continuam obrigatórios antes do clique.
- Etapas de preparação exibidas no aviso da fila e protegidas pelo token/aba da operação.
- Regressões para botão habilitado somente por change, foco em parágrafo e editores reutilizados/aninhados.

# 1.6.2

- Espera mínima de 3 segundos após colar a imagem e confirmação de estabilidade da prévia antes de preencher a legenda.
- Espera adicional de 1,5 segundo após preencher a legenda, mantendo a exigência de botão habilitado e autorização da fila.
- Prioridade para o campo dentro de media-caption-input-container na prévia; outros editores da conversa não são alterados.
- Testes de abertura da prévia em 2,2 e 3,5 segundos, medição dos intervalos de colagem/input/clique e seleção do campo específico.

# 1.6.1

- Separada a localização da prévia/campo de legenda da disponibilidade do botão Enviar, corrigindo a dependência circular quando o botão começa desabilitado.
- Reaquisição do campo após foco e até três tentativas limitadas em campo vazio quando a interface substitui ou descarta o editor.
- Colagem de texto simples como alternativa quando insertText não está disponível; texto já preenchido não é duplicado.
- O botão precisa estar habilitado antes do clique. Agendamento, delay, legenda não vazia e avanço após fechamento permanecem.
- Testes de regressão com botão desabilitado, troca de campo ao focar/digitar, descarte persistente e alternativa de colagem.

# 1.6.0

- Avanço após clique e limpeza do campo ou fechamento da prévia de mídia, sem aguardar mensagem no histórico, entrega ou leitura.
- Janela diária configurável, inicialmente 08:00–18:00, usando o fuso local do computador. Suporte a minutos e janelas que atravessam a meia-noite.
- Horários persistidos, retomada automática com Chrome aberto e validação antes da autorização final de envio; delay e pausas de lote preservados.
- Botão ausente antes do clique registra erro e continua a fila; clique sem limpeza/fechamento permanece incerto.
- Testes de limites da janela, retomada, pausa manual, ausência de botão e fluxo de envio sem seletor de mensagem de saída nem tiques.

# 1.5.0

- Substituída a comparação exata da legenda pela presença de conteúdo, conforme solicitado. Diferenças de caracteres não bloqueiam o clique.
- Campo vazio continua impedindo o envio quando há legenda configurada; campanhas de foto sem legenda continuam suportadas.
- A confirmação da mensagem de saída usa o texto efetivamente preenchido, permitindo que a fila avance mesmo com diferenças aceitas.
- Mantidas confirmação do destinatário, prévia única, foto, autorização da fila, delay e prevenção de reenvio incerto.
- Teste integrado altera a legenda antes do clique e exige envio único, confirmação e avanço automático ao segundo contato após o delay.

# 1.4.0

- Corrigida leitura de emojis como imagens em legendas com linhas mistas (`texto<div>linha</div>`), linhas vazias, links e parágrafos.
- Comparação tolera apenas normalização Unicode e apresentação de emoji, preservando texto, URLs e quebras de linha.
- Preenchimento mantém input nativo e emite evento de apoio somente se necessário; confere o editor conectado após atualização da interface.
- Suporte a marcador de envio sem ancestral button/role, limitado à prévia de mídia selecionada.
- Diagnóstico de divergência com comprimentos e primeira posição diferente; sem enviar texto incorreto nem registrar conteúdo no diagnóstico.
- Regressão integrada com emoji-imagem, editor/botão recriados, envio automático único e próximo contato após delay.

# 1.3.0

- Corrigida interrupção antes do clique quando o botão ou a imagem são recriados durante a edição da legenda; os elementos atuais são localizados novamente e conferidos.
- Próxima conversa aberta imediatamente após confirmar a mensagem anterior. A autorização de envio aguarda o delay persistido no worker, incluindo a pausa de lote.
- Contagem regressiva informa o próximo envio; o watchdog considera o intervalo de espera.
- Regressões para botão recriado, bloqueio antes do horário permitido e pausa durante o delay.

# 1.2.0

- Foto preparada por colagem no campo da conversa, substituindo a alteração do input de arquivo.
- Preenchimento e conferência da legenda antes de um único clique automático no envio da mídia.
- Reconhecimento de campos de legenda já existentes, mas ocultos antes da colagem.
- Teste de colagem com arquivo e avanço automático para o segundo contato após o intervalo real entre lotes.
- A confirmação de saída mantém o delay e a continuidade da fila; resultados incertos não são reenviados.

# 1.1.0

- Reconhecimento da prévia de foto com imagem, canvas e fundo CSS; suporte aos novos ícones de envio e ao layout dentro de `#main/footer`.
- Novo módulo `whatsapp-dom.js` carregado antes do content script. A seleção parte dos elementos novos da operação, não de qualquer imagem ou botão já existente na conversa.
- Operação única de foto com `media` e `caption`, legenda multiline e emojis, sem segundo envio de texto.
- Até três tentativas automáticas para falhas confirmadas de preparação da foto, com backoff; ao esgotar, registrar erro e continuar a lista.
- Continuidade automática dos lotes; a interface diferencia espera programada de pausa manual.
- Envio incerto, falta de confirmação do destinatário e perda de sessão permanecem interrupções explícitas.
- Testes adicionais de DOM, recuperação e dois lotes consecutivos com intervalo real.
