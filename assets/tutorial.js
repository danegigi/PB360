/* Shared tiny markdown renderer for the Shipping360 tutorial suite.
   Renders the #source <script type="text/markdown"> block into #doc,
   builds the sidebar TOC (#toc) from H2s, adds copy buttons, scroll-spy,
   a back-to-top button, and a mobile menu toggle.
   Supports: h2-h4, paragraphs, ul/ol, tables, fenced code, blockquotes
   (a leading ⚠ makes a warning-styled quote), inline code, **bold**,
   [text](url) external + [text](#anchor) in-page links, and bare URLs. */
(function () {
  function escapeHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function inline(s){
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\[([^\]]+)\]\((#[^\s)]+)\)/g,'<a href="$2">$1</a>');
    s = s.replace(/\[([^\]]+)\]\(([\w./-]+\.html(?:#[^\s)]+)?)\)/g,'<a href="$2">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s)]+)(?=[\s).,]|$)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/`([^`]+)`/g,function(_,c){return '<code>'+c+'</code>';});
    s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    return s;
  }
  function slug(t){return t.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');}

  function render(md){
    const lines = md.replace(/\r/g,'').split('\n');
    let html='', i=0, tocItems=[];
    while(i<lines.length){
      let line=lines[i];
      if(/^```/.test(line)){
        const lang=line.slice(3).trim(); let buf=[]; i++;
        while(i<lines.length && !/^```/.test(lines[i])){ buf.push(lines[i]); i++; }
        i++;
        html += '<pre>'+(lang?'<span class="lang">'+lang+'</span>':'')+'<button class="copy-btn">Copy</button><code>'+escapeHtml(buf.join('\n'))+'</code></pre>';
        continue;
      }
      if(/^---\s*$/.test(line)){ html+='<hr>'; i++; continue; }
      let h=line.match(/^(#{1,4})\s+(.*)$/);
      if(h){
        const level=h[1].length, text=h[2].trim();
        if(level===1){ i++; continue; }
        const id=slug(text.replace(/^\d+\.\s*/,'').replace(/\s*\/\s*/g,'--'));
        if(level===2 && id==='table-of-contents'){
          i++; while(i<lines.length && !/^##\s/.test(lines[i]) && !/^---\s*$/.test(lines[i])){ i++; } continue;
        }
        if(level===2) tocItems.push({id,text:text.replace(/^\d+\.\s*/,'')});
        html += '<h'+level+' id="'+id+'">'+inline(escapeHtml(text))+'</h'+level+'>';
        i++; continue;
      }
      if(/^>\s?/.test(line)){
        let buf=[];
        while(i<lines.length && /^>\s?/.test(lines[i])){ buf.push(lines[i].replace(/^>\s?/,'')); i++; }
        const joined = buf.join(' ');
        const warn = /^⚠|WARNING|Important:/.test(joined.trim());
        html+='<blockquote'+(warn?' class="warn"':'')+'>'+buf.map(function(b){return b.trim()===''?'':'<p>'+inline(escapeHtml(b))+'</p>';}).join('')+'</blockquote>';
        continue;
      }
      if(/^\|/.test(line) && i+1<lines.length && /^\|[\s:|-]+\|/.test(lines[i+1])){
        const header=line.split('|').slice(1,-1).map(function(c){return c.trim();});
        i+=2; let rows=[];
        while(i<lines.length && /^\|/.test(lines[i])){ rows.push(lines[i].split('|').slice(1,-1).map(function(c){return c.trim();})); i++; }
        let t='<table><thead><tr>'+header.map(function(c){return '<th>'+inline(escapeHtml(c))+'</th>';}).join('')+'</tr></thead><tbody>';
        t+=rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+inline(escapeHtml(c))+'</td>';}).join('')+'</tr>';}).join('');
        t+='</tbody></table>'; html+=t; continue;
      }
      if(/^\s*[-*]\s+/.test(line)){
        let buf=[]; while(i<lines.length && /^\s*[-*]\s+/.test(lines[i])){ buf.push(lines[i].replace(/^\s*[-*]\s+/,'')); i++; }
        html+='<ul>'+buf.map(function(b){return '<li>'+inline(escapeHtml(b))+'</li>';}).join('')+'</ul>'; continue;
      }
      if(/^\s*\d+\.\s+/.test(line)){
        let buf=[]; while(i<lines.length && /^\s*\d+\.\s+/.test(lines[i])){ buf.push(lines[i].replace(/^\s*\d+\.\s+/,'')); i++; }
        html+='<ol>'+buf.map(function(b){return '<li>'+inline(escapeHtml(b))+'</li>';}).join('')+'</ol>'; continue;
      }
      if(line.trim()===''){ i++; continue; }
      let buf=[line]; i++;
      while(i<lines.length && lines[i].trim()!=='' && !/^(#{1,4}\s|```|>\s?|\s*[-*]\s|\s*\d+\.\s|\||---\s*$)/.test(lines[i])){ buf.push(lines[i]); i++; }
      html+='<p>'+inline(escapeHtml(buf.join(' ')))+'</p>';
    }
    return {html, tocItems};
  }

  const srcEl = document.getElementById('source');
  if(!srcEl) return;
  const out = render(srcEl.textContent);
  document.getElementById('doc').innerHTML = out.html;

  const toc = document.getElementById('toc');
  if(toc){
    out.tocItems.forEach(function(it){
      const li=document.createElement('li');
      const a=document.createElement('a');
      a.href='#'+it.id; a.textContent=it.text; a.dataset.id=it.id; a.className='toc-link';
      li.appendChild(a); toc.appendChild(li);
    });
  }

  document.querySelectorAll('.copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      const code=btn.parentElement.querySelector('code').textContent;
      navigator.clipboard.writeText(code).then(function(){
        btn.textContent='Copied!'; btn.classList.add('done');
        setTimeout(function(){ btn.textContent='Copy'; btn.classList.remove('done'); },1600);
      });
    });
  });

  const headings=[].slice.call(document.querySelectorAll('h2[id]'));
  const tocLinks=[].slice.call(document.querySelectorAll('#toc a'));
  const topbtn=document.getElementById('topbtn');
  function onScroll(){
    const y=window.scrollY+120; let cur=headings[0];
    for(const hh of headings){ if(hh.offsetTop<=y) cur=hh; }
    tocLinks.forEach(function(a){ a.classList.toggle('active', cur && a.dataset.id===cur.id); });
    if(topbtn) topbtn.classList.toggle('show', window.scrollY>400);
  }
  window.addEventListener('scroll', onScroll); onScroll();
  if(topbtn) topbtn.addEventListener('click', function(){ window.scrollTo({top:0,behavior:'smooth'}); });

  const sidebar=document.getElementById('sidebar');
  const mt=document.getElementById('menuToggle');
  if(mt && sidebar){
    mt.addEventListener('click', function(){ sidebar.classList.toggle('open'); });
    tocLinks.forEach(function(a){ a.addEventListener('click', function(){ sidebar.classList.remove('open'); }); });
  }
})();
