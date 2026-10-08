/*
  Clinical Light: behaviour for clinical-light.css

  Load it from <head>, without defer, so the "hidden until scrolled" states apply before first paint:
    a script tag with src="clinical-light.js"

  What it does
    1. adds class "hc-js" to <html>        (the CSS only hides things when this is set)
    2. <body data-hc-bg>                   inserts the animated background + moving lines
    3. [data-hc-words]                     splits text into words that fade in on scroll
    4. .hc-reveal .hc-stagger .hc-bar      get class "is-in" when scrolled into view
    5. [data-hc-count="40"]                counts up to 40 when scrolled into view
                                           optional: data-hc-suffix="+"
    6. [data-hc-relay]                     lights the .hc-glow children one after another
    7. .hc-glow boxes                      get a cursor-following spotlight on hover

  If you add elements after page load (a framework, fetch, etc.) call HC.refresh().
*/
(function(){
  'use strict';
  var root = document.documentElement;
  root.classList.add('hc-js');

  var REVEAL = '.hc-reveal, .hc-stagger, .hc-bar, .hc-draw, [data-hc-words], [data-hc-count]';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;

  /* ---- background with moving lines ---- */
  function addBackground(){
    if(document.querySelector('.hc-bg')) return;
    var bg = document.createElement('div');
    bg.className = 'hc-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<svg viewBox="0 0 1440 900" preserveAspectRatio="none">' +
      '<path d="M-50,180 C300,70 540,320 900,200 S1300,100 1500,210"/>' +
      '<path d="M-50,540 C260,440 640,660 980,520 S1340,430 1500,560"/>' +
      '<path d="M-50,820 C330,740 680,900 1040,800 S1370,720 1500,830"/>' +
      '</svg>';
    document.body.insertBefore(bg, document.body.firstChild);
  }

  /* ---- wrap each word in a span; keeps inline tags like <em> ---- */
  function splitWords(el){
    if(el.dataset.hcSplit === 'done') return;
    var i = 0;
    (function walk(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType === 3){
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function(part){
            if(!part) return;
            if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'hc-w';
            s.style.setProperty('--i', i++);
            s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if(n.nodeType === 1){ walk(n); }
      });
    })(el);
    el.dataset.hcSplit = 'done';
  }

  /* ---- number count-up (ease-out) ---- */
  function countUp(el){
    if(el.dataset.hcDone === '1') return;
    el.dataset.hcDone = '1';
    var target = parseFloat(el.getAttribute('data-hc-count'));
    var suffix = el.getAttribute('data-hc-suffix') || '';
    if(isNaN(target)) return;
    if(reduce){ el.textContent = target + suffix; return; }
    var start = null, dur = 1100;
    function tick(now){
      if(start === null) start = now;
      var p = Math.min((now - start) / dur, 1);
      var v = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (target % 1 ? v.toFixed(1) : Math.round(v)) + suffix;
      if(p < 1) requestAnimationFrame(tick); else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  }

  function reveal(el){
    el.classList.add('is-in');
    if(el.hasAttribute('data-hc-count')) countUp(el);
    Array.prototype.forEach.call(el.querySelectorAll('[data-hc-count]'), countUp);
  }

  function scan(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-hc-words]'), splitWords);
    var els = document.querySelectorAll(REVEAL);
    Array.prototype.forEach.call(els, function(el){
      if(el.classList.contains('is-in') || el.dataset.hcWatch) return;
      el.dataset.hcWatch = '1';
      if(io) io.observe(el); else reveal(el);
    });
  }

  /* ---- one box at a time lights up: <div data-hc-relay> ... children with class hc-glow ---- */
  function startRelay(box){
    if(box.dataset.hcRelay === 'on') return;
    box.dataset.hcRelay = 'on';
    var step = parseInt(box.getAttribute('data-hc-relay'), 10) || 2600;
    var n = 0;
    function next(){
      var kids = box.querySelectorAll(':scope > .hc-glow');
      if(!kids.length || box.matches(':hover')) return;
      Array.prototype.forEach.call(kids, function(k){ k.classList.remove('is-lit'); });
      kids[n % kids.length].classList.add('is-lit');
      n++;
    }
    next();
    if(!reduce) setInterval(next, step);
  }

  /* ---- spotlight follows the cursor inside .hc-glow boxes ---- */
  document.addEventListener('pointermove', function(e){
    var t = e.target.closest && e.target.closest('.hc-glow');
    if(!t) return;
    var r = t.getBoundingClientRect();
    t.style.setProperty('--hc-mx', (e.clientX - r.left) + 'px');
    t.style.setProperty('--hc-my', (e.clientY - r.top) + 'px');
  }, {passive: true});

  function init(){
    if(document.body.hasAttribute('data-hc-bg')) addBackground();
    if('IntersectionObserver' in window){
      io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          reveal(en.target);
          io.unobserve(en.target);
        });
      }, {threshold: 0.15});
    }
    scan();
    Array.prototype.forEach.call(document.querySelectorAll('[data-hc-relay]'), startRelay);
  }

  /* set a counter to a new value and play it again (used after content changes) */
  function count(el, target, suffix){
    el.setAttribute('data-hc-count', target);
    if(suffix !== undefined) el.setAttribute('data-hc-suffix', suffix);
    el.dataset.hcDone = '';
    if(el.closest('.is-in') || el.classList.contains('is-in')) countUp(el);
  }

  window.HC = {
    refresh: function(){ if(!io) return; scan(); Array.prototype.forEach.call(document.querySelectorAll('[data-hc-relay]'), startRelay); },
    count: count,
    theme: function(name){ root.setAttribute('data-hc-theme', name); }
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
