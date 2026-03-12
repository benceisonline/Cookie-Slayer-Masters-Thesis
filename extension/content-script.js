(function(){
  if (window.__inspectish_loaded) return;
  window.__inspectish_loaded = true;

  const hoverClass = 'ci-hover-highlight';
  const overlayId = 'ci-click-overlay';
  const toggleId = 'ci-toggle-btn';
  let lastHovered = null;
  let active = false;
  // `selectedElement` is used for visual overlay; `selectedTargetElement` is the actual page element
  // that followups / LLM prompts will reference.
  let selectedElement = null;
  let selectedTargetElement = null;

  function createUI(){
    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement('div');
    overlay.id = overlayId;
    Object.assign(overlay.style, {
      position: 'absolute',
      zIndex: '2147483647',
      pointerEvents: 'none',
      border: '2px solid rgba(52,152,219,0.95)',
      background: 'rgba(52,152,219,0.06)',
      boxSizing: 'border-box',
      display: 'none',
      opacity: '0',
      transition: 'opacity 180ms ease, transform 160ms ease',
      borderRadius: '10px'
    });
    document.documentElement.appendChild(overlay);

    // No popup element: selection shows a rounded overlay only.

    // Styles are provided by styles.css; no runtime style injection needed.

    // create toggle button
    const btn = document.createElement('button');
    btn.id = toggleId;
    btn.setAttribute('aria-label','Inspect-ish toggle');
    btn.title = 'Toggle Inspect-ish';
    btn.type = 'button';
    // larger rectangular toggle with text and fixed position
    btn.textContent = 'Toggle Cookie Inspector';
    Object.assign(btn.style, {
      position: 'fixed',
      right: '14px',
      top: '14px',
      zIndex: '2147483647',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 14px',
      minWidth: '180px',
      height: '40px',
      borderRadius: '12px',
      border: '1px solid rgba(0,0,0,0.08)',
      background: '#fff',
      color: '#111827',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      cursor: 'pointer'
    });
    document.documentElement.appendChild(btn);

    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      toggleActive();
    }, true);

    // create edit container (hidden by default) below the toggle button
    const editContainer = document.createElement('div');
    editContainer.id = 'ci-edit-container';
    Object.assign(editContainer.style, {
      position: 'fixed',
      zIndex: '2147483647',
      display: 'none',
      background: 'rgba(255,255,255,0.98)',
      padding: '6px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      alignItems: 'center',
      left: '0px',
      top: '0px'
    });

    const form = document.createElement('form');
    form.id = 'ci-edit-form';

    const textarea = document.createElement('textarea');
    textarea.id = 'ci-edit-input';
    textarea.placeholder = 'What can I help you with';
    Object.assign(textarea.style, { width: '260px', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', minHeight: '44px', maxHeight: '220px', overflow: 'auto', resize: 'vertical', boxSizing: 'border-box', fontSize: '14px' });

    const submit = document.createElement('button');
    submit.id = 'ci-edit-submit';
    submit.type = 'submit';
    submit.textContent = 'Apply';
    Object.assign(submit.style, { marginLeft: '8px', padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#3498db', color: '#fff' });
    // start disabled to prevent empty submissions until user types
    submit.disabled = true;

    const spinner = document.createElement('div');
    spinner.className = 'ci-spinner';
    spinner.style.display = 'none';
    spinner.setAttribute('aria-hidden','true');

    form.appendChild(textarea);
    form.appendChild(submit);
    form.appendChild(spinner);
    editContainer.appendChild(form);
    document.documentElement.appendChild(editContainer);

    function adjustTextareaHeight(el){
      if (!el) return;
      el.style.height = 'auto';
      const max = 220;
      const h = Math.min(el.scrollHeight, max);
      el.style.height = h + 'px';
    }

    function sanitizeServerText(s){
      if (!s) return '';
      s = String(s).trim();
      // try to parse JSON first
      try{
        const obj = JSON.parse(s);
        if (typeof obj === 'string') s = obj;
        else if (obj && typeof obj === 'object'){
          s = obj.response || obj.text || obj.answer || obj.result || obj.data || JSON.stringify(obj);
        }
      }catch(e){
        // attempt to extract a "response" property via regex if JSON.parse failed
        const m = s.match(/\bresponse\b\s*[:\-–—]\s*["']([\s\S]*?)["']/i);
        if (m && m[1]) s = m[1];
      }

      // remove code fences
      s = s.replace(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```/g, '$1');
      // remove surrounding braces if they remain
      s = s.replace(/^\s*{\s*/,'').replace(/\s*}\s*$/,'');
      // strip leading/trailing quotes/backticks
      s = s.replace(/^\s*['"`]+|['"`]+\s*$/g,'');
      // allow only <b> tags; remove any other HTML tags for safety
      s = s.replace(/<(\/?)(?!b\b)[^>]*>/gi, '');
      return s.trim();
    }

    // --- post-it system ---
    if (!window.__ci_postit_state) window.__ci_postit_state = { count: 0, notes: {}, currentParent: null };

    function randomPastel(){
      // pick a random hue and soften saturation/lightness for pastel tones
      const hue = Math.floor(Math.random()*360);
      const sat = 55 + Math.floor(Math.random()*20); // 55-74
      const light = 86 + Math.floor(Math.random()*8); // 86-93
      const bg = `hsl(${hue} ${sat}% ${light}%)`;
      const border = `hsl(${hue} ${Math.max(40, sat-15)}% ${Math.max(65, light-20)}%)`;
      const fg = `hsl(${hue} ${Math.max(20, sat-40)}% ${Math.max(15, 20)}%)`;
      return { hue, bg, border, fg };
    }

    function ensureConnectorSVG(){
      let svg = document.getElementById('ci-connector-svg');
      if (!svg){
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.id = 'ci-connector-svg';
        Object.assign(svg.style, { position: 'fixed', left:0, top:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 2147483646 });
        svg.setAttribute('width','100%');
        svg.setAttribute('height','100%');
        document.documentElement.appendChild(svg);
      }
      return svg;
    }

    function createPostIt(text, targetEl, options = {}){
      const id = 'ci-postit-' + (window.__ci_postit_state.count++);
      const note = document.createElement('div');
      note.className = 'ci-postit';
      note.id = id;
      note.setAttribute('data-ci-id', id);

      const header = document.createElement('div');
      header.className = 'ci-postit-header';
      header.textContent = 'Note';

      const close = document.createElement('button');
      close.className = 'ci-postit-close';
      close.textContent = '×';
      close.title = 'Close note';
      header.appendChild(close);

      const body = document.createElement('div');
      body.className = 'ci-postit-body';
      body.textContent = text;

      note.appendChild(header);
      note.appendChild(body);
      document.body.appendChild(note);

      // color variation (pastel range) and numbering
      const idx = window.__ci_postit_state.count; // 1-based after increment
      const pal = randomPastel();
      const bg = pal.bg;
      const border = pal.border;
      const fg = pal.fg;
      note.style.background = bg;
      note.style.border = `1px solid ${border}`;
      note.style.color = fg;
      // prepare smooth entrance
      note.style.opacity = '0';
      note.style.transform = 'translateY(6px)';
      note.style.transition = 'opacity 220ms ease, transform 220ms ease';

      // determine header text: use provided title (user's prompt) for top-level notes,
      // otherwise fall back to `Note <idx>`.
      const parentId = options.parentId || null;
      const rawTitle = (options.title || '').toString().trim();
      // use the full user prompt as the header if provided (no truncation)
      const titleText = rawTitle ? rawTitle.replace(/\s+/g, ' ') : `Note ${idx}`;
      header.textContent = titleText;
      // also provide the full title as a tooltip
      if (rawTitle) header.title = rawTitle;

      // initial position: near the target element with a safe margin so the edit UI
      // doesn't overlap the element. Fallback to center if no target.
      const margin = 12;
      note.style.left = '50px';
      note.style.top = '50px';
      requestAnimationFrame(() => {
        const nrect = note.getBoundingClientRect();
        let left = margin, top = margin;
        try{
          if (targetEl && targetEl.getBoundingClientRect){
            const trect = targetEl.getBoundingClientRect();
            // prefer placing to the right of the element
            left = trect.right + margin;
            top = trect.top;
            // if there's not enough space on the right, place to the left
            if (left + nrect.width > window.innerWidth - margin) left = Math.max(margin, trect.left - nrect.width - margin);
            // clamp top into viewport
            if (top + nrect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - nrect.height - margin);
            if (top < margin) top = margin;
          } else {
            // fallback center
            left = Math.round((window.innerWidth - nrect.width) / 2);
            top = Math.round((window.innerHeight - nrect.height) / 2);
          }
        }catch(err){
          left = Math.round((window.innerWidth - nrect.width) / 2);
          top = Math.round((window.innerHeight - nrect.height) / 2);
        }
        note.style.left = left + 'px';
        note.style.top = top + 'px';
        // reveal note and connector smoothly after placement
        requestAnimationFrame(() => {
          note.style.opacity = '1';
          note.style.transform = 'translateY(0px)';
          try{ const lineEl = document.getElementById(id + '-line'); if (lineEl) lineEl.style.opacity = '1'; }catch(e){}
          updateConnector(id);
        });
      });

      // create connector line
      const svg = ensureConnectorSVG();
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('stroke', 'rgba(60,60,60,0.7)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '4 4');
      line.setAttribute('id', id + '-line');
      // start hidden for a smooth reveal
      line.style.opacity = '0';
      line.style.transition = 'opacity 220ms ease';
      svg.appendChild(line);

      // apply matching highlight to target element (save previous bg to restore on close)
      // For followups (options.parentId present) we do not re-apply a page-element highlight;
      // followups connect visually to the parent note instead.
      const prevBg = (targetEl && (targetEl.style && (targetEl.style.background || targetEl.style.backgroundColor))) || '';
      if (!parentId){
        try { targetEl.style.transition = 'background 220ms ease, opacity 160ms ease'; targetEl.style.background = bg; } catch (e) {}
      }

      // determine connector target: if a parentId is provided, connect to the parent note element;
      // otherwise connect to the provided targetEl (page element).
      const connectorTargetEl = (parentId && window.__ci_postit_state.notes[parentId]) ? window.__ci_postit_state.notes[parentId].note : targetEl;

      // store
      window.__ci_postit_state.notes[id] = { note, line, targetEl, prevBg, parentId: parentId || null, connectorTargetEl, num: idx, followupCount: 0 };

      // events: close
      close.addEventListener('click', e => {
        e.stopPropagation();
        const entry = window.__ci_postit_state.notes[id];
        if (!entry) return;
        // restore previous background on target
        try { if (entry.targetEl) entry.targetEl.style.background = entry.prevBg || ''; } catch (er) {}
        entry.note.remove();
        entry.line.remove();
        delete window.__ci_postit_state.notes[id];
        // if this note was active, hide overlay and clear parent selection
        try { hideUI(); } catch (e) {}
      });

      // make draggable by header
      let dragging = false; let dx=0, dy=0;
      header.style.cursor = 'move';
      header.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        // hide overlay immediately to avoid lag while dragging
        const overlayEl = document.getElementById(overlayId);
        if (overlayEl) overlayEl.style.display = 'none';
        dragging = true;
        dx = e.clientX - note.getBoundingClientRect().left;
        dy = e.clientY - note.getBoundingClientRect().top;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onUp, { once: true });
        e.preventDefault();
      });
      function onDrag(e){
        if (!dragging) return;
        const nx = Math.min(window.innerWidth - note.offsetWidth - 8, Math.max(8, e.clientX - dx));
        const ny = Math.min(window.innerHeight - note.offsetHeight - 8, Math.max(8, e.clientY - dy));
        note.style.left = nx + 'px';
        note.style.top = ny + 'px';
        updateConnector(id);
        // if this note is the active parent, move the edit container with it while dragging
        try{
          if (window.__ci_postit_state && window.__ci_postit_state.currentParent === id){
            const editContainer = document.getElementById('ci-edit-container');
            if (editContainer){
              const nrect = note.getBoundingClientRect();
              const ecW = editContainer.offsetWidth;
              const ecH = editContainer.offsetHeight;
              const margin = 8;
              let left = nrect.right + margin;
              let top = nrect.top;
              if (left + ecW > window.innerWidth - margin) left = Math.max(margin, nrect.left - ecW - margin);
              if (top + ecH > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - ecH - margin);
              if (top < margin) top = margin;
              editContainer.style.left = Math.round(left) + 'px';
              editContainer.style.top = Math.round(top) + 'px';
              // ensure it's visible while dragging
              editContainer.style.visibility = 'visible';
              editContainer.style.opacity = '1';
              editContainer.style.transform = 'translateY(0px)';
            }
          }
        }catch(err){}
      }
      function onUp(){ dragging = false; document.removeEventListener('mousemove', onDrag);
        // restore overlay for this note if it is still the active parent
        try{
          if (window.__ci_postit_state && window.__ci_postit_state.currentParent === id){
            // small delay to ensure drag final position settled
            setTimeout(() => {
              try { showOverlayFor(note, 0, 0, { setTarget: false, position: 'side' }); } catch(e){}
            }, 40);
          }
        }catch(e){}
      }

      // initial connector update
      updateConnector(id);
      // keep connector updated on scroll/resize
      window.addEventListener('resize', () => updateConnector(id));
      window.addEventListener('scroll', () => updateConnector(id), true);

      // clicking the note should reopen the edit UI for this element (allow further prompts)
      note.addEventListener('click', e => {
        e.stopPropagation();
        try {
          const entry = window.__ci_postit_state.notes[id];
          if (!entry) return;
          // set the selectedTargetElement to the page element this note refers to (so followups reference it)
          selectedTargetElement = entry.targetEl || null;
          // mark the clicked note visually with the rounded overlay but do NOT override selectedTargetElement
          showOverlayFor(note, 0, 0, { setTarget: false, position: 'side' });
            // mark this note as the current parent for followups
            window.__ci_postit_state.currentParent = id;

          // position the edit container to the side of the note (the showOverlayFor call above set overlay)
          const editContainer = document.getElementById('ci-edit-container');
          const textarea = document.getElementById('ci-edit-input');
          if (editContainer && textarea){
            // ensure visible for measurement
            editContainer.style.display = 'flex';
            editContainer.style.visibility = 'hidden';
            editContainer.style.left = '0px';
            editContainer.style.top = '0px';
            const nrect = note.getBoundingClientRect();
            const ecW = editContainer.offsetWidth;
            const ecH = editContainer.offsetHeight;
            const margin = 8;
            // prefer positioning to the right of the note, fallback to left/top/bottom as needed
            let left = nrect.right + margin;
            let top = nrect.top;
            if (left + ecW > window.innerWidth - margin) left = Math.max(margin, nrect.left - ecW - margin);
            if (top + ecH > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - ecH - margin);
            editContainer.style.left = Math.round(left) + 'px';
            editContainer.style.top = Math.round(top) + 'px';
            editContainer.style.visibility = 'visible';
            textarea.value = '';
            textarea.style.height = 'auto';
            textarea.focus();
          }
        } catch (err) {}
      });

      return id;
    }

    // Append a followup entry into an existing parent note instead of creating
    // a separate post-it. This keeps all related responses grouped together.
    function appendFollowupToNote(parentId, text, userPrompt){
      if (!window.__ci_postit_state || !window.__ci_postit_state.notes) return;
      const entry = window.__ci_postit_state.notes[parentId];
      if (!entry || !entry.note) return;
      entry.followupCount = (entry.followupCount || 0) + 1;
      const count = entry.followupCount;

      const container = document.createElement('div');
      container.className = 'ci-postit-followup';
      container.style.marginTop = '8px';
      container.style.paddingTop = '6px';
      container.style.borderTop = '1px dashed rgba(0,0,0,0.06)';

      const heading = document.createElement('div');
      heading.style.display = 'flex';
      heading.style.alignItems = 'center';
      heading.style.justifyContent = 'space-between';
      heading.style.fontWeight = '600';
      heading.style.fontSize = '12px';
      // build heading: "Follow-up <N> - <user prompt>". If no userPrompt, fall back to simple numbering.
      let rawPrompt = (userPrompt || '').toString().trim().replace(/\s+/g,' ');
      const headingText = rawPrompt ? `Follow-up ${count} - ${rawPrompt}` : `Follow-up ${count}`;
      const leftSpan = document.createElement('span');
      leftSpan.textContent = headingText;
      if (rawPrompt) leftSpan.title = rawPrompt;
      heading.appendChild(leftSpan);

      // add a small close button for this followup
      const followClose = document.createElement('button');
      followClose.type = 'button';
      followClose.textContent = '×';
      Object.assign(followClose.style, { marginLeft: '8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', lineHeight: '12px' });
      followClose.title = 'Remove followup';
      followClose.addEventListener('click', (ev) => { ev.stopPropagation(); try{ container.remove(); updateConnector(parentId); }catch(e){} });
      heading.appendChild(followClose);

      const body = document.createElement('div');
      body.className = 'ci-postit-followup-body';
      body.style.marginTop = '4px';
      body.innerHTML = text;

      container.appendChild(heading);
      container.appendChild(body);

      // append inside the note element under existing content
      entry.note.appendChild(container);
      // ensure connector recalculates in case sizes changed
      updateConnector(parentId);
    }

    function updateConnector(id){
      const entry = window.__ci_postit_state.notes[id];
      if (!entry) return;
      const { note, line } = entry;
      const target = entry.connectorTargetEl || entry.targetEl;
      if (!target) return;

      // helper: center point of rect (with scroll offset)
      function centerOf(r){
        return { x: Math.round(r.left + r.width/2 + window.scrollX), y: Math.round(r.top + r.height/2 + window.scrollY) };
      }

      // helper: compute intersection point on rect edge toward an external point
      function edgePoint(rect, toward){
        const cx = rect.left + rect.width/2 + window.scrollX;
        const cy = rect.top + rect.height/2 + window.scrollY;
        let dx = toward.x - cx;
        let dy = toward.y - cy;
        if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { x: cx, y: cy };
        const hx = rect.width/2;
        const hy = rect.height/2;
        const tx = Math.abs(dx) > 1e-6 ? hx / Math.abs(dx) : Infinity;
        const ty = Math.abs(dy) > 1e-6 ? hy / Math.abs(dy) : Infinity;
        const t = Math.min(tx, ty);
        return { x: Math.round(cx + dx * t), y: Math.round(cy + dy * t) };
      }

      const tret = target.getBoundingClientRect();
      const nret = note.getBoundingClientRect();
      const centerNote = centerOf(nret);
      const centerTarget = centerOf(tret);

      // start point: on target rect edge toward the note
      const p1 = edgePoint(tret, centerNote);
      // end point: on note rect edge toward the target
      const p2 = edgePoint(nret, centerTarget);

      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
    }

    textarea.addEventListener('input', () => { adjustTextareaHeight(textarea); submit.disabled = !(textarea.value && textarea.value.trim().length>0); });

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const userInput = textarea.value || '';
      if (!userInput || !userInput.trim()){
        // visibly indicate error: flash border and shake
        textarea.style.transition = 'border-color 140ms ease';
        const prev = textarea.style.borderColor;
        textarea.style.borderColor = 'rgba(231,76,60,0.95)';
        textarea.classList && textarea.classList.add('ci-shake');
        setTimeout(() => { try{ textarea.style.borderColor = prev || ''; textarea.classList && textarea.classList.remove('ci-shake'); textarea.focus(); }catch(e){} }, 380);
        return;
      }
      // capture the element at submit time so response attaches to correct target
      const targetAtSubmit = selectedTargetElement || selectedElement;
      // if the user opened the edit UI by clicking a note, that note id is stored here
      const parentId = (window.__ci_postit_state && window.__ci_postit_state.currentParent) ? window.__ci_postit_state.currentParent : null;
      // build prompt using the selected element visible text, site name and URL, and the user's input
      const siteName = (document.title || window.location.hostname || '').replace(/[\r\n]+/g, ' ').trim();
      const pageUrl = window.location.href || '';
        const elementText = (targetAtSubmit && targetAtSubmit.innerText) ? targetAtSubmit.innerText.trim() : '';
      const prompt = `I am looking at a cookie popup on "${siteName}" (${pageUrl}). Use what you know about this site in your answer.
    I am looking at this element specifically:
    ${elementText}
    My question is:
    ${userInput}

    PRINCIPLES:
    - Always prioritize the user's privacy, autonomy, and informed consent. Under NO circumstances recommend "Accept all" or any phrasing that encourages giving broad consent for convenience.
    - Do NOT speak in the first person or refer to the model/assistant. Address the user as "you" when giving actions (for example: "You can...") or refer to the site/popup when describing the source (for example: "The popup likely...").
    - Encourage critical consent decisions. Explain clearly why a given choice may expose the user to data collection or tracking, name likely data types and consequences, and recommend the least-permissive, practical steps the user can take immediately (for example: refuse or limit non-essential cookies, open site cookie settings to disable specific purposes, use the browser's cookie/privacy controls or privacy extensions, or inspect network requests in developer tools).
    - If the popup offers only an "Accept all" option with no granular controls, explicitly recommend alternatives (for example: refuse if available, use browser cookie controls or privacy extensions to block trackers, or avoid providing consent until you can verify via the site's privacy settings). If verification is required, point to where the user can check (site privacy policy, cookie settings panel, or developer tools).

    TASK: Briefly state whether the popup implies data collection or sharing, list likely personal or tracking data types involved, and provide concise, practical actions the user can take now to manage consent or reduce tracking. Use second-person instructions ("you") for user actions. Never recommend or suggest that the user select "Accept all." 

    Reply ONLY with the informative text. Plain text only (you may use HTML <b>...</b> tags for emphasis only). No labels, JSON, code fences, surrounding quotes, or extra commentary. Reply in English. Keep the answer brief.`;

      // show thinking animation by replacing the Apply button and disable input
      submit.style.display = 'none';
      spinner.style.display = 'inline-block';
      textarea.placeholder = 'Working on it...';
      submit.disabled = true;
      textarea.disabled = true;

      // send prompt to background worker which will POST to the LLM API
      chrome.runtime.sendMessage({ action: 'ask', prompt }, response => {
        // re-enable and restore Apply button/placeholder
        spinner.style.display = 'none';
        submit.style.display = 'inline-block';
        textarea.placeholder = 'What can I help you with';
        submit.disabled = false;
        textarea.disabled = false;

        if (!response) {
          console.warn('No response from background worker');
          // flash red border
          const overlayEl = document.getElementById(overlayId);
          if (overlayEl) {
            const prev = overlayEl.style.borderColor;
            overlayEl.style.borderColor = 'rgba(231, 76, 60, 0.95)';
            setTimeout(() => { if (overlayEl) overlayEl.style.borderColor = prev; }, 900);
          }
          return;
        }

        if (response.ok) {
          let serverText = sanitizeServerText(response.text || '');
          // create a post-it note connected to the element that was active at submit time
          if (targetAtSubmit) {
            // createPostIt will apply matching inline background to the target element
            if (targetAtSubmit) {
              if (parentId) {
                // append this response into the parent note instead of creating a new followup note
                appendFollowupToNote(parentId, serverText, userInput);
                // visually overlay the parent note and keep it as the active parent
                const parentEntry = window.__ci_postit_state.notes[parentId];
                if (parentEntry && parentEntry.note) showOverlayFor(parentEntry.note, 0, 0, { setTarget: false, position: 'side' });
                } else {
                // create a top-level note attached to the page element; use the user's prompt as header
                createPostIt(serverText, targetAtSubmit, { title: userInput });
                showOverlayFor(targetAtSubmit);
              }
            }
          }
          // flash green border briefly
          const overlayEl = document.getElementById(overlayId);
          if (overlayEl) {
            const prev = overlayEl.style.borderColor;
            overlayEl.style.borderColor = 'rgba(46, 204, 113, 0.95)';
            setTimeout(() => { if (overlayEl) overlayEl.style.borderColor = prev; }, 900);
          }
        } else {
          console.warn('LLM request failed', response.error);
          const overlayEl = document.getElementById(overlayId);
          if (overlayEl) {
            const prev = overlayEl.style.borderColor;
            overlayEl.style.borderColor = 'rgba(231, 76, 60, 0.95)';
            setTimeout(() => { if (overlayEl) overlayEl.style.borderColor = prev; }, 900);
          }
        }
      });

      // Keep the rounded overlay visible to indicate selection; do not clear selectedElement
      if (selectedElement) showOverlayFor(selectedElement);
      // keep edit container visible so user can refine further
    }, true);
  }

  // small CSS for shake animation (inserted at runtime so we don't touch styles.css)
  (function injectShakeStyle(){
    if (document.getElementById('ci-shake-style')) return;
    const s = document.createElement('style');
    s.id = 'ci-shake-style';
    s.textContent = `.ci-shake{animation: ci-shake 360ms;}
    @keyframes ci-shake{0%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}100%{transform:translateX(0)}}`;
    document.head && document.head.appendChild(s);
  })();

  function enable(){
    if (active) return;
    active = true;
    const btn = document.getElementById(toggleId);
    if (btn) btn.setAttribute('data-active','true');

    document.addEventListener('mousemove', onMouseMove, {passive:true, capture:true});
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('pointerdown', onPointerDownCapture, true);
    document.addEventListener('mousedown', onPointerDownCapture, true);
  }

  function disable(){
    if (!active) return;
    active = false;
    const btn = document.getElementById(toggleId);
    if (btn) btn.removeAttribute('data-active');

    document.removeEventListener('mousemove', onMouseMove, {capture:true});
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('pointerdown', onPointerDownCapture, true);
    document.removeEventListener('mousedown', onPointerDownCapture, true);
    hideUI();
    if (lastHovered) { lastHovered.classList && lastHovered.classList.remove(hoverClass); lastHovered = null; }
    // hide edit container if present
    const editContainer = document.getElementById('ci-edit-container');
    if (editContainer) editContainer.style.display = 'none';
    document.removeEventListener('scroll', onScrollCapture, true);
  }

  function toggleActive(){
    if (active) disable(); else enable();
  }

  function onMouseMove(e){
    updateHover(e.clientX, e.clientY);
  }

  function onClickCapture(e){
    // if clicking the toggle button itself, ignore
    const btn = document.getElementById(toggleId);
    const editContainer = document.getElementById('ci-edit-container');
    // allow clicks inside toggle, edit container, or any post-it to pass through
    const postitClosest = e.target && e.target.closest && e.target.closest('.ci-postit');
    if (btn && (btn === e.target || btn.contains(e.target))) return;
    if (editContainer && (editContainer === e.target || editContainer.contains(e.target))) return;
    if (postitClosest) return;
    // Prevent native click actions (like submitting forms or activating buttons)
    try { e.preventDefault(); e.stopImmediatePropagation(); } catch (err) {}
    const x = e.clientX, y = e.clientY;
    const el = document.elementFromPoint(x,y);
    if (!el) return;
    showOverlayFor(el, x, y);
    // clicking a page element clears any current note-parent state
    if (window.__ci_postit_state) window.__ci_postit_state.currentParent = null;
  }

  function onPointerDownCapture(e){
    // block pointerdown/mousedown native actions while preserving toggle button functionality
    const btn = document.getElementById(toggleId);
    const editContainer = document.getElementById('ci-edit-container');
    const postitClosest = e.target && e.target.closest && e.target.closest('.ci-postit');
    if (btn && (btn === e.target || btn.contains(e.target))) return;
    if (editContainer && (editContainer === e.target || editContainer.contains(e.target))) return;
    if (postitClosest) return;
    try { e.preventDefault(); e.stopImmediatePropagation(); } catch (err) {}
  }

  function updateHover(x,y){
    if (!active) return;
    const el = document.elementFromPoint(x,y);
    if (!el) return;
    if (el === lastHovered) return;
    if (lastHovered) lastHovered.classList && lastHovered.classList.remove(hoverClass);
    lastHovered = el;
    lastHovered.classList && lastHovered.classList.add(hoverClass);
  }

  function showOverlayFor(el, clientX = 0, clientY = 0, opts = {}){
    const overlay = document.getElementById(overlayId);
    if (!el || !overlay) return;
    const rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
    // reveal overlay smoothly
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    // mark visual selected element (overlay uses this)
    selectedElement = el;
    // If caller asks to set the target (default), update the selectedTargetElement
    const setTarget = (typeof opts.setTarget === 'undefined') ? true : !!opts.setTarget;
    if (setTarget) selectedTargetElement = el;

    const editContainer = document.getElementById('ci-edit-container');
    const textarea = document.getElementById('ci-edit-input');
    if (editContainer && textarea) {
      // Do NOT prefill the textarea with the element's text — start blank
      textarea.value = '';

      // prepare fade-in behavior: hide, position, then fade in with a small latency
      editContainer.style.display = 'flex';
      editContainer.style.opacity = '0';
      editContainer.style.transform = 'translateY(6px)';
      editContainer.style.transition = 'opacity 180ms ease, transform 180ms ease';
      editContainer.style.visibility = 'hidden';
      // ensure it's positioned so measurements are correct
      editContainer.style.left = '0px';
      editContainer.style.top = '0px';

      const ecW = editContainer.offsetWidth;
      const ecH = editContainer.offsetHeight;
      const margin = 8;

      // position either above/centered (default) or to the side if requested
      const position = opts.position || 'above';
      let left, top;
      if (position === 'side'){
        // prefer right side of element
        left = rect.right + margin;
        top = rect.top;
        if (left + ecW > window.innerWidth - margin) left = Math.max(margin, rect.left - ecW - margin);
        if (top + ecH > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - ecH - margin);
      } else {
        // compute centered above the selected element, clamp to viewport
        left = rect.left + (rect.width - ecW) / 2;
        if (left < margin) left = margin;
        if (left + ecW > window.innerWidth - margin) left = window.innerWidth - ecW - margin;
        top = rect.top - ecH - margin;
        if (top < margin) top = rect.bottom + margin;
      }

      editContainer.style.left = Math.round(left) + 'px';
      editContainer.style.top = Math.round(top) + 'px';
      // schedule fade-in after a small latency so it doesn't feel abrupt
      if (editContainer._ci_fade_timer) clearTimeout(editContainer._ci_fade_timer);
      editContainer._ci_fade_timer = setTimeout(() => {
        editContainer.style.visibility = 'visible';
        editContainer.style.opacity = '1';
        editContainer.style.transform = 'translateY(0px)';
        editContainer._ci_fade_timer = null;
      }, 120);

      // reset height and focus the textarea so user can type immediately
      textarea.style.height = 'auto';
      textarea.focus();
    }
    // no popup positioning
  }

  function hideUI(){
    const overlay = document.getElementById(overlayId);
    if (overlay){
      overlay.style.opacity = '0';
      // after transition, hide it
      setTimeout(() => { try{ overlay.style.display = 'none'; }catch(e){} }, 200);
    }
    // gracefully hide edit container if visible
    const editContainer = document.getElementById('ci-edit-container');
    if (editContainer){
      try{
        if (editContainer._ci_fade_timer) { clearTimeout(editContainer._ci_fade_timer); editContainer._ci_fade_timer = null; }
        editContainer.style.opacity = '0';
        editContainer.style.transform = 'translateY(6px)';
        // after fade, hide from layout
        setTimeout(() => { try{ editContainer.style.display = 'none'; editContainer.style.visibility = 'hidden'; }catch(e){} }, 200);
      }catch(e){}
    }
    if (window.__ci_postit_state) window.__ci_postit_state.currentParent = null;
  }

  createUI();
  // start disabled; user must press the in-page button

  // keyboard and scroll shortcuts still hide overlay, but ignore scrolls caused by interacting with the edit box
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideUI(); }, true);
  // press 'k' to untoggle and remove all notes and restore highlights
  document.addEventListener('keydown', e => {
    if (e.key === 'k' && !(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))){
      // untoggle inspector
      disable();
      // fade out and remove all notes, restoring any highlighted backgrounds
      if (window.__ci_postit_state && window.__ci_postit_state.notes){
        Object.keys(window.__ci_postit_state.notes).forEach(id => {
          try{
            const entry = window.__ci_postit_state.notes[id];
            if (!entry) return;
            const n = entry.note;
            const l = entry.line;
            // restore target element background if saved
            try { if (entry.targetEl && entry.prevBg !== undefined) entry.targetEl.style.background = entry.prevBg || ''; } catch(err){}
            if (n){ n.style.transition = 'opacity 360ms ease, transform 360ms ease'; n.style.opacity = '0'; n.style.transform = 'translateY(-8px)'; }
            if (l) { l.style.transition = 'opacity 360ms ease'; l.style.opacity = '0'; }
            setTimeout(() => { try{ if (entry.note) entry.note.remove(); if (entry.line) entry.line.remove(); }catch(e){} }, 380);
          }catch(e){}
        });
        window.__ci_postit_state.notes = {};
        window.__ci_postit_state.count = 0;
        window.__ci_postit_state.currentParent = null;
      }
    }
  }, true);
  function onScrollCapture(e){
    const editContainer = document.getElementById('ci-edit-container');
    if (editContainer && (editContainer.contains(document.activeElement))) return;
    hideUI();
  }
  document.addEventListener('scroll', onScrollCapture, true);

})();
