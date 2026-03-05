// main.js — Portfolio interactions

// ── TABS ─────────────────────────────────────────────────────
var TAB_HASH_MAP = {
  'static':    'tab-static',
  'web':       'tab-web',
  'animation': 'tab-animation',
  'wuhan':     'tab-wuhan',
  'sbic':      'tab-sbic',
  'tapwater':  'tab-tapwater'
};

function activateTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
  var btn = document.querySelector('[data-tab="' + tabId + '"]');
  var panel = document.getElementById(tabId);
  if (btn) btn.classList.add('active');
  if (panel) {
    panel.classList.add('active');
    // lazy-load iframes inside this tab (only fires once per iframe)
    panel.querySelectorAll('iframe[data-src]').forEach(function(f) {
      f.src = f.getAttribute('data-src');
      f.removeAttribute('data-src');
      f.addEventListener('load', function() {
        var frame = f.closest('.wc-frame');
        if (frame) frame.classList.add('loaded');
      }, { once: true });
    });
  }
}

function initTabs() {
  var tabs = document.querySelectorAll('.tab-btn');
  if (!tabs.length) return;

  tabs.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tabId = btn.getAttribute('data-tab');
      activateTab(tabId);
      // update hash without scroll
      var reverseMap = {};
      Object.keys(TAB_HASH_MAP).forEach(function(k) { reverseMap[TAB_HASH_MAP[k]] = k; });
      var hash = reverseMap[tabId];
      if (hash) history.replaceState(null, '', '#' + hash);
    });
  });

  // activate from URL hash on load
  var hash = window.location.hash.replace('#', '');
  var tabId = TAB_HASH_MAP[hash];
  if (tabId) {
    activateTab(tabId);
  } else {
    // activate first tab by default
    tabs[0].classList.add('active');
    var firstPanel = document.getElementById(tabs[0].getAttribute('data-tab'));
    if (firstPanel) firstPanel.classList.add('active');
  }

  // also respond to hashchange (e.g., clicking dropdown links on same page)
  window.addEventListener('hashchange', function() {
    var h = window.location.hash.replace('#', '');
    var tid = TAB_HASH_MAP[h];
    if (tid) activateTab(tid);
  });
}

// ── MODAL (pan/zoom image viewer) ─────────────────────────────
var _backdrop, _title, _imgEl, _projLink;
var _scale = 1, _panX = 0, _panY = 0;
var _isDragging = false, _dragX = 0, _dragY = 0, _dragPanX = 0, _dragPanY = 0;
var _zoomLevel;
var _gallery = [], _galleryIdx = 0;

function _applyTransform() {
  var img = _imgEl ? _imgEl.querySelector('img') : null;
  if (!img) return;
  img.style.transform = 'translate(' + _panX + 'px, ' + _panY + 'px) scale(' + _scale + ')';
  if (_zoomLevel) _zoomLevel.textContent = Math.round(_scale * 100) + '%';
}

function _resetView() {
  _scale = 1; _panX = 0; _panY = 0;
  if (_backdrop) _backdrop.classList.remove('dragging');
  _applyTransform();
  if (_zoomLevel) _zoomLevel.textContent = 'Fit';
}

function initModal() {
  _backdrop = document.getElementById('modalBackdrop');
  if (!_backdrop) return;
  _title    = document.getElementById('modalTitle');
  _imgEl    = document.getElementById('modalImg');
  _projLink = document.getElementById('modalProjectLink');
  _zoomLevel = document.getElementById('modalZoomLevel');

  var closeBtn = document.getElementById('modalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  var prevArrow = document.getElementById('modalPrev');
  var nextArrow = document.getElementById('modalNext');
  if (prevArrow) prevArrow.addEventListener('click', function(e) { e.stopPropagation(); _galleryNav(-1); });
  if (nextArrow) nextArrow.addEventListener('click', function(e) { e.stopPropagation(); _galleryNav(1); });

  document.addEventListener('keydown', function(e) {
    if (!_backdrop || !_backdrop.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft')  _galleryNav(-1);
    if (e.key === 'ArrowRight') _galleryNav(1);
  });

  // Zoom buttons
  var zoomIn  = document.getElementById('modalZoomIn');
  var zoomOut = document.getElementById('modalZoomOut');
  var zoomRst = document.getElementById('modalZoomReset');
  if (zoomIn)  zoomIn.addEventListener('click',  function(e) { e.stopPropagation(); _zoom(1.4, null, null); });
  if (zoomOut) zoomOut.addEventListener('click', function(e) { e.stopPropagation(); _zoom(1/1.4, null, null); });
  if (zoomRst) zoomRst.addEventListener('click', function(e) { e.stopPropagation(); _resetView(); });

  // Scroll to zoom (centered on cursor)
  _backdrop.addEventListener('wheel', function(e) {
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.15 : 1/1.15;
    var rect = _backdrop.getBoundingClientRect();
    _zoom(factor, e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
  }, { passive: false });

  // Drag to pan
  _backdrop.addEventListener('mousedown', function(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    e.preventDefault();
    _isDragging = true;
    _dragX = e.clientX; _dragY = e.clientY;
    _dragPanX = _panX;  _dragPanY = _panY;
    _backdrop.classList.add('dragging');
  });
  window.addEventListener('mousemove', function(e) {
    if (!_isDragging) return;
    _panX = _dragPanX + (e.clientX - _dragX);
    _panY = _dragPanY + (e.clientY - _dragY);
    _applyTransform();
  });
  window.addEventListener('mouseup', function() {
    if (!_isDragging) return;
    _isDragging = false;
    if (_backdrop) _backdrop.classList.remove('dragging');
  });

  // Double-click to reset
  _backdrop.addEventListener('dblclick', function(e) {
    if (e.target.closest('button') || e.target.closest('a')) return;
    _resetView();
  });
}

function _zoom(factor, cx, cy) {
  var newScale = Math.min(Math.max(_scale * factor, 0.5), 12);
  if (cx !== null && cy !== null) {
    _panX = cx - (cx - _panX) * (newScale / _scale);
    _panY = cy - (cy - _panY) * (newScale / _scale);
  }
  _scale = newScale;
  _applyTransform();
}

function _galleryNav(dir) {
  if (_gallery.length < 2) return;
  var next = _galleryIdx + dir;
  if (next < 0 || next >= _gallery.length) return;
  _galleryIdx = next;
  var item = _gallery[_galleryIdx];
  openModal(item.title, item.imgSrc, item.project);
}

function _updateGalleryArrows() {
  var prevArrow = document.getElementById('modalPrev');
  var nextArrow = document.getElementById('modalNext');
  var hasNav = _gallery.length > 1;
  if (prevArrow) {
    prevArrow.classList.toggle('visible', hasNav);
    prevArrow.disabled = _galleryIdx === 0;
  }
  if (nextArrow) {
    nextArrow.classList.toggle('visible', hasNav);
    nextArrow.disabled = _galleryIdx === _gallery.length - 1;
  }
}

function openModal(title, imgSrc, projectHref) {
  if (!_backdrop) return;
  if (_title) _title.textContent = title;
  if (_imgEl) {
    _imgEl.innerHTML = '';
    if (imgSrc) {
      var img = document.createElement('img');
      img.decoding = 'async';
      img.draggable = false;
      img.alt = title;
      img.src = imgSrc;
      _imgEl.appendChild(img);
    }
  }
  if (_projLink) {
    if (projectHref) {
      _projLink.href = projectHref;
      _projLink.style.display = 'inline-flex';
    } else {
      _projLink.style.display = 'none';
    }
  }
  _resetView();
  _updateGalleryArrows();
  _backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (_backdrop) _backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

// ── MAP / THUMB CLICK TRIGGERS ───────────────────────────────
function initClickableImages() {
  document.querySelectorAll('[data-modal-title]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.closest('a') && e.target.closest('a') !== el) return;
      var track = el.closest('.carousel-track');
      if (track) {
        var siblings = track.querySelectorAll('[data-modal-title]');
        _gallery = [];
        _galleryIdx = 0;
        siblings.forEach(function(sib, i) {
          _gallery.push({
            title:   sib.getAttribute('data-modal-title') || '',
            imgSrc:  sib.getAttribute('data-modal-img')   || null,
            project: sib.getAttribute('data-modal-project') || null
          });
          if (sib === el) _galleryIdx = i;
        });
      } else {
        _gallery = [];
        _galleryIdx = 0;
      }
      openModal(
        el.getAttribute('data-modal-title') || '',
        el.getAttribute('data-modal-img')   || null,
        el.getAttribute('data-modal-project') || null
      );
    });
  });
}

// ── CAROUSELS ─────────────────────────────────────────────────
function initCarousels() {
  document.querySelectorAll('.map-carousel').forEach(function(carousel) {
    var track = carousel.querySelector('.carousel-track');
    var cards = track ? track.querySelectorAll('.map-card') : [];
    if (!track || cards.length <= 1) return;

    var group   = carousel.closest('.map-group');
    var prevBtn = group ? group.querySelector('.carousel-prev') : null;
    var nextBtn = group ? group.querySelector('.carousel-next') : null;
    var counter = group ? group.querySelector('.carousel-counter') : null;
    var current = 0;
    var total   = cards.length;
    var cardWidth = cards[0].offsetWidth || 694;

    // Lazy-load: strip src from all cards except first; restore on demand
    cards.forEach(function(card, i) {
      if (i === 0) return;
      var img = card.querySelector('img');
      if (img && img.getAttribute('src')) {
        img.setAttribute('data-lazy', img.getAttribute('src'));
        img.removeAttribute('src');
      }
    });

    function loadCard(card) {
      var img = card ? card.querySelector('img[data-lazy]') : null;
      if (img) { img.decoding = 'async'; img.src = img.getAttribute('data-lazy'); img.removeAttribute('data-lazy'); }
    }

    function update() {
      track.style.transform = 'translateX(-' + (current * cardWidth) + 'px)';
      loadCard(cards[current]);
      if (current + 1 < total) loadCard(cards[current + 1]); // preload next
      if (current + 2 < total) loadCard(cards[current + 2]); // preload next+1
      if (counter) counter.textContent = (current + 1) + ' / ' + total;
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) nextBtn.disabled = current === total - 1;
    }

    if (prevBtn) prevBtn.addEventListener('click', function() {
      if (current > 0) { current--; update(); }
    });
    if (nextBtn) nextBtn.addEventListener('click', function() {
      if (current < total - 1) { current++; update(); }
    });

    update();
  });
}

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  initTabs();
  initModal();
  initClickableImages();
  initCarousels();
});
