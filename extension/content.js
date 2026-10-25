// Operates only the visible interface; never accesses private WhatsApp APIs.
(async()=>{
 const rpc=async(type,extra={})=>{const r=await chrome.runtime.sendMessage({type,...extra});if(!r?.ok)throw Error(r?.error||'Extensão indisponível.');return r.data;};
 let job;try{job=await rpc('JOB');}catch{return;}if(!job)return;
 const dom=globalThis.ContatoWhatsAppDOM;
 if(!dom)return;
 // One job contains either text OR an image with its caption, never two sends.
 if(job.message?.type==='image'){job.media=job.message.media;job.text=job.message.caption;}else if(job.message?.type==='text'){job.media=null;job.text=job.message.text;}
 let clicked=false,previewBaseline;
 const failure=(code,message)=>Object.assign(new Error(message),{code});
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const {normalize,visible}=dom;
 function identity(main){
  const header=main.querySelector('header');if(!header)return false;
  const labels=[header.innerText,...[...header.querySelectorAll('[title]')].map(e=>e.title)];
  if(labels.some(t=>t.replace(/\D/g,'')===job.phone))return true;
  return [...main.querySelectorAll('[data-id]')].some(e=>new RegExp('^(?:true|false)_'+job.phone+'@(?:c\\.us|s\\.whatsapp\\.net)_').test(e.getAttribute('data-id')));
 }
 function surface(){
  const params=new URL(location.href).searchParams;
  // WhatsApp may consume /send and replace it with /. Identity remains required.
  if(params.has('phone')&&params.get('phone')!==job.phone)return null;
  const main=document.querySelector('#main');if(!visible(main))return null;
  const box=main.querySelector('footer [contenteditable="true"][role="textbox"]')||main.querySelector('footer [contenteditable="true"]');
  if(!visible(box)||!identity(main))return null;
  // Never overwrite an unrelated draft; photo captions are entered in the preview.
  if(normalize(box.innerText)!==normalize(job.media?'':job.text))return null;
  const button=dom.sendButtons(main.querySelector('footer')||main)[0];
  return {main,box,button,header:main.querySelector('header')?.innerText};
 }
 function mediaPreview(allowDisabled=false){return previewBaseline?dom.preview(previewBaseline,{allowDisabled}):null;}
 async function preparePhoto(view){
  await rpc('STAGE',{token:job.token,stage:'paste'});
  previewBaseline=dom.snapshot();
  const bytes=Uint8Array.from(atob(job.media.base64),c=>c.charCodeAt(0));
  const file=new File([bytes],job.media.name,{type:job.media.type});
  // Paste the photo into the conversation so WhatsApp creates its caption editor.
  // No system clipboard access and no separate text message.
  const transfer=new DataTransfer();transfer.items.add(file);
  view.box.focus();
  view.box.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,composed:true,clipboardData:transfer}));
  // Minimum transition time, followed by a live check of the media editor.
  await rpc('STAGE',{token:job.token,stage:'preview'});
  await sleep(3000);
  let preview,stableSince=0,stable=false;const deadline=Date.now()+35000;
  while(Date.now()<deadline){
   const current=dom.mediaDraft(previewBaseline);
   if(current&&current.caption===preview?.caption&&current.image===preview?.image){if(Date.now()-stableSince>=500){preview=current;stable=true;break;}}
   else{preview=current;stableSince=Date.now();}
   await sleep(250);
  }
  if(!preview||!stable)throw failure('MEDIA_PREVIEW_TIMEOUT','A prévia da foto não ficou pronta. Nenhum envio acionado. '+dom.diagnostics(previewBaseline));
  await rpc('STAGE',{token:job.token,stage:'caption'});
  await dom.setCaption(preview.caption,job.text,()=>dom.mediaDraft(previewBaseline)?.caption);
  await sleep(1000); // Let the caption input event settle before authorizing a send.
  await rpc('STAGE',{token:job.token,stage:'button'});
  const sendDeadline=Date.now()+15000;
  while(Date.now()<sendDeadline){const ready=mediaPreview();if(ready&&dom.captionReady(ready.caption,job.text))return ready;await sleep(250);}
  throw failure('SEND_BUTTON_NOT_FOUND','Legenda preparada, mas não foi possível identificar um botão de envio único e habilitado. Nenhum envio acionado. '+dom.diagnostics(previewBaseline));
 }
 try{
  let view;const deadline=Date.now()+65000;
  while(Date.now()<deadline){view=surface();if(view)break;await sleep(500);}
  if(!view)throw Error('Não foi possível confirmar destinatário e texto. Verifique login, número e interface; nenhuma mensagem foi acionada.');
  let preview;if(job.media)preview=await preparePhoto(view);
  if(!job.media){
   const until=Date.now()+5000;
   while(Date.now()<until&&!surface()?.button)await sleep(250);
   if(!surface()?.button)throw failure('SEND_BUTTON_NOT_FOUND','Botão de envio não encontrado. Contato ignorado sem enviar.');
  }
  // The next conversation opens immediately; sending remains gated by the worker.
  if(Date.now()<(job.notBefore||0))await rpc('STAGE',{token:job.token,stage:'delay'});
  while(Date.now()<(job.notBefore||0))await sleep(Math.min(60000,job.notBefore-Date.now()));
  while(true){
   if(await rpc('READY',{token:job.token})&&await rpc('VERIFY',{token:job.token}))break;
   await sleep(60000);
  }
  if(!view.main.isConnected||!identity(view.main))throw Error('A conversa mudou antes do envio.');
  let button;
  if(job.media){
   const current=mediaPreview();if(!current&&!dom.sendButtons().length)throw failure('SEND_BUTTON_NOT_FOUND','Botão de envio não encontrado. Contato ignorado sem enviar.');if(!current||dom.signature(current.image)!==dom.signature(preview.image)||!dom.captionReady(current.caption,job.text))throw Error('A foto ou a legenda mudou antes do envio.');
   preview=current;button=current.button;
  }else{
   const current=surface();if(current&&!current.button)throw failure('SEND_BUTTON_NOT_FOUND','Botão de envio não encontrado. Contato ignorado sem enviar.');if(!current||current.main!==view.main||current.box!==view.box)throw Error('A conversa mudou antes do envio.');button=current.button;
  }
  clicked=true;button.click();
  const end=Date.now()+20000;
  while(Date.now()<end){
   if(!view.main.isConnected||!identity(view.main))throw Error('Conversa alterada após o clique. Confira o envio manualmente.');
   const cleared=job.media?!visible(preview.caption)&&!mediaPreview(true):!normalize(view.box.innerText);
   if(cleared){
    await rpc('RESULT',{token:job.token,status:'submitted',detail:job.media?'Clique de envio realizado e prévia da foto fechada. Não confirma entrega nem leitura.':'Clique de envio realizado e campo de texto limpo. Não confirma entrega nem leitura.'});return;
   }
   await sleep(300);
  }
  throw Error('Clique realizado, mas sem confirmação visual inequívoca. Não será repetido automaticamente.');
 }catch(e){try{await rpc('RESULT',{token:job.token,status:clicked?'uncertain':'error',clicked,code:e.code||'ADAPTER_ERROR',detail:e.message});}catch{/* An old, cancelled job cannot change the current campaign. */}}
})();
