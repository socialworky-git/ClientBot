(function(){
  var style=document.createElement('style');
  style.textContent=[
    '.sw-header{background:#841617;padding:0 24px;}',
    '.sw-header-inner{max-width:820px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;height:56px;}',
    '.sw-header .wordmark{display:flex;align-items:center;gap:0;text-decoration:none;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;}'  ,
    '.sw-header .wordmark::after{content:none;}',
    '.sw-header .wordmark .brand{font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#fff;}',
    '.sw-header .wordmark .sep{color:rgba(255,255,255,.4);margin:0 8px;font-size:16px;}',
    '.sw-header .wordmark .sub{font-weight:500;font-size:14px;color:rgba(255,255,255,.8);}',
    '.sw-header .wordmark .sub:hover{color:#fff;}',
    '.sw-header .signout{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;font-size:13px;font-weight:600;padding:5px 13px;border-radius:6px;cursor:pointer;}',
    '.sw-header .signout:hover{background:rgba(255,255,255,.28);}'
  ].join('');
  document.head.appendChild(style);

  var html='<div class="sw-header"><div class="sw-header-inner">'
    +'<a href="/msw/" class="wordmark">'
    +'<span class="brand">Socialworky</span>'
    +'<span class="sep">/</span>'
    +'<span class="sub">Graduate Student Tools</span>'
    +'</a>'
    +'<button class="signout" id="signOutBtn">Sign out</button>'
    +'</div></div>';
  document.currentScript.insertAdjacentHTML('afterend',html);

  document.addEventListener('click',function(e){
    if(e.target&&e.target.id==='signOutBtn'){
      if(window.Clerk) window.Clerk.signOut().then(function(){ window.location.replace('/msw/'); });
    }
  });
})();
