import {chromium} from 'playwright-core';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile('extension/whatsapp-dom.js','utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let passed=0;
try {
 const page=await browser.newPage();
 const image='data:image/png;base64,'+(await readFile('extension/icons/128.png')).toString('base64');
 for (const shape of ['legacy','main-footer','canvas','background','textarea','revealed-editor']) {
  await page.setContent('<main id="main"><header>+5511999999999</header><div class="message-out"><img width="128" height="128"><span>Old caption</span></div><footer id="old"><div contenteditable="true">Existing draft</div><button aria-label="Enviar">Send old</button></footer></main>');
  await page.addScriptTag({content:source});
  await page.evaluate(shape=>{if(shape==='revealed-editor'){const e=document.createElement('textarea');e.id='reused';e.style.display='none';document.body.append(e);}window.baseline=ContatoWhatsAppDOM.snapshot();},shape);
  await page.evaluate(({shape,image})=>{
   const root=document.createElement('section');root.id='media';root.setAttribute('role','dialog');
   const visual=shape==='canvas'?'<canvas width="180" height="160"></canvas>':shape==='background'?`<div style="width:180px;height:160px;background-image:url(${image})"></div>`:`<img width="180" height="160" src="${image}">`;
   const editor=shape==='textarea'?'<textarea aria-label="Adicionar legenda"></textarea>':'<div contenteditable="true" data-lexical-editor="true" role="textbox" style="min-height:30px"></div>';
   const send=shape==='legacy'?'<button><span data-icon="send">Enviar</span></button>':shape==='canvas'?'<div role="button" aria-label="Enviar"><span data-icon="wds-ic-send-filled"></span></div>':'<button aria-label="Send">Send</button>';
   root.innerHTML=visual+(shape==='revealed-editor'?'':editor)+send;
   if(shape==='revealed-editor'){const e=document.querySelector('#reused');e.style.display='block';root.append(e);}
   if(shape==='main-footer')document.querySelector('#main footer').append(root);else document.body.append(root);
  },{shape,image});
  await page.waitForFunction(()=>!!ContatoWhatsAppDOM.preview(window.baseline));
  const caption='🚨 Oferta de hoje\nDe R$ 22,48 por R$ 17,32\nhttps://example.com/item?a=1&b=2';
  await page.evaluate(async caption=>{const p=ContatoWhatsAppDOM.preview(window.baseline);await ContatoWhatsAppDOM.setCaption(p.caption,caption);},caption);
  assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.text(ContatoWhatsAppDOM.preview(window.baseline).caption)),caption);
  assert.equal(await page.locator('#old > [contenteditable]').innerText(),'Existing draft');
  passed++;console.log('PASS detector + caption:',shape);
 }
 // Existing media/chat send buttons and a second competing preview must not be selected.
 await page.evaluate(({image})=>{const r=document.createElement('section');r.innerHTML=`<img width="180" height="160" src="${image}"><div contenteditable="true" style="height:30px"></div><button aria-label="Enviar">Send</button>`;document.body.append(r);},{image});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.preview(window.baseline)),null);passed++;console.log('PASS ambiguity is rejected');
 // WhatsApp emoji images mixed with browser-generated editable line blocks.
 for(const [html,expected] of [
  ['<img alt="🚨"> Oferta<div>Preço R$ 17,32</div><div><br></div><div><a href="https://example.com">https://example.com</a></div>','🚨 Oferta\nPreço R$ 17,32\n\nhttps://example.com'],
  ['<p><img alt="✨"> Luz<br>Segunda linha</p><p>Fim</p>','✨ Luz\nSegunda linha\nFim'],
  ['<div><span><img alt="🛒"> Compre</span></div><div><span>agora</span></div>','🛒 Compre\nagora'],
 ]){
  await page.setContent('<div id="caption" contenteditable="true"></div>');
  await page.addScriptTag({content:source});
  await page.locator('#caption').evaluate((e,html)=>e.innerHTML=html,html);
  assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.text(document.querySelector('#caption'))),expected);
  passed++;console.log('PASS emoji images + structural line breaks');
 }
 // Requested policy accepts different nonempty content; empty captions are blocked.
 await page.setContent('<div id="caption" contenteditable="true"></div><div id="action" data-testid="send"><span data-icon="send">Enviar</span></div>');
 await page.addScriptTag({content:source});
 assert.deepEqual(await page.evaluate(()=>ContatoWhatsAppDOM.sendButtons().map(e=>e.id)),['action']);passed++;console.log('PASS data-testid send without a role wrapper');
 await page.locator('#caption').fill('☀ Oferta 👩‍💻\nhttps://example.com/item');
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.captionReady(document.querySelector('#caption'),'☀️ Oferta 👩‍💻\nhttps://example.com/item')),true);
 for(const wrong of ['☀ Oferta 👩💻\nhttps://example.com/item','☀ Oferta 👩‍💻\nhttps://example.com/other','☀ Oferta','☀ Oferta 👩‍💻 https://example.com/item'])assert.equal(await page.evaluate(wrong=>ContatoWhatsAppDOM.captionReady(document.querySelector('#caption'),wrong),wrong),true);
 passed++;console.log('PASS nonempty caption accepted even when content or length differs');
 await page.locator('#caption').fill('   ');
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.captionReady(document.querySelector('#caption'),'Mensagem')),false);
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.captionReady(document.querySelector('#caption'),'')),true);
 // Simulate a framework discarding the text and replacing the editor after input.
 await page.locator('#caption').fill('');
 const rejected=await page.evaluate(async()=>{
  const editor=document.querySelector('#caption');const discard=e=>{if(e.target.id==='caption')e.target.replaceWith(e.target.cloneNode(false));};document.addEventListener('input',discard);window.stopDiscard=()=>document.removeEventListener('input',discard);
  try{await ContatoWhatsAppDOM.setCaption(editor,'Mensagem completa',()=>document.querySelector('#caption'));return false;}catch(e){return e.code==='CAPTION_EMPTY';}finally{window.stopDiscard();}
 });assert.equal(rejected,true);passed++;console.log('PASS discarded caption blocks sending despite detached editor retaining text');
 // Exercise the fallback input notification without emitting a duplicate native event.
 const fallback=await page.evaluate(async()=>{
  const editor=document.querySelector('#caption');let events=0;editor.addEventListener('input',()=>events++);
  const original=document.execCommand;document.execCommand=(_,__,value)=>{editor.textContent=value;return true;};
  try{await ContatoWhatsAppDOM.setCaption(editor,'Texto sem HTML <b>literal</b>');return {events,text:editor.textContent,html:!!editor.querySelector('b')};}finally{document.execCommand=original;}
 });assert.deepEqual(fallback,{events:1,text:'Texto sem HTML <b>literal</b>',html:false});passed++;console.log('PASS fallback input event and literal text');
 await page.setContent('<main><div contenteditable="true">Conversa</div></main>');await page.addScriptTag({content:source});
 const disabledPreview=await page.evaluate(()=>{
  window.baseline=ContatoWhatsAppDOM.snapshot();const dialog=document.createElement('section');
  dialog.innerHTML='<canvas width="180" height="160"></canvas><div contenteditable="true" style="min-height:30px"></div><button aria-label="Enviar" disabled>Enviar</button>';document.body.append(dialog);
  return !!ContatoWhatsAppDOM.preview(window.baseline,{allowDisabled:true});
 });assert.equal(disabledPreview,true);assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.preview(window.baseline)),null);
 await page.evaluate(async()=>{
  const p=ContatoWhatsAppDOM.preview(window.baseline,{allowDisabled:true});
  p.caption.addEventListener('input',()=>{p.button.disabled=false;},{once:true});
  await ContatoWhatsAppDOM.setCaption(p.caption,'Legenda',()=>ContatoWhatsAppDOM.preview(window.baseline,{allowDisabled:true})?.caption);
 });assert.equal(await page.evaluate(()=>!!ContatoWhatsAppDOM.preview(window.baseline)),true);passed++;console.log('PASS caption can be filled while send is disabled');
 for(const eventName of ['focus','input']){
  await page.setContent('<div id="caption" contenteditable="true" style="min-height:30px"></div>');await page.addScriptTag({content:source});
  await page.evaluate(async eventName=>{
   const e=document.querySelector('#caption');e.addEventListener(eventName,()=>e.replaceWith(e.cloneNode(false)),{once:true});
   await ContatoWhatsAppDOM.setCaption(e,'🚨 Legenda completa',()=>document.querySelector('#caption'));
  },eventName);
  assert.equal(await page.locator('#caption').innerText(),'🚨 Legenda completa');passed++;console.log('PASS recovers empty editor replaced on '+eventName+' without duplicated text');
 }
 await page.setContent('<div id="caption" contenteditable="true"></div>');await page.addScriptTag({content:source});
 const pasted=await page.evaluate(async()=>{
  const e=document.querySelector('#caption');let count=0;e.addEventListener('paste',event=>{event.preventDefault();count++;e.textContent=event.clipboardData.getData('text/plain');e.dispatchEvent(new InputEvent('input',{bubbles:true}));});
  const original=document.execCommand;document.execCommand=()=>false;
  try{await ContatoWhatsAppDOM.setCaption(e,'Texto <b>literal</b>');return {count,text:e.textContent,html:!!e.querySelector('b')};}finally{document.execCommand=original;}
 });assert.deepEqual(pasted,{count:1,text:'Texto <b>literal</b>',html:false});passed++;console.log('PASS plain-text paste fallback when insertText is unavailable');
 await page.setContent('<div id="chat" contenteditable="true">Rascunho da conversa</div>');await page.addScriptTag({content:source});
 const captionTarget=await page.evaluate(async()=>{
  const before=ContatoWhatsAppDOM.snapshot(),section=document.createElement('section');
  section.innerHTML='<canvas width="180" height="160"></canvas><div id="other" contenteditable="true">Outro editor</div><div data-testid="media-caption-input-container"><div id="media-caption" contenteditable="true" style="min-height:30px"><p><br></p></div></div><button aria-label="Enviar">Enviar</button>';document.body.append(section);
  const p=ContatoWhatsAppDOM.preview(before);await ContatoWhatsAppDOM.setCaption(p.caption,'Oferta <b>literal</b>');return p.caption.id;
 });assert.equal(captionTarget,'media-caption');assert.equal(await page.locator('#chat').innerText(),'Rascunho da conversa');assert.equal(await page.locator('#other').innerText(),'Outro editor');assert.equal(await page.locator('#media-caption b').count(),0);passed++;console.log('PASS explicit media caption container selected without touching other editors');
 for(const shape of ['nested-paragraph','reused-caption','plaintext']){
  await page.setContent('<div id="reused" contenteditable="true" style="min-height:30px"></div>');await page.addScriptTag({content:source});
  const result=await page.evaluate(async shape=>{
   const before=ContatoWhatsAppDOM.snapshot(),section=document.createElement('section');
   section.innerHTML='<canvas width="180" height="160"></canvas><div data-testid="media-caption-input-container"></div><button aria-label="Enviar" disabled>Enviar</button>';document.body.append(section);
   const container=section.querySelector('[data-testid]');
   if(shape==='reused-caption')container.append(document.querySelector('#reused'));
   else container.innerHTML=shape==='nested-paragraph'?'<div contenteditable="true"><p contenteditable="true" style="min-height:30px"><br></p></div>':'<div contenteditable="plaintext-only" style="min-height:30px"></div>';
   let inputs=0,changes=0;container.addEventListener('input',()=>inputs++);container.addEventListener('change',()=>{changes++;section.querySelector('button').disabled=false;});
   const preview=()=>ContatoWhatsAppDOM.preview(before,{allowDisabled:true});const p=preview();
   await ContatoWhatsAppDOM.setCaption(p.caption,'Legenda <b>literal</b>',()=>preview()?.caption);
   return {text:ContatoWhatsAppDOM.text(preview().caption),inputs,changes,ready:!!ContatoWhatsAppDOM.preview(before)};
  },shape);
  assert.deepEqual(result,{text:'Legenda <b>literal</b>',inputs:1,changes:1,ready:true});passed++;console.log('PASS focused caption + input/change:',shape);
 }
 await page.setContent('<footer><div id="draft" contenteditable="true">Não alterar</div><button aria-label="Enviar">Outro envio</button></footer>');await page.addScriptTag({content:source});
 const independent=await page.evaluate(async()=>{
  const before=ContatoWhatsAppDOM.snapshot(),section=document.createElement('section');
  section.innerHTML='<canvas width="180" height="160"></canvas><div contenteditable="true" style="min-height:30px"><p><br></p></div>';document.body.append(section);
  const draft=ContatoWhatsAppDOM.mediaDraft(before),beforeSend=ContatoWhatsAppDOM.preview(before);
  draft.caption.addEventListener('input',()=>{const send=document.createElement('button');send.setAttribute('aria-label','Enviar');send.textContent='Enviar';section.append(send);},{once:true});
  await ContatoWhatsAppDOM.setCaption(draft.caption,'Legenda restaurada',()=>ContatoWhatsAppDOM.mediaDraft(before)?.caption);
  return {beforeSend:beforeSend===null,text:ContatoWhatsAppDOM.text(draft.caption),ready:!!ContatoWhatsAppDOM.preview(before)};
 });assert.deepEqual(independent,{beforeSend:true,text:'Legenda restaurada',ready:true});assert.equal(await page.locator('#draft').innerText(),'Não alterar');passed++;console.log('PASS caption preparation independent of send button discovery');
 for(const control of [
  '<div aria-label="Enviar mensagem (Enter)" tabindex="0">Enviar</div>',
  '<button aria-label="Send message (Enter)">Send</button>',
  '<div data-testid="media-send"><span data-icon="send">Enviar</span></div>',
  '<div role="button"><span data-testid="send"><span data-icon="send">Enviar</span></span></div>'
 ]){
  await page.setContent('<footer><div contenteditable="true">Outro rascunho</div><button aria-label="Enviar">Enviar conversa</button></footer>');await page.addScriptTag({content:source});
  const result=await page.evaluate(control=>{
   const before=ContatoWhatsAppDOM.snapshot(),panel=document.createElement('section');
   panel.innerHTML='<canvas width="180" height="160"></canvas><div contenteditable="true">Legenda</div>'+control;document.body.append(panel);
   let clicks=0;panel.lastElementChild.addEventListener('click',()=>clicks++);
   const p=ContatoWhatsAppDOM.preview(before);p?.button.click();return {found:!!p,clicks,count:ContatoWhatsAppDOM.sendButtons(panel).length};
  },control);assert.deepEqual(result,{found:true,clicks:1,count:1});passed++;console.log('PASS media send label/marker variant and unique click');
 }
 await page.setContent('<footer><div contenteditable="true">Rascunho</div><button aria-label="Enviar">Enviar conversa</button></footer><section id="panel"><button id="reuse" aria-label="Enviar">Enviar mídia</button></section>');await page.addScriptTag({content:source});
 const reused=await page.evaluate(()=>{
  const before=ContatoWhatsAppDOM.snapshot(),panel=document.querySelector('#panel');panel.insertAdjacentHTML('afterbegin','<canvas width="180" height="160"></canvas><div contenteditable="true">Legenda</div>');
  const p=ContatoWhatsAppDOM.preview(before);return p?.button.id;
 });assert.equal(reused,'reuse');passed++;console.log('PASS reused media send button distinguished from original chat send');
 await page.setContent('<div aria-disabled="true"><div role="button" aria-label="Enviar mensagem">Enviar</div></div><button aria-label="Agendar envio">Agendar</button>');await page.addScriptTag({content:source});
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.sendButtons().length),0);passed++;console.log('PASS disabled ancestor and scheduled-send control are not clicked');
 await page.setContent('<footer><button aria-label="Enviar">Outro envio</button></footer>');await page.addScriptTag({content:source});
 const keyboard=await page.evaluate(()=>{
  window.beforeKeyboard=ContatoWhatsAppDOM.snapshot();const panel=document.createElement('section');panel.id='keyboard-panel';panel.innerHTML='<canvas width="180" height="160"></canvas><div contenteditable="true">Legenda pronta</div><div role="button"><svg><path></path></svg></div>';document.body.append(panel);
  const draft=ContatoWhatsAppDOM.keyboardPreview(window.beforeKeyboard);let down=0,up=0,clicks=0;
  panel.addEventListener('click',()=>clicks++);draft.caption.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.keyCode===13){e.preventDefault();down++;}});draft.caption.addEventListener('keyup',()=>up++);
  ContatoWhatsAppDOM.pressEnter(draft.caption);return {down,up,clicks,text:ContatoWhatsAppDOM.text(draft.caption),focused:document.activeElement===draft.caption};
 });assert.deepEqual(keyboard,{down:1,up:1,clicks:0,text:'Legenda pronta',focused:true});passed++;console.log('PASS unknown send marker uses one Enter in the media caption');
 await page.evaluate(()=>{const button=document.createElement('button');button.id='disabled-send';button.disabled=true;button.setAttribute('aria-label','Enviar');document.querySelector('#keyboard-panel').append(button);});
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.keyboardPreview(window.beforeKeyboard)),null);passed++;console.log('PASS Enter fallback cannot bypass a recognized disabled send button');
 await page.evaluate(()=>{const button=document.querySelector('#disabled-send');button.disabled=false;button.after(button.cloneNode(true));});
 assert.equal(await page.evaluate(()=>ContatoWhatsAppDOM.keyboardPreview(window.beforeKeyboard)),null);passed++;console.log('PASS Enter fallback rejects ambiguous send controls');
 console.log(`${passed} regressões de DOM passaram.`);
}finally{await browser.close();}
