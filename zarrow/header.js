(function(){
  var style=document.createElement('style');
  style.textContent=[
    '.sw-header{background:#841617;padding:0 24px;}',
    '.sw-header-inner{max-width:820px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;height:56px;}',
    '.sw-header .wordmark{font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#fff;text-decoration:none;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;}',
    '.sw-header .wordmark .sub{font-weight:500;opacity:.75;margin-left:6px;font-size:14px;}',
    '.sw-header .signout{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);color:#fff;font-family:\'Hanken Grotesk\',Arial,Helvetica,system-ui,sans-serif;font-size:13px;font-weight:600;padding:5px 13px;border-radius:6px;cursor:pointer;}',
    '.sw-header .signout:hover{background:rgba(255,255,255,.28);}'
  ].join('');
  document.head.appendChild(style);

  var html='<div class="sw-header"><div class="sw-header-inner">'
    +'<a class="wordmark" href="/zarrow/">Socialworky<span class="sub">Graduate Student Tools</span></a>'
    +'<button class="signout" id="signOutBtn">Sign out</button>'
    +'</div></div>';
  document.currentScript.insertAdjacentHTML('afterend',html);

  document.addEventListener('click',function(e){
    if(e.target&&e.target.id==='signOutBtn'){
      if(window.Clerk) window.Clerk.signOut().then(function(){ window.location.replace('/zarrow/'); });
    }
  });
})();
