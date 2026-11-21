const defaults = {
  bride: 'Aanya', groom: 'Arjun', date: '2027-02-14', time: '17:00',
  venue: 'The Palace Gardens', city: 'Jaipur, Rajasthan', address: 'Jaipur, Rajasthan, India'
};
const configKey = 'mehfil-invite-v1';
const wishesKey = 'mehfil-wishes-v1';
const previousSampleAddress = 'A celebration beneath the stars, surrounded by the people we love.';
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
function validateConfig(value) {
  if (!value || typeof value !== 'object') return null;
  const config = {};
  for (const key of Object.keys(defaults)) {
    if (typeof value[key] !== 'string') return null;
    const field = value[key].trim();
    if (!field || field.length > 240) return null;
    config[key] = field;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(config.time)) return null;
  const day = new Date(config.date + 'T12:00:00Z');
  if (!Number.isFinite(+day) || day.toISOString().slice(0,10) !== config.date) return null;
  return config;
}
function sharedConfig() {
  const encoded = new URLSearchParams(location.hash.slice(1)).get('i');
  if (!encoded || encoded.length > 12000) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')), char => char.charCodeAt(0));
    return validateConfig(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { return null; }
}
let config = validateConfig(window.INVITATION_CONFIG) || {...defaults};
const weddingMoment = () => new Date(config.date + 'T' + config.time + ':00+05:30');
const indiaDate = (date, fields) => date.toLocaleDateString('en-GB', {timeZone:'Asia/Kolkata',...fields});
let activeEvent = 'wedding';
let toastTimer;
function toast(message) {
  const status = $('#toast');
  const host = document.querySelector('dialog[open]') || document.body;
  host.append(status);
  status.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { status.textContent = ''; }, 4200);
}
function renderEvent() {
  const formats = {
    mehendi: { title:'Mehendi', time:'4:00 PM', daysBefore:1 },
    sangeet: { title:'Sangeet', time:'7:00 PM', daysBefore:1 },
    wedding: { title:'Wedding ceremony', time:weddingMoment().toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'}), daysBefore:0 }
  };
  const event = formats[activeEvent];
  const day = new Date(new Date(config.date+'T12:00:00+05:30').getTime()-event.daysBefore*86400000);
  $('#eventsTitle').textContent = event.title;
  $('#eventWhen').textContent = indiaDate(day,{weekday:'short',day:'numeric',month:'long'}) + ' · ' + event.time + ' IST';
  $$('[data-event-key]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventKey===activeEvent)));
}
$$('[data-event-key]').forEach(button => button.addEventListener('click',() => {
  activeEvent = button.dataset.eventKey;
  renderEvent();
}));

function tick() {
  let remaining = Math.max(0,weddingMoment().getTime()-Date.now());
  $('#finaleTitle').textContent = remaining ? 'Until we say “I do”' : 'Our forever has begun';
  for (const [name, length] of [['days',86400000],['hours',3600000],['minutes',60000],['seconds',1000]]) {
    const label = String(Math.floor(remaining/length)).padStart(2,'0');
    const output = document.getElementById(name);
    if (output.textContent !== label) output.textContent = label;
    remaining %= length;
  }
}

function scratchCoating(button) {
  let canvas = button.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    canvas.className = 'scratch-coating';
    canvas.setAttribute('aria-hidden', 'true');
    button.append(canvas);
  }
  const context = canvas.getContext('2d', {willReadFrequently:true});
  context.globalCompositeOperation = 'source-over';
  const gradient = context.createLinearGradient(0,0,160,160);
  gradient.addColorStop(0,'#dd8c85');
  gradient.addColorStop(.36,'#b64854');
  gradient.addColorStop(.7,'#8d3041');
  gradient.addColorStop(1,'#ca7773');
  context.fillStyle=gradient;
  context.fillRect(0,0,160,160);
  context.strokeStyle='rgba(255,226,186,.20)';
  context.lineWidth=4;
  for(let x=-160;x<320;x+=19){context.beginPath();context.moveTo(x,0);context.lineTo(x+160,160);context.stroke();}
  context.fillStyle='#ffdeab';
  context.font='34px Georgia';
  context.textAlign='center';
  context.fillText('✧',80,94);
}
function updateHeart(button, open) {
  button.setAttribute('aria-pressed',String(open));
  button.setAttribute('aria-label',open ? button.dataset.part+': '+button.querySelector('strong').textContent : 'Scratch to reveal the wedding '+button.dataset.part);
  const canvas=button.querySelector('canvas');
  if (canvas) canvas.hidden=open;
}
function resetHearts() {
  $$('.heart').forEach(button => { scratchCoating(button); updateHeart(button,false); });
  $('#heartHint').textContent='Scratch each heart to reveal our wedding date.';
}
function revealHeart(button) {
  if (!button || button.getAttribute('aria-pressed')==='true') return;
  updateHeart(button,true);
  if ($$('.heart').every(item => item.getAttribute('aria-pressed')==='true'))
    $('#heartHint').textContent=indiaDate(weddingMoment(),{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
const heartRow=$('#hearts');
let scratch=null;
function rub(event) {
  if (!scratch || event.pointerId!==scratch.id) return;
  const {button,canvas,context}=scratch;
  const bounds=canvas.getBoundingClientRect();
  const x=(event.clientX-bounds.left)*canvas.width/bounds.width;
  const y=(event.clientY-bounds.top)*canvas.height/bounds.height;
  context.globalCompositeOperation='destination-out';
  context.lineWidth=30;
  context.lineCap='round';
  context.lineJoin='round';
  context.beginPath();
  context.moveTo(scratch.x,scratch.y);
  context.lineTo(x,y);
  context.stroke();
  scratch.x=x; scratch.y=y; scratch.moved=true;
  const pixels=context.getImageData(0,0,160,160).data;
  let cleared=0;
  for(let i=3;i<pixels.length;i+=64) if(pixels[i]<128) cleared++;
  if(cleared/(pixels.length/64)>.32) revealHeart(button);
}
heartRow.addEventListener('pointerdown',event=>{
  const button=event.target.closest('.heart');
  if(!button || button.getAttribute('aria-pressed')==='true') return;
  const canvas=button.querySelector('canvas'), bounds=canvas.getBoundingClientRect();
  scratch={id:event.pointerId,button,canvas,context:canvas.getContext('2d',{willReadFrequently:true}),x:(event.clientX-bounds.left)*160/bounds.width,y:(event.clientY-bounds.top)*160/bounds.height,moved:false};
  button.setPointerCapture(event.pointerId);
});
heartRow.addEventListener('pointermove',rub);
heartRow.addEventListener('pointerup',event=>{if(scratch && event.pointerId===scratch.id){rub(event);scratch=null;}});
heartRow.addEventListener('pointercancel',()=>{scratch=null;});
heartRow.addEventListener('click',event=>{if(event.detail===0) revealHeart(event.target.closest('.heart'));});
$('#heartHint').setAttribute('aria-live','polite');

function mapDetails() {
  const sample = config.venue===defaults.venue && config.city===defaults.city &&
    [defaults.address,previousSampleAddress].includes(config.address);
  const query = sample ? defaults.city + ', India' : [config.venue,config.address,config.city].join(', ');
  $('#mapLink').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  $('#mapLink').textContent = sample ? 'View Jaipur on map' : 'Venue directions';
}
function render() {
  $$('[data-bind]').forEach(element => { element.textContent = config[element.dataset.bind]; });
  const day = new Date(config.date+'T12:00:00+05:30');
  const dateParts = {
    day:indiaDate(day,{day:'2-digit'}),
    shortMonth:indiaDate(day,{month:'short'}),
    year:indiaDate(day,{year:'numeric'})
  };
  $$('[data-date]').forEach(element => { element.textContent = dateParts[element.dataset.date]; });
  const nameLength = Math.max(Array.from(config.bride).length, Array.from(config.groom).length);
  document.documentElement.classList.toggle('cover-long',nameLength>11);
  document.documentElement.classList.toggle('cover-extra-long',nameLength>20);
  document.title = config.bride + ' & ' + config.groom + ' · Wedding invitation';
  mapDetails();
  renderEvent();
  resetHearts();
  renderWishes();
  tick();
}
function invitationURL() {
  return location.origin + location.pathname + location.search;
}

function putConfigInAddress() {
  try { history.replaceState(history.state,'',invitationURL()); } catch {}
}

const menuDialog = $('#menu');
const editorDialog = $('#editor');
const wishDialog = $('#wishDialog');
function openMenu() {
  if (!menuDialog.open) menuDialog.showModal();
}
$('#menuOpen').addEventListener('click',openMenu);
$('#indexOpen').addEventListener('click',openMenu);
$$('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) dialog.close();
  });
});
$('#editOpen').addEventListener('click',() => {
  menuDialog.close();
  for (const key of Object.keys(defaults)) $('#editForm').elements[key].value = config[key];
  editorDialog.showModal();
});
$('#editForm').addEventListener('submit',event => {
  event.preventDefault();
  const next = validateConfig(Object.fromEntries(new FormData(event.currentTarget)));
  if (!next) { toast('Check the names, date and venue.'); return; }
  config = next;
  saveLocal(configKey,config);
  putConfigInAddress();
  render();
  editorDialog.close();
  invitationStory.replay();
  toast('Invitation updated. Copy your link from the menu.');
});
$('#reset').addEventListener('click',() => {
  config = {...defaults};
  saveLocal(configKey,config);
  try { history.replaceState(history.state,'',location.pathname+location.search); } catch {}
  render();
  editorDialog.close();
  invitationStory.replay();
  toast('Sample invitation restored.');
});
$('#share').addEventListener('click',async () => {
  const url = invitationURL();
  try {
    await navigator.clipboard.writeText(url);
    toast('Invitation link copied.');
  } catch {
    putConfigInAddress();
    let field = menuDialog.querySelector('.copy-url');
    if (!field) {
      field = document.createElement('input');
      field.className = 'copy-url';
      field.readOnly = true;
      field.setAttribute('aria-label','Invitation link to copy');
      menuDialog.append(field);
    }
    field.value = url;
    field.focus();
    field.select();
    toast('Select and copy the invitation link.');
  }
});

function escapeCalendarText(text) {
  return text.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
}
function stamp(date) {
  return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
}
$('#calendar').addEventListener('click',() => {
  const start = weddingMoment();
  const end = new Date(start.getTime()+4*3600000);
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mehfil//Wedding invitation//EN',
    'CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+stamp(start)+'-wedding@mehfil',
    'DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(start),'DTEND:'+stamp(end),
    'SUMMARY:'+escapeCalendarText(config.bride+' & '+config.groom+' — Wedding'),
    'LOCATION:'+escapeCalendarText([config.venue,config.address,config.city].join(', ')),
    'END:VEVENT','END:VCALENDAR'
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'}));
  const link = document.createElement('a');
  link.href=url; link.download='wedding-invitation.ics';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Your calendar file is ready.');
});

const scope = () => [config.bride,config.groom,config.date].join('|');
function savedWishes() {
  const value = readLocal(wishesKey,[]);
  return Array.isArray(value) ? value : [];
}
function renderWishes() {
  const list = $('#wishList');
  list.replaceChildren();
  savedWishes().filter(wish => wish && wish.scope===scope() && typeof wish.name==='string' && typeof wish.message==='string')
    .slice(-5).reverse().forEach(wish => {
      const card=document.createElement('div'), note=document.createElement('p'), name=document.createElement('small');
      card.className='wish'; note.textContent=wish.message; name.textContent='With love, '+wish.name;
      card.append(note,name); list.append(card);
    });
}
$('#wishOpen').addEventListener('click',() => wishDialog.showModal());
$('#wishForm').addEventListener('submit',event => {
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  const name=String(data.get('name')).trim(), message=String(data.get('message')).trim();
  if (!name || !message) { toast('Add your name and your wish.'); return; }
  const wishes=savedWishes().slice(-99);
  wishes.push({scope:scope(),name:name.slice(0,60),message:message.slice(0,500)});
  if (!saveLocal(wishesKey,wishes)) { toast('This browser could not save the wish.'); return; }
  event.currentTarget.reset(); renderWishes(); toast('Your wish is saved on this device.');
});

const score = $('#score');
const soundButton = $('#music');
score.volume=.52;
function reflectSound() {
  soundButton.setAttribute('aria-pressed',String(!score.paused));
  soundButton.setAttribute('aria-label',score.paused ? 'Play music' : 'Pause music');
}
score.addEventListener('play',reflectSound);
score.addEventListener('pause',reflectSound);
soundButton.addEventListener('click',async () => {
  if (!score.paused) { score.pause(); return; }
  try { await score.play(); }
  catch { toast('Tap the music button again to play the score.'); }
});
window.addEventListener('pagehide',() => score.pause());

render();
setInterval(tick,1000);
