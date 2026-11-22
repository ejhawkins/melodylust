// A guard for a page that arrives without its stylesheet. Each deploy renames the site's CSS (styles-<hash>.css) and
// the old file is gone, so a page saved before a deploy (a tab left open, Safari's back-forward copy, or the service
// worker's offline copy) asks for CSS that now 404s and shows bare. This snippet runs first thing in <head>: when the
// site's own stylesheet fails to load it asks the service worker to update and reloads once, which fetches the current
// page and its current CSS. The once-per-tab flag means a page that still can't load (offline, say) never loops.
export const STYLESHEET_RETRY_KEY = 'ml-css-retry';

// React hoists stylesheet links above this script, so it both listens for a failure and, once the page has loaded,
// checks for one that failed before it was listening (a stylesheet with no sheet).
export const stylesheetRetryScript = `(function(){var k=${JSON.stringify(STYLESHEET_RETRY_KEY)};var own=function(t){return t&&t.tagName==='LINK'&&String(t.rel).toLowerCase()==='stylesheet'&&String(t.href).indexOf(location.origin+'/assets/')===0};var retry=function(){try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(_){return}var go=function(){location.reload()};var sw=navigator.serviceWorker;if(sw&&sw.getRegistrations){sw.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.update()}))}).then(go,go)}else go()};document.addEventListener('error',function(e){if(own(e.target))retry()},true);window.addEventListener('load',function(){var ls=document.querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<ls.length;i++){if(own(ls[i])&&!ls[i].sheet){retry();return}}})})();`;
