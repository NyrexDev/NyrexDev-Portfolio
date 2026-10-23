(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const cfg = window.SITE || {};

  // year + contact links
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  document.querySelectorAll('[data-contact]').forEach(a => {
    a.href = cfg.discord || '#'; a.target = '_blank'; a.rel = 'noopener';
  });

  // mobile menu
  const btn = $('.menu-btn'), nav = $('#nav');
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });

  // ---- find media in the Portfolio folder ----
  const MEDIA = /\.(png|jpe?g|gif|webp|avif|mp4|mov|webm)$/i;
  const isVideo = f => /\.(mp4|mov|webm)$/i.test(f);

  function repoInfo() {
    const r = cfg.repo || {};
    if (r.owner && r.name) return r;
    const host = location.hostname;
    if (!host.endsWith('.github.io')) return {};
    const owner = host.split('.')[0];
    const seg = location.pathname.split('/')[1];
    const name = seg && !seg.endsWith('.html') ? seg : owner + '.github.io';
    return { owner, name, branch: r.branch };
  }

  async function getImages() {
    try {
      const c = JSON.parse(sessionStorage.getItem('nx-img2') || 'null');
      if (c && Date.now() - c.t < 120000) return c.list;
    } catch (e) {}
    let list = null;
    const { owner, name, branch } = repoInfo();
    if (owner) {
      try {
        const q = branch ? '?ref=' + encodeURIComponent(branch) : '';
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/Portfolio${q}`);
        if (res.ok) {
          list = (await res.json()).filter(f => f.type === 'file' && MEDIA.test(f.name)).map(f => f.name);
        }
      } catch (e) {}
    }
    if (!list) { // fallback for local testing: list names in portfolio.json
      try { const r = await fetch('portfolio.json'); if (r.ok) list = await r.json(); } catch (e) {}
    }
    list = (list || []).sort(new Intl.Collator(undefined, { numeric: true }).compare);
    try { sessionStorage.setItem('nx-img2', JSON.stringify({ t: Date.now(), list })); } catch (e) {}
    return list;
  }

  // ---- lightbox ----
  let files = [], idx = 0;
  const lb = document.createElement('div');
  lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Media viewer');
  lb.innerHTML = '<button class="x" aria-label="Close">&times;</button><button class="prev" aria-label="Previous">&#8249;</button><img alt=""><video controls playsinline hidden></video><button class="next" aria-label="Next">&#8250;</button><span class="count"></span>';
  document.body.appendChild(lb);
  const bigImg = $('img', lb), bigVid = $('video', lb), count = $('.count', lb);
  const src = f => 'Portfolio/' + encodeURIComponent(f);
  const alt = f => f.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

  function stopVideo() { bigVid.pause(); bigVid.removeAttribute('src'); bigVid.load(); }

  function show(i) {
    idx = (i + files.length) % files.length;
    const f = files[idx], v = isVideo(f);
    bigImg.hidden = v; bigVid.hidden = !v;
    if (v) {
      bigImg.removeAttribute('src');
      bigVid.src = src(f);
      bigVid.play().catch(() => {});
    } else {
      stopVideo();
      bigImg.src = src(f); bigImg.alt = alt(f);
    }
    count.textContent = files.length > 1 ? `${idx + 1} / ${files.length}` : '';
    $('.prev', lb).style.display = $('.next', lb).style.display = files.length < 2 ? 'none' : '';
  }
  const open = i => { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('.x', lb).focus(); };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; stopVideo(); };
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.classList.contains('x')) close();
    else if (e.target.classList.contains('prev')) show(idx - 1);
    else if (e.target.classList.contains('next')) show(idx + 1);
  });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });

  // ---- render ----
  function render(target, list) {
    target.innerHTML = '';
    list.forEach(f => {
      const b = document.createElement('button');
      b.className = 'item'; b.type = 'button'; b.setAttribute('aria-label', (isVideo(f) ? 'Play ' : 'View ') + alt(f));
      let el;
      if (isVideo(f)) {
        el = document.createElement('video');
        el.muted = true; el.playsInline = true; el.preload = 'metadata';
        el.src = src(f) + '#t=0.1';
        el.addEventListener('loadeddata', () => el.classList.add('ok'));
        b.classList.add('is-video');
      } else {
        el = new Image();
        el.loading = 'lazy'; el.alt = alt(f); el.src = src(f);
        el.onload = () => el.classList.add('ok');
      }
      el.onerror = () => b.remove();
      b.appendChild(el);
      b.addEventListener('click', () => open(files.indexOf(f)));
      target.appendChild(b);
    });
  }

  const gallery = $('#gallery'), strip = $('#strip');
  if (gallery || strip) getImages().then(list => {
    files = list;
    if (gallery) {
      if (!list.length) gallery.innerHTML = '<p class="note">No projects yet. Upload images or videos to the Portfolio folder and they will appear here.</p>';
      else render(gallery, list);
    }
    if (strip) {
      if (!list.length) strip.innerHTML = '<p class="note">Projects will appear here soon.</p>';
      else render(strip, list.slice(-Number(strip.dataset.limit || 3)).reverse());
    }
  });
})();