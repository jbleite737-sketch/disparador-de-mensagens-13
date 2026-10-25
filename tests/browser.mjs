import 'fake-indexeddb/auto';
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {resolve,join,extname} from 'node:path';import {createServer} from 'node:http';import ExcelJS from 'exceljs';
// Managed Chromium forbids unpacked extensions. Exercise real UI/content/background
// code with simulated chrome.* boundaries; never modify administrative policy.
const ext=resolve('extension'),temp=await mkdtemp(join(tmpdir(),'contato-flow-test-'));await mkdir('artifacts',{recursive:true});
const server=createServer(async(req,res)=>{try{const path=resolve(ext,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(ext+'/'))throw Error('path');const b=await readFile(path);res.writeHead(200,{'Content-Security-Policy':"script-src 'self'; object-src 'none'",'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]||'text/plain'});res.end(b);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
let data={},receiver,onAlarm,removed,nextId=1,passed=0;const tabs=new Map(),timers=new Map(),mediaJobs=[],mediaResults=[];const pass=s=>{passed++;console.log('PASS',s);};
const contentSource=(await readFile('extension/whatsapp-dom.js','utf8'))+'\n'+(await readFile('extension/content.js','utf8'));
globalThis.chrome={runtime:{id:'test',getURL:p=>base+p,onMessage:{addListener:f=>receiver=f},onStartup:{addListener:()=>{}}},storage:{local:{get:async()=>structuredClone(data),set:async v=>{const old=data;data={...data,...structuredClone(v)};for(const p of context.pages())if(p.url().startsWith(base))await p.evaluate(change=>window.__storageChange?.(change),{campaign:{oldValue:old.campaign,newValue:data.campaign}}).catch(()=>{});}}},action:{onClicked:{addListener:()=>{}}},alarms:{create:async(n,a)=>{clearTimeout(timers.get(n));const ms=Math.max(0,a.when-Date.now());timers.set(n,setTimeout(()=>onAlarm({name:n}),ms));},clear:async n=>{clearTimeout(timers.get(n));timers.delete(n);},onAlarm:{addListener:f=>onAlarm=f}},tabs:{get:async id=>{if(!tabs.has(id))throw Error('no tab');return{id};},create:async({url})=>{const page=await context.newPage();const id=nextId++;tabs.set(id,page);page.on('close',()=>{tabs.delete(id);removed?.(id);});await page.goto(url);return{id};},update:async(id,{url})=>{const p=tabs.get(id);await p.goto(url);await p.addScriptTag({content:contentSource});return{id};},onRemoved:{addListener:f=>removed=f}}};
await import('../extension/background.js?browser');
await context.exposeBinding('extensionRPC',async({page},m)=>{
 if(m.type==='RESULT'&&m.status==='submitted'&&data.campaign.media){mediaResults.push(await page.evaluate(()=>({at:Date.now(),pasteAt:window.pasteAt,inputAt:window.inputAt,clickAt:window.clickAt,clicks:window.mediaClicks,inputs:window.inputCount,changes:window.changeCount,pastes:window.pasteCount,name:window.uploadedName,caption:document.querySelector('.simulated-output').innerText.trim(),images:document.querySelectorAll('.simulated-output img').length})));}
 if(m.type==='SAVE'&&m.media){
  const bytes=await page.evaluate(async id=>{const {readAsset}=await import('/media.js');return [...new Uint8Array(await (await readAsset(id)).arrayBuffer())];},m.media.id);
  await new Promise((resolve,reject)=>{const r=indexedDB.open('contato-flow-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>{const db=r.result,tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(new File([new Uint8Array(bytes)],m.media.name,{type:m.media.type}),m.media.id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 }
 return new Promise(resolve=>{const tab=[...tabs].find(([,p])=>p===page);receiver(m,{id:'test',url:page.url(),...(tab?{tab:{id:tab[0]}}:{})},response=>{if(m.type==='JOB'&&response?.data?.message?.type==='image')mediaJobs.push({phone:response.data.phone,message:response.data.message,at:Date.now()});resolve(response);});});
});
await context.addInitScript(()=>{window.chrome={runtime:{sendMessage:m=>window.extensionRPC(m)},storage:{onChanged:{addListener:f=>{window.__storageChange=c=>f(c,'local');}}}};});
try{
 await context.route('https://web.whatsapp.com/**',async route=>{
  const u=new URL(route.request().url());const payload=JSON.stringify({phone:u.searchParams.get('phone')||'',message:u.searchParams.get('text')||''}).replace(/</g,'\\u003c');
  await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body><div id="main"><header><span id="identity"></span></header><div id="history"></div><footer><div contenteditable="true" role="textbox" style="min-height:30px"></div><button aria-label="Enviar"><span data-icon="send">Enviar</span></button></footer></div><script>const p=${payload}; document.querySelector('#identity').textContent='+'+p.phone; document.querySelector('[contenteditable]').textContent=p.message; document.querySelector('button').onclick=()=>{const d=document.createElement('div'); d.className='simulated-output';d.textContent=p.message;document.querySelector('#history').append(d);document.querySelector('[contenteditable]').textContent='';};</script></body></html>`});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'app.html');
 await page.getByText('Uma boa mensagem.').waitFor();pass('Interface real no Chromium (chrome.* simulado)');
 const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Clientes');sheet.addRow(['Nome','Telefone','Empresa']);sheet.addRow(['Ana','+5511999999999','Acme']);sheet.addRow(['Ana duplicada','11999999999','Acme']);sheet.addRow(['Bruno','+5521999999999','Norte']);sheet.addRow(['Inválido','abc','']);const file=join(temp,'contatos.xlsx');await workbook.xlsx.writeFile(file);
 await page.locator('#file').setInputFiles(file);await page.locator('#mapping').waitFor({state:'visible'});await page.locator('#import').click();assert.equal(await page.locator('#total').textContent(),'2');assert.match(await page.locator('#import-result').textContent(),/1 duplicados.*1 linhas/);pass('Excel real importa, deduplica e identifica linha inválida');
 await page.locator('#template').fill('Olá, {{nome}}! Novidades da {{empresa}}.');assert.match(await page.locator('#preview-text').textContent(),/Olá, Ana! Novidades da Acme/);await page.locator('#next').click();assert.match(await page.locator('#preview-text').textContent(),/Bruno/);pass('Prévia personaliza campos e navega entre contatos');
 await page.locator('#windowEnabled').uncheck();await page.locator('#consent').check();await page.locator('#save').click();await page.waitForTimeout(200);await page.reload();await page.waitForFunction(()=>document.querySelector('#total').textContent==='2');assert.equal(await page.locator('#template').inputValue(),'Olá, {{nome}}! Novidades da {{empresa}}.');assert.equal(await page.locator('#windowEnabled').isChecked(),false);assert.equal(await page.locator('#windowStart').inputValue(),'08:00');assert.equal(await page.locator('#windowEnd').inputValue(),'18:00');pass('Rascunho e configuração da janela preservados após recarregar');
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'artifacts/interface.png',fullPage:true});
 await page.locator('#start').click();await page.locator('#accept-confirm').click();
 await page.waitForFunction(()=>document.querySelector('#submitted').textContent==='1',{},{timeout:20000});pass('Background real → aba simulada → content script real → clique → resultado');
 await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#state').textContent==='Pausada');pass('Pausa cancela próximo envio');
 const reportPromise=page.waitForEvent('download');await page.locator('#export').click();const report=await reportPromise;assert.match(report.suggestedFilename(),/relatorio/);pass('Relatório CSV baixado');
 await context.unroute('https://web.whatsapp.com/**');
 await context.route('https://web.whatsapp.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<div id="main"><header>+5531999999999</header><footer><div contenteditable="true" role="textbox">Olá, Bruno! Novidades da Norte.</div><button aria-label="Enviar" onclick="window.didClick=true"><span data-icon="send">Enviar</span></button></footer></div>'}));
 await page.locator('#start').click();await page.locator('#accept-confirm').click();await page.waitForTimeout(2500);
 const wa=[...tabs.values()][0];assert.equal(await wa.evaluate(()=>!!window.didClick),false);onAlarm({name:'watchdog'});
 await page.waitForFunction(()=>document.querySelector('#state').textContent==='Pausada');assert.equal(await page.locator('#issues').textContent(),'1');pass('Número diferente não recebe clique; timeout pausa');
 await page.locator('#new').click();await page.locator('#accept-confirm').click();await page.locator('#paste-toggle').click();await page.locator('#paste').fill('+5511988888888\n+5521988888888');await page.locator('#parse-paste').click();await page.locator('#import').click();assert.equal(await page.locator('#total').textContent(),'2');pass('Lista de números colada importa sem Excel');
 await page.locator('#template').fill('<img src=x onerror=alert(1)> {{nome}}');assert.equal(await page.locator('#preview-text img').count(),0);pass('Conteúdo da prévia não executa HTML');

 await context.unroute('https://web.whatsapp.com/**');
 await context.route('https://web.whatsapp.com/**',async route=>{
  const routeURL=new URL(route.request().url());assert.equal(routeURL.searchParams.has('text'),false);const p=routeURL.searchParams.get('phone');
  await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><div id="main"><header>+${p}</header><div id="history"></div><footer><div contenteditable="true" role="textbox" style="min-height:20px"></div><button aria-label="Anexar"><span data-icon="plus-rounded">+</span></button><input type="file" accept="image/*" hidden></footer></div><script>
   history.replaceState({},'', '/');
   document.querySelector('[contenteditable]').onpaste=e=>{
    e.preventDefault();window.pasteAt=Date.now();window.pasteCount=(window.pasteCount||0)+1;
    const file=e.clipboardData.files[0];window.uploadedName=file.name;window.uploadedSize=file.size;
    setTimeout(()=>{
    const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.innerHTML='<canvas width="180" height="160"></canvas><div contenteditable="true" role="textbox" style="min-height:30px"></div><div role="button" aria-disabled="true"><span data-icon="pending-media">Enviar foto</span></div>';
    const imageURL=URL.createObjectURL(file);const previewImage=new Image();previewImage.onload=()=>dialog.querySelector('canvas').getContext('2d').drawImage(previewImage,0,0,180,160);previewImage.src=imageURL;document.querySelector('#main footer').append(dialog);
    const initialEditor=dialog.querySelector('[contenteditable]');initialEditor.addEventListener('focus',()=>initialEditor.replaceWith(initialEditor.cloneNode(false)),{once:true});
    dialog.addEventListener('input',event=>{
     window.inputAt=Date.now();window.inputCount=(window.inputCount||0)+1;window.captionModel=event.target.innerText.replace('🚨 ','');
     const editor=event.target.cloneNode(false);
     window.captionModel.split('\\n').forEach((line,index)=>{const row=index?document.createElement('div'):editor;
      line.split('🚨').forEach((part,i)=>{if(i){const emoji=document.createElement('img');emoji.alt='🚨';emoji.setAttribute('aria-hidden','true');row.append(emoji);}row.append(document.createTextNode(part));});
      if(!line)row.append(document.createElement('br'));if(index)editor.append(row);
     });event.target.replaceWith(editor);
     const old=dialog.querySelector('[role=button]');const replacement=old.cloneNode(true);old.replaceWith(replacement);window.buttonReplaced=true;
    },{once:true});
    dialog.addEventListener('change',()=>{window.changeCount=(window.changeCount||0)+1;const send=dialog.querySelector('[role=button]');send.removeAttribute('aria-disabled');send.setAttribute('aria-label','Enviar mensagem (Enter)');});
    dialog.addEventListener('click',event=>{if(!event.target.closest('[role=button]')||event.target.closest('[role=button]').getAttribute('aria-disabled')==='true')return;send();});
    const send=()=>{window.clickAt=Date.now();window.mediaClicks=(window.mediaClicks||0)+1;const bubble=document.createElement('div');bubble.className='simulated-output';bubble.style.whiteSpace='pre-wrap';const image=document.createElement('img');image.src=imageURL;bubble.append(image,document.createTextNode(window.captionModel));document.querySelector('#history').append(bubble);dialog.remove();};
    },${p.startsWith('5511')?2200:3500});
   };
  </script>`});
 });
 await page.locator('#template').fill('🚨 Oferta para {{telefone}}\nDe R$ 22,48 por R$ 17,32\nhttps://example.com/item');
 for(const [field,value] of Object.entries({min:'30',max:'30',batch:'1',rest:'30'}))await page.locator('#'+field).fill(value);
 await page.locator('#media-file').setInputFiles(resolve('extension/icons/128.png'));
 await page.locator('#media-selected').waitFor({state:'visible'});assert.ok(await page.locator('#preview-photo').isVisible());
 await page.locator('#windowEnabled').uncheck();await page.locator('#consent').check();await page.locator('#save').click();await page.waitForTimeout(300);await page.reload();await page.locator('#media-selected').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#preview-photo').naturalWidth>0);pass('Foto validada, salva em IndexedDB e restaurada na prévia');
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'artifacts/interface.png',fullPage:true});
 await page.locator('#start').click();await page.locator('#accept-confirm').click();await page.waitForFunction(()=>document.querySelector('#submitted').textContent==='1',{},{timeout:15000});
 const photoTab=tabs.get(data.campaign.tabId);
 assert.ok(mediaResults[0].inputAt-mediaResults[0].pasteAt>=3000);assert.ok(mediaResults[0].clickAt-mediaResults[0].inputAt>=1000);assert.equal(mediaResults[0].clicks,1);assert.equal(mediaResults[0].inputs,1);assert.equal(mediaResults[0].changes,1);assert.equal(mediaResults[0].pastes,1);assert.equal(mediaResults[0].name,'128.png');assert.equal(mediaResults[0].caption,mediaJobs[0].message.caption.replace('🚨 ',''));assert.equal(mediaResults[0].images,1);pass('Clique e fechamento da prévia avançam sem mensagem-out nem confirmação de leitura');
 assert.equal(mediaJobs[0].message.type,'image');assert.equal(typeof mediaJobs[0].message.media.base64,'string');assert.equal(Object.hasOwn(mediaJobs[0].message,'text'),false);
 assert.ok(data.campaign.nextAt>Date.now());
 await page.waitForFunction(()=>document.querySelector('#submitted').textContent==='1');
 await photoTab.waitForFunction(()=>window.pasteCount===1);
 assert.equal(mediaJobs.length,2);assert.ok(mediaJobs[1].at-mediaResults[0].at<10000);assert.equal(await photoTab.evaluate(()=>window.mediaClicks||0),0);
 pass('Próximo contato aberto imediatamente, sem clicar em Enviar durante o delay');
 console.log('Aguardando 30s de intervalo + 30s de pausa de lote (relógio real)…');
 await page.waitForFunction(()=>document.querySelector('#state').textContent==='Concluída',{},{timeout:85000});
 assert.equal(await page.locator('#submitted').textContent(),'2');assert.equal(mediaJobs.length,2);assert.ok(mediaResults[1].at-mediaResults[0].at>=60000);
 assert.equal(await photoTab.evaluate(()=>window.mediaClicks),1);assert.equal(await photoTab.evaluate(()=>window.pasteCount),1);assert.equal((await photoTab.locator('.simulated-output').innerText()).trim(),mediaJobs[1].message.caption.replace('🚨 ',''));assert.notEqual(mediaJobs[0].message.caption,mediaJobs[1].message.caption);
 assert.ok(mediaResults[1].inputAt-mediaResults[1].pasteAt>=3500);assert.ok(mediaResults[1].clickAt-mediaResults[1].inputAt>=1000);
 pass('Dois lotes completados automaticamente, delay real >=60s, uma mensagem foto+legenda por contato');
 assert.deepEqual(errors,[]);pass('Sem exceções JavaScript na interface');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/interface-mobile.png',fullPage:true});pass('Layout estreito não cria rolagem horizontal');
 await writeFile('artifacts/browser-results.json',JSON.stringify({passed,realWhatsApp:false,extensionLoaded:false,note:'Chromium administrado proíbe extensões locais. UI, background e content script reais; APIs Chrome e WhatsApp simulados.'},null,2));console.log(`${passed} verificações passaram.`);
}catch(e){console.log('DEBUG state',JSON.stringify(data));for(const p of context.pages())console.log('DEBUG page',p.url(),await p.locator('body').innerText().catch(()=>''));throw e;}finally{for(const timer of timers.values())clearTimeout(timer);await browser.close();await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
