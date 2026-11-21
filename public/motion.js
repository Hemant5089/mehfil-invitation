/* Native scroll is the clock. The camera, canopy and stationery move on their own planes. */
const invitationStory = (() => {
  const root = document.documentElement;
  const book = document.getElementById('book');
  const stage = document.getElementById('stage');
  const flatMode = matchMedia('(prefers-reduced-motion: reduce), (max-height: 510px)');
  const portrait = matchMedia('(max-aspect-ratio: 4/5)');
  const lastBeat = 4.72;
  const chapters = [
    { id: 'cover', title: 'The opening', beat: 0, activeFrom: 0 },
    { id: 'blessing', title: 'The invitation', beat: 1.14, activeFrom: .70 },
    { id: 'date', title: 'Save the date', beat: 2.27, activeFrom: 1.80 },
    { id: 'celebrations', title: 'The festivities', beat: 3.42, activeFrom: 2.98 },
    { id: 'finale', title: 'The farewell', beat: lastBeat, activeFrom: 4.13 }
  ];
  for (const chapter of chapters) {
    chapter.el = document.getElementById(chapter.id);
    chapter.motion = chapter.el.querySelector('.leaf-motion');
  }
  const palace = document.getElementById('palaceSet');
  const palaceCamera = palace.querySelector('.palace-camera');
  const canopyCamera = palace.querySelector('.canopy-camera');
  const garden = document.getElementById('gardenSet');
  const gardenArt = garden.querySelector('.plate');
  const mandap = document.getElementById('mandapSet');
  const mandapArt = mandap.querySelector('.plate');
  const lake = document.getElementById('lakeSet');
  const lakeArt = lake.querySelector('.plate');
  const dust = document.getElementById('atmosphere');
  const progressBar = document.getElementById('readProgress');
  const label = document.getElementById('sceneName');
  const nextLabel = document.getElementById('nextLabel');
  const menu = document.getElementById('menu');
  const stopAliases = { home: 'cover', invitation: 'blessing', venue: 'celebrations' };

  let activeIndex = -1;
  let travel = 0;
  let bookTop = 0;
  let queued = false;
  let introTimer;
  let lastPosition = NaN;
  const cap = value => Math.max(0, Math.min(1, value));
  function eased(value, start, end) {
    const t = cap((value - start) / (end - start));
    return t*t*(3-2*t);
  }
  function translateY(percent, scale = 1) {
    return 'translate3d(0,' + percent.toFixed(3) + '%,0) scale(' + scale.toFixed(4) + ')';
  }
  function showArt(element, visible) {
    element.style.visibility = visible ? 'visible' : 'hidden';
  }
  function paintLeaf(chapter, opacity, y, scale = 1, tilt = 0) {
    const visible = opacity > .001;
    chapter.el.classList.toggle('is-painted', visible);
    if (!visible) return;
    chapter.motion.style.opacity = opacity.toFixed(3);
    chapter.motion.style.transform = 'perspective(1250px) ' + translateY(y, scale) + ' rotateX(' + tilt.toFixed(2) + 'deg)';
  }
  function setActive(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    chapters.forEach((chapter, i) => {
      const active = i === index;
      chapter.el.classList.toggle('is-active', active);
      chapter.el.inert = !flatMode.matches && !active;
      if (!flatMode.matches && !active) chapter.el.setAttribute('aria-hidden', 'true');
      else chapter.el.removeAttribute('aria-hidden');
      const item = menu.querySelector('[data-go="' + chapter.id + '"]');
      if (active) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    label.textContent = chapters[index].title;
    const firstHint = portrait.matches ? 'Swipe to enter' : 'Scroll to enter';
    nextLabel.textContent = index === 0 ? firstHint : index === chapters.length-1 ? 'Replay opening' : 'Next scene';
  }
  function drawFilm(t) {
    const coverExit = eased(t, .09, 1.09);
    const cameraIn = eased(t, 0, .84);
    showArt(palace, t < 1.10);
    if (t < 1.10) {
      palace.style.transform = translateY(-108 * coverExit);
      palaceCamera.style.transform = translateY(-3 * cameraIn, 1 + .31 * cameraIn);
      canopyCamera.style.transform = translateY(-33 * cameraIn, 1 + .18 * cameraIn);
      const feather = cap(coverExit*6) * 12;
      const edge = 'linear-gradient(180deg, #000 ' + (100-feather).toFixed(2) + '%, transparent 100%)';
      palace.style.maskImage = edge;
      palace.style.webkitMaskImage = edge;
    }

    showArt(garden, t < 3.30);
    if (t < 3.30) {
      const gardenEntry = eased(t, .12, 1.15);
      const terrace = eased(t, 1.32, 2.29);
      // The foreground letter rises faster than the distant garden and steps.
      gardenArt.style.transform = translateY(9*(1-gardenEntry)-3*terrace, 1.23-.11*gardenEntry-.04*terrace);
    }

    const mandapEntry = eased(t, 2.47, 3.29);
    const mandapExit = eased(t, 3.68, 4.56);
    showArt(mandap, mandapEntry > 0 && t < 4.57);
    if (mandapEntry > 0 && t < 4.57) {
      const iris = 'ellipse(' + (132*mandapEntry).toFixed(3) + '% ' + (153*mandapEntry).toFixed(3) + '% at 50% 64%)';
      mandap.style.clipPath = mandapEntry === 1 ? 'none' : iris;
      mandap.style.transform = translateY(-12*mandapExit);
      mandapArt.style.transform = translateY(0, 1+.15*(1-mandapEntry)+.085*mandapExit);
    }

    const lakeEntry = eased(t, 3.70, 4.56);
    showArt(lake, lakeEntry > 0);
    if (lakeEntry > 0) {
      lake.style.clipPath = lakeEntry === 1 ? 'none' : 'inset(' + (100*(1-lakeEntry)).toFixed(3) + '% 0 0 0)';
      lakeArt.style.transform = translateY(3*(1-lakeEntry), 1+.14*(1-lakeEntry));
    }

    const coverWords = eased(t, .015, .52);
    paintLeaf(chapters[0], 1-coverWords, -39*coverWords, 1-.095*coverWords);

    const letterUp = eased(t, .20, 1.04);
    const letterOut = eased(t, 1.33, 2.10);
    const letterAlpha = eased(t, .20, .53) * (1-eased(t, 1.82, 2.08));
    paintLeaf(chapters[1], letterAlpha, 111*(1-letterUp)-116*letterOut,
              .78+.22*letterUp-.05*letterOut, -13*(1-letterUp)+7*letterOut);

    const dateIn = eased(t, 1.45, 2.18);
    const dateOut = eased(t, 2.46, 3.07);
    paintLeaf(chapters[2], eased(t, 1.45, 1.92)*(1-dateOut),
              78*(1-dateIn)-48*dateOut, .94+.06*dateIn);

    const ticketIn = eased(t, 2.69, 3.33);
    const ticketOut = eased(t, 3.69, 4.27);
    paintLeaf(chapters[3], eased(t, 2.72, 3.13)*(1-ticketOut),
              75*(1-ticketIn)-64*ticketOut, .89+.11*ticketIn, -8*(1-ticketIn));

    const lastIn = eased(t, 3.91, 4.54);
    paintLeaf(chapters[4], lastIn, 23*(1-lastIn), .94+.06*lastIn);
    dust.style.opacity = String(.80-.50*eased(t, .5, 1.4)+.26*mandapEntry);
    let index = 0;
    for (let i=1; i<chapters.length; i++) if (t >= chapters[i].activeFrom) index = i;
    setActive(index);
  }
  function draw() {
    queued = false;
    if (flatMode.matches) {
      const middle = innerHeight*.5;
      let index = 0;
      chapters.forEach((chapter,i) => { if (chapter.el.getBoundingClientRect().top <= middle) index = i; });
      setActive(index);
      const denom = Math.max(1, book.scrollHeight-innerHeight);
      progressBar.style.transform = 'scaleX(' + cap((scrollY-bookTop)/denom) + ')';
      return;
    }
    const progress = cap((scrollY-bookTop)/Math.max(1,travel));
    if (progress === lastPosition) return;
    lastPosition = progress;
    progressBar.style.transform = 'scaleX(' + progress + ')';
    drawFilm(progress*lastBeat);
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  }
  function measure() {
    bookTop = book.getBoundingClientRect().top + scrollY;
    travel = book.offsetHeight - stage.clientHeight;
    lastPosition = NaN;
    schedule();
  }
  function configure() {
    root.classList.toggle('film', !flatMode.matches);
    activeIndex = -1;
    if (flatMode.matches) {
      root.classList.remove('arriving');
      chapters.forEach(chapter => { chapter.motion.removeAttribute('style'); });
    }
    measure();
    draw();
  }
  function go(id, instant=false) {
    const chapter = chapters.find(stop => stop.id === (stopAliases[id] || id));
    if (!chapter) return;
    const behavior = instant || flatMode.matches ? 'instant' : 'smooth';
    if (flatMode.matches) chapter.el.scrollIntoView({behavior,block:'start'});
    else window.scrollTo({top:bookTop+travel*chapter.beat/lastBeat,behavior});
  }
  function replay() {
    go('cover', true);
    if (flatMode.matches) return;
    clearTimeout(introTimer);
    root.classList.remove('arriving');
    void stage.offsetWidth;
    root.classList.add('arriving');
    introTimer = setTimeout(() => root.classList.remove('arriving'), 2250);
  }
  function scatterPetals() {
    const positions = [7,18,32,49,62,74,86,95];
    positions.forEach((left,i) => {
      const petal = document.createElement('i');
      petal.className = 'petal';
      petal.style.left = left + '%';
      petal.style.setProperty('--duration',(8.2+i*.76)+'s');
      petal.style.setProperty('--delay',(-i*1.76-.6)+'s');
      petal.style.setProperty('--wind',(i%2 ? -29-i*3 : 22+i*3)+'px');
      if (i%3 === 0) petal.style.background = 'linear-gradient(135deg,#f5cf89,#c5924c)';
      dust.append(petal);
    });
  }

  document.getElementById('nextScene').addEventListener('click', () => {
    if (activeIndex === chapters.length-1) replay();
    else go(chapters[activeIndex+1].id);
  });
  document.querySelectorAll('[data-go]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (menu.open) menu.close();
      go(link.dataset.go);
    });
  });
  document.getElementById('replay').addEventListener('click', () => { menu.close(); replay(); });
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  flatMode.addEventListener('change',configure);
  portrait.addEventListener('change',() => { activeIndex=-1; measure(); });
  if (typeof ResizeObserver === 'function') new ResizeObserver(measure).observe(stage);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  configure();
  scatterPetals();
  const initialAnchor = location.hash.slice(1);
  const target = chapters.some(chapter => chapter.id === initialAnchor) || initialAnchor in stopAliases;
  go(target ? initialAnchor : 'cover', true);
  introTimer = setTimeout(() => root.classList.remove('arriving'), 2250);
  window.addEventListener('pageshow',measure);
  return {go,replay};
})();
