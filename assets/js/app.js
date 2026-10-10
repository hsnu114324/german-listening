'use strict';
const tracks=window.TRACKS;
const $=id=>document.getElementById(id);
const audio=$('audio');
let queue=[],current=null,question=0,visible=false,transition=0,subtitles={};
try{subtitles=JSON.parse(localStorage.getItem('hoer-mal-subtitles')||'{}')||{};}catch{}
function shuffled(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function format(time){return Number.isFinite(time)?`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`:'0:00';}
const glossary=window.GLOSSARY||{words:{},phrases:{}};
const phraseKeys=Object.keys(glossary.phrases).sort((a,b)=>b.length-a.length);
const escapeRegex=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const phrasePattern=phraseKeys.map(escapeRegex).join('|');
const wordPattern=/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu;
const subtitlePattern=new RegExp((phrasePattern?'(?:'+phrasePattern+')(?=$|[^\\p{L}\\p{N}])|':'')+wordPattern.source,'giu');
let activeWord=null;
function closeMeaning(returnFocus=false){
  $('word-popover').hidden=true;
  if(activeWord){activeWord.setAttribute('aria-expanded','false');activeWord.classList.remove('selected');if(returnFocus&&activeWord.isConnected)activeWord.focus();}
  activeWord=null;
}
function renderSubtitle(text){
  const target=$('subtitle');target.replaceChildren();
  if(!text){target.textContent='這段錄音尚未加入字幕。可從頁面下方匯入德文逐字稿。';return;}
  let cursor=0;
  for(const match of text.matchAll(subtitlePattern)){
    target.append(document.createTextNode(text.slice(cursor,match.index)));
    const button=document.createElement('button');button.type='button';button.className='german-word';button.textContent=match[0];
    button.dataset.word=match[0];button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','word-popover');button.setAttribute('aria-label',match[0]+'：查看中文意思');target.append(button);cursor=match.index+match[0].length;
  }
  target.append(document.createTextNode(text.slice(cursor)));
}
function placeMeaning(){
  if(!activeWord)return;
  const bubble=$('word-popover');const rect=activeWord.getBoundingClientRect();
  bubble.style.left='16px';bubble.style.top='16px';
  const box=bubble.getBoundingClientRect();
  const viewport=window.visualViewport;const width=viewport?viewport.width:innerWidth;const height=viewport?viewport.height:innerHeight;const offset=viewport?viewport.offsetTop:0;
  const left=Math.max(12,Math.min(rect.left+rect.width/2-box.width/2,width-box.width-12));
  let top=rect.bottom+8;if(top+box.height>height+offset-12)top=rect.top-box.height-8;
  top=Math.max(offset+12,Math.min(top,height+offset-box.height-12));
  bubble.style.left=left+'px';bubble.style.top=top+'px';
}
$('subtitle').addEventListener('click',event=>{
  const button=event.target.closest('.german-word');if(!button)return;
  if(activeWord===button){closeMeaning();return;}
  closeMeaning();activeWord=button;
  const word=button.dataset.word;const key=word.toLocaleLowerCase('de');
  let meaning=glossary.phrases[key]||glossary.words[key]||glossary.phrases[phraseKeys.find(p=>p.toLocaleLowerCase('de')===key)];
  if(/^[0-9]+$/.test(word))meaning='數字 '+word;
  if(word==='Sie')meaning='您（敬稱）；若在句首，也可能指她／他們，需看語境。';
  if(word==='Ihnen')meaning='您／給您（敬稱與格）';
  $('word-title').textContent=word;$('word-meaning').textContent=meaning||'這個詞尚未收錄中文意思。';
  button.classList.add('selected');button.setAttribute('aria-expanded','true');$('word-popover').hidden=false;placeMeaning();$('close-word').focus({preventScroll:true});
});
$('close-word').addEventListener('click',()=>closeMeaning(true));
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#word-popover')&&!event.target.closest('.german-word'))closeMeaning();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeWord){event.preventDefault();closeMeaning(true);}});
window.addEventListener('resize',()=>closeMeaning());
window.addEventListener('scroll',()=>closeMeaning(),{passive:true});
function updateSubtitles(){closeMeaning();const text=subtitles[current.id]||current.text;renderSubtitle(text);$('subtitle').hidden=!visible;$('word-hint').hidden=!visible||!text;$('hidden-hint').hidden=visible;$('toggle-subtitle').innerHTML=visible?'隱藏字幕 <span>−</span>':'顯示字幕 <span>＋</span>';$('toggle-subtitle').setAttribute('aria-expanded',String(visible));}
function updateCount(){$('subtitle-count').textContent=`已加入 ${tracks.filter(t=>subtitles[t.id]||t.text).length} / ${tracks.length} 段字幕`;}
async function play(){const request=transition;$('status').textContent='';try{await audio.play();}catch(error){if(request===transition&&error.name!=='AbortError')$('status').textContent='請按播放按鈕開始；若仍無法播放，請確認音檔可以讀取。';}}
function next(shouldPlay=true){transition++;audio.pause();if(!queue.length){queue=shuffled(tracks);if(current&&queue.length>1&&queue[queue.length-1].id===current.id)[queue[0],queue[queue.length-1]]=[queue[queue.length-1],queue[0]];}current=queue.pop();question++;visible=false;updateSubtitles();$('track-id').textContent=current.id;$('counter').textContent=`第 ${question} 題`;$('seek').value=0;$('elapsed').textContent='0:00';$('duration').textContent='0:00';$('status').textContent='';audio.src=current.src;audio.playbackRate=Number($('speed').value);audio.load();if(shouldPlay)play();}
$('play').addEventListener('click',()=>audio.paused?play():audio.pause());
$('replay').addEventListener('click',()=>{audio.currentTime=0;play();});
$('next').addEventListener('click',()=>next());
$('toggle-subtitle').addEventListener('click',()=>{visible=!visible;updateSubtitles();});
$('speed').addEventListener('change',()=>{audio.playbackRate=Number($('speed').value);});
$('seek').addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number($('seek').value)/100;});
audio.addEventListener('loadedmetadata',()=>{$('duration').textContent=format(audio.duration);});
audio.addEventListener('timeupdate',()=>{$('elapsed').textContent=format(audio.currentTime);$('seek').value=audio.duration?audio.currentTime/audio.duration*100:0;});
function playing(isPlaying){document.body.classList.toggle('playing',isPlaying);$('play').innerHTML=isPlaying?'Ⅱ<span>暫停播放</span>':'▶<span>播放錄音</span>';$('play').setAttribute('aria-label',isPlaying?'暫停播放':'播放錄音');}
audio.addEventListener('play',()=>playing(true));audio.addEventListener('pause',()=>playing(false));
audio.addEventListener('ended',()=>{playing(false);if($('autoplay').checked)next();});
audio.addEventListener('error',()=>{$('status').textContent='音檔無法載入。請再試一次，或切換下一題。';playing(false);});
$('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||Array.isArray(data)||typeof data!=='object')throw Error('請使用音檔編號對應字幕的 JSON 物件。');const clean={};for(const [key,value] of Object.entries(data)){const id=key.replace(/\.mp3$/i,'');if(!tracks.some(t=>t.id===id))continue;if(typeof value!=='string')throw Error('每段字幕必須是文字。');if(value.trim())clean[id]=value.trim();}if(!Object.keys(clean).length)throw Error('檔案沒有可對應這些錄音的字幕。');subtitles={...subtitles,...clean};let saved=true;try{localStorage.setItem('hoer-mal-subtitles',JSON.stringify(subtitles));}catch{saved=false;}updateSubtitles();updateCount();$('status').textContent=`已匯入 ${Object.keys(clean).length} 段字幕。${saved?'':'瀏覽器無法儲存，關閉頁面後需重新匯入。'}`;}catch(error){$('status').textContent=`匯入失敗：${error.message}`;}event.target.value='';});
$('total').textContent=tracks.length;updateCount();next(false);
