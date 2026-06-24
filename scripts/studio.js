// Studio Kit — motor de cursor + câmera (zoom/pan) + legendas, p/ clipes story.
// Mede os alvos [data-t] na escala 1 (coords locais do .stage, invariantes ao zoom,
// pois transform-origin usa o sistema de coords não-transformado do elemento).
if (location.search.indexOf('clean') >= 0) document.body.classList.add('clean');
function Studio(){
  const stage  = document.querySelector('.stage');
  const cursor = document.querySelector('.cursor');
  const caps   = [...document.querySelectorAll('.cap')];
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const targets = {};
  document.querySelectorAll('[data-t]').forEach(el => {
    const r = el.getBoundingClientRect();
    targets[el.dataset.t] = [r.left + r.width/2, r.top + r.height/2];
  });
  function place(x, y){ cursor.style.left = x + 'px'; cursor.style.top = y + 'px'; }
  const at = name => targets[name] || name; // aceita nome ou [x,y]
  return {
    targets,
    async enter(name){ const [x,y]=at(name); cursor.style.transition='none'; place(x,1990); void cursor.offsetHeight; cursor.style.transition=''; await sleep(30); place(x,y); await sleep(880); },
    async move(name){ const [x,y]=at(name); place(x,y); await sleep(860); },
    async zoom(name, s){ const [x,y]=at(name); stage.style.transformOrigin=x+'px '+y+'px'; stage.style.transform='scale('+s+')'; cursor.style.setProperty('--iz', 1/s); await sleep(1220); },
    async reset(){ stage.style.transform='scale(1)'; cursor.style.setProperty('--iz',1); await sleep(1220); },
    async click(){
      const rp=document.createElement('div'); rp.className='ripple';
      rp.style.left=cursor.style.left; rp.style.top=cursor.style.top; stage.appendChild(rp);
      cursor.classList.add('down'); await sleep(130); cursor.classList.remove('down');
      await sleep(560); rp.remove();
    },
    async cap(i){ caps.forEach((c,j)=>c.classList.toggle('show', j===i)); await sleep(60); },
    show(sel){ document.querySelectorAll(sel).forEach(e=>e.classList.add('show')); },
    el(sel){ return document.querySelector(sel); },
    wait: sleep,
  };
}
window.Studio = Studio;
