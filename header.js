(function(){
  var isHome = location.pathname === '/' || location.pathname === '/index.html';
  var workshopsHref = isHome ? '#workshops' : '/';
  var html =
    '<header class="sw-header">' +
      '<a href="/" class="brand">Social<span class="acc">worky</span></a>' +
      '<nav>' +
        '<a class="nav-link" href="' + workshopsHref + '">Workshops</a>' +
        '<a class="nav-link" href="/tools/">Tools</a>' +
      '</nav>' +
    '</header>';
  var css =
    '.sw-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:20px;margin-bottom:28px;border-bottom:1px solid var(--line,#E4E4E7);flex-wrap:wrap;gap:18px;}' +
    '.sw-header .brand{font-weight:700;font-size:24px;letter-spacing:-0.3px;text-decoration:none;color:var(--ink,#1A1A1A);}' +
    '.sw-header .brand .acc{color:var(--accent,#EB786B);}' +
    '.sw-header nav{display:flex;gap:20px;align-items:center;flex-wrap:wrap;}' +
    '.sw-header .nav-link{font-size:12.5px;font-weight:700;color:var(--muted,#5B5B5B);text-transform:uppercase;letter-spacing:1px;text-decoration:none;transition:color .15s;}' +
    '.sw-header .nav-link:hover{color:var(--accentDeep,#C2452F);}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  var wrap = document.querySelector('.wrap');
  if (wrap) {
    wrap.insertAdjacentHTML('afterbegin', html);
  }
})();
