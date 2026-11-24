(function () {
  var root = document.querySelector('[data-lnk]');
  if (!root) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  if ('IntersectionObserver' in window) {
    root.setAttribute('data-js', '1');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.setAttribute('data-in', '1');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    root.querySelectorAll('[data-rv]').forEach(function (el) { io.observe(el); });
  }

  // Hero video: after the page has loaded, fetch and play only the one that
  // matches this screen (mobile or desktop). The poster image shows first.
  var vids = root.querySelectorAll('.hero-bg video');
  var saveData = navigator.connection && navigator.connection.saveData;
  var chosen = null;
  vids.forEach(function (v) {
    v.addEventListener('playing', function () { v.setAttribute('data-on', '1'); });
  });
  var pickVideo = function () {
    if (reduce || saveData) return;
    vids.forEach(function (v) {
      var shown = window.getComputedStyle(v).display !== 'none';
      if (shown && !chosen) {
        chosen = v;
        v.muted = true;
        v.src = v.getAttribute('data-src');
      }
      if (v !== chosen) return;
      if (shown) {
        if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else if (!v.paused) {
        v.pause();
      }
    });
  };
  if (vids.length) {
    var vt = null;
    window.addEventListener('resize', function () { clearTimeout(vt); vt = setTimeout(pickVideo, 200); });
    if (document.readyState === 'complete') pickVideo();
    else window.addEventListener('load', pickVideo);
  }

  // Jai Thai badge: smooth scroll to the Jai Thai section
  var jtb = root.querySelector('[data-jtb]');
  var jts = root.querySelector('#jai-thai');
  if (jtb && jts) {
    jtb.addEventListener('click', function (e) {
      e.preventDefault();
      jts.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // Destinations rail: arrows, mouse drag, progress bar
  var rail = root.querySelector('.rail');
  if (rail) {
    var prev = root.querySelector('.rail-prev');
    var next = root.querySelector('.rail-next');
    var bar = root.querySelector('.rail-bar');
    var update = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      var x = rail.scrollLeft;
      if (prev) prev.setAttribute('aria-disabled', x <= 4 ? 'true' : 'false');
      if (next) next.setAttribute('aria-disabled', x >= max - 4 ? 'true' : 'false');
      if (bar) {
        var w = Math.max(12, Math.min(100, rail.clientWidth / rail.scrollWidth * 100));
        var p = max > 0 ? x / max : 0;
        bar.style.setProperty('--rw', w + '%');
        bar.style.setProperty('--rx', (p * (100 - w) / w * 100) + '%');
      }
    };
    var step = function (dir) {
      var card = rail.querySelector('.place');
      var s = card ? card.getBoundingClientRect().width + 18 : 300;
      var n = Math.max(1, Math.floor((rail.clientWidth - 60) / s));
      rail.scrollBy({ left: dir * n * s, behavior: reduce ? 'auto' : 'smooth' });
    };
    root.querySelectorAll('[data-rail]').forEach(function (b) {
      b.addEventListener('click', function () { step(parseInt(b.getAttribute('data-rail'), 10)); });
    });
    var drag = null, moved = false;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: rail.scrollLeft };
      moved = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 6) { moved = true; rail.setAttribute('data-drag', '1'); }
      if (moved) { rail.scrollLeft = drag.left - dx; e.preventDefault(); }
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      drag = null;
      if (moved) {
        var left = rail.scrollLeft;
        rail.removeAttribute('data-drag');
        rail.scrollLeft = left;
      }
    });
    rail.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Close the mobile menu after picking a link
  var menu = root.querySelector('.menu');
  if (menu) {
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { menu.removeAttribute('open'); });
    });
  }

  // Contact form: validate, send to /api/contact, show the result
  var form = root.querySelector('form.form');
  if (form) {
    var status = form.querySelector('.f-status');
    var say = function (kind, text) {
      if (!status) return;
      status.setAttribute('data-s', kind);
      status.textContent = text;
    };
    var mark = function (el, bad) {
      if (bad) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    };
    var val = function (id) {
      var el = form.elements[id];
      return el ? String(el.value || '').trim() : '';
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.hasAttribute('data-busy')) return;
      var name = form.elements['f-name'];
      var email = form.elements['f-email'];
      var msg = form.elements['f-msg'];
      var okName = val('f-name').length > 1;
      var okEmail = /^[^@ ]+@[^@ ]+[.][^@ ]+$/.test(val('f-email'));
      var okMsg = val('f-msg').length > 4;
      mark(name, !okName);
      mark(email, !okEmail);
      mark(msg, !okMsg);
      if (!okName || !okEmail || !okMsg) {
        say('err', 'Please add your name, a valid email address and a short message.');
        var first = !okName ? name : (!okEmail ? email : msg);
        if (first && first.focus) first.focus();
        return;
      }
      form.setAttribute('data-busy', '1');
      say('wait', 'Sending your message...');
      var payload = JSON.stringify({
        name: val('f-name'),
        email: val('f-email'),
        phone: val('f-wa'),
        tour: val('f-tour'),
        dates: val('f-date'),
        message: val('f-msg'),
        company: val('company')
      });
      var done = function () { form.removeAttribute('data-busy'); };
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).then(function (r) {
        if (!r.ok) throw new Error('send failed');
        form.reset();
        say('ok', 'Thank you. Your message is with our team, and we usually reply within two hours.');
        done();
      }).catch(function () {
        say('err', 'Sorry, your message could not be sent. Please message us on WhatsApp at +66 96 407 5194 or email contact@lovenaturekrabi.com.');
        done();
      });
    });
  }
})();
