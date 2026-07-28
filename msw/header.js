(function(){
  var style=document.createElement('style');
  style.textContent=[
    '.sw-header{background:#841617;padding:0 24px;}',
    '.sw-header-inner{max-width:820px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;height:56px;}',
    '.sw-header .wordmark{display:flex;align-items:center;gap:0;}',
    '.sw-header .wordmark .brand{font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#fff;text-decoration:none;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;}',
    '.sw-header .wordmark .brand::after,.sw-header .wordmark .brand::before{content:none !important;display:none !important;}',
    '.sw-header .wordmark .sep{color:rgba(255,255,255,.4);margin:0 8px;font-size:16px;}',
    '.sw-header .wordmark .sub{font-weight:500;font-size:14px;color:rgba(255,255,255,.8);text-decoration:none;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;}',
    '.sw-header .wordmark .sub:hover{color:#fff;}',
    '.sw-header .signout{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;font-size:13px;font-weight:600;padding:5px 13px;border-radius:6px;cursor:pointer;}',
    '.sw-header .signout:hover{background:rgba(255,255,255,.28);}',
    /* color-curtain */
    '@keyframes sw-curtain-in{from{transform:translateY(100%);}to{transform:translateY(0);}}',
    '@keyframes sw-curtain-out{from{transform:translateY(0);}to{transform:translateY(-100%);}}',
    '#sw-curtain{position:fixed;inset:0;z-index:99999;pointer-events:none;transform:translateY(100%);}',
    '#sw-curtain.entering{pointer-events:all;animation:sw-curtain-in .38s cubic-bezier(.76,0,.24,1) forwards;}',
    '#sw-curtain.leaving{pointer-events:none;animation:sw-curtain-out .38s cubic-bezier(.76,0,.24,1) forwards;}',
    /* page reveal fade-in */
    '@keyframes sw-msw-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}',
    '#page{animation:sw-msw-in .35s ease both;}',
    '@media(prefers-reduced-motion:reduce){#sw-curtain{display:none;}#page{animation:none;}}'
  ].join('');
  document.head.appendChild(style);

  var html='<div class="sw-header"><div class="sw-header-inner">'
    +'<div class="wordmark">'
    +'<a href="https://socialworky.com" class="brand">Socialworky</a>'
    +'<span class="sep">/</span>'
    +'<a href="/msw/" class="sub">Graduate Student Tools</a>'
    +'</div>'
    +'<button class="signout" id="signOutBtn">Sign out</button>'
    +'</div></div>';
  document.currentScript.insertAdjacentHTML('afterend',html);

  /* Reveal: if we arrived from the main site, sweep the crimson curtain out */
  (function(){
    if(sessionStorage.getItem('sw-transition')!=='from-main') return;
    sessionStorage.removeItem('sw-transition');
    var el=document.createElement('div');
    el.id='sw-curtain';
    el.style.background='#841617';
    el.style.transform='translateY(0)';
    el.innerHTML='<div style="'+SW_MARK_STYLES+'">'
      +'<div style="'+SW_FONT+'font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.02em;">Social<span style="opacity:.7">worky</span></div>'
      +'</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        el.className='leaving';
        el.addEventListener('animationend',function(){ el.remove(); });
      });
    });
  })();

  var SW_MARK_STYLES='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;';
  var SW_FONT='font-family:\'Hanken Grotesk\',Arial,Helvetica,sans-serif;';

  function swCurtain(color,markup,cb){
    var el=document.getElementById('sw-curtain');
    if(!el){ el=document.createElement('div'); el.id='sw-curtain'; document.body.appendChild(el); }
    el.style.background=color;
    el.innerHTML='<div style="'+SW_MARK_STYLES+'">'+markup+'</div>';
    el.className='entering';
    el.addEventListener('animationend',function handler(){ el.removeEventListener('animationend',handler); setTimeout(cb,200); });
  }

  document.addEventListener('click',function(e){
    if(e.target&&e.target.id==='signOutBtn'){
      if(window.Clerk) window.Clerk.signOut().then(function(){ window.location.replace('/msw/'); });
    }
    var a=e.target.closest?e.target.closest('a'):null;
    if(!a) return;
    var href=a.getAttribute('href')||'';
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    /* Coral curtain when navigating back to the main site */
    if(href==='https://socialworky.com'||href==='/'){
      e.preventDefault();
      var dest=href;
      sessionStorage.setItem('sw-transition','from-msw');
      var markup=
        '<div style="'+SW_FONT+'font-size:36px;font-weight:800;color:#fff;letter-spacing:-0.02em;">Social<span style="opacity:.7">worky</span></div>';
      swCurtain('#EB786B',markup,function(){ window.location.href=dest; });
    }
  });
})();
