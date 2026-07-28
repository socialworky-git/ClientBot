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
    '.sw-header .signout:hover{background:rgba(255,255,255,.28);}'
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

  /* Fade-in for the page reveal after Clerk auth */
  var fadeStyle=document.createElement('style');
  fadeStyle.textContent='@keyframes sw-msw-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}' +
    '#page{animation:sw-msw-in .35s ease both;}' +
    '@media(prefers-reduced-motion:reduce){#page{animation:none;}}';
  document.head.appendChild(fadeStyle);

  document.addEventListener('click',function(e){
    if(e.target&&e.target.id==='signOutBtn'){
      if(window.Clerk) window.Clerk.signOut().then(function(){ window.location.replace('/msw/'); });
    }
    /* Fade-exit when navigating to the main site */
    var a=e.target.closest?e.target.closest('a'):null;
    if(a){
      var href=a.getAttribute('href')||'';
      var isMsw=href.indexOf('/msw/')===0||href.indexOf('/')!==0;
      var isMain=href==='https://socialworky.com'||href==='/';
      if(isMain&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
        e.preventDefault();
        var dest=href;
        document.body.style.transition='opacity .28s ease';
        document.body.style.opacity='0';
        setTimeout(function(){window.location.href=dest;},290);
      }
    }
  });
})();
