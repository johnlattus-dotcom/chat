import { defaultProfile, validateProfile, rankJobs, searchLinks } from './discovery-model.js';
import { today } from './model.js';
const $ = selector => document.querySelector(selector);
const profileKey = 'next-step-search-profile-v1';
function el(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function link(text, url) { const a = el('a', text); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
function download(data, name) { const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)], {type:'application/json'})); const a = el('a'); a.href = url; a.download = name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
export function initDiscovery({ openApplication, applications }) {
  const form = $('#profile-form');
  let feed = null, profile = {...defaultProfile}, writable = true, busy = false, generation = 0;
  function fill(p) { for (const [name,value] of Object.entries(p)) { const input = form.elements.namedItem(name); if (!input) continue; if (input.type === 'checkbox') input.checked = value; else input.value = value; } }
  function read() { const p = Object.fromEntries(new FormData(form)); p.disclosedSalary = form.elements.disclosedSalary.checked; return validateProfile(p); }
  function fail(error) { $('#profile-error').textContent = error.message; }
  function persist(p) {
    if (!writable) throw new Error('Stored profile is unreadable. Export it before clearing the profile or importing a valid backup.');
    try { localStorage.setItem(profileKey,JSON.stringify(p)); $('#profile-status').textContent = 'Profile saved in this browser.'; }
    catch { throw new Error('Profile could not be saved. Browser storage may be full or disabled; export your profile as a backup.'); }
  }
  try { const stored = localStorage.getItem(profileKey); if (stored) profile = validateProfile(JSON.parse(stored)); }
  catch { writable = false; fail(new Error('Your stored profile could not be read. It has not been changed. Export it before clearing or restoring it.')); }
  fill(profile);
  function showView(finder) {
    $('#tracker-view').hidden = finder; $('#finder-view').hidden = !finder;
    $('#tracker-tab').toggleAttribute('aria-current',!finder); $('#finder-tab').toggleAttribute('aria-current',finder);
    (finder ? $('#finder-tab') : $('#tracker-tab')).setAttribute('aria-current','page');
    if (finder && feed) { try { render(read()); } catch (error) { fail(error); } }
  }
  $('#tracker-tab').addEventListener('click',()=>showView(false));
  $('#finder-tab').addEventListener('click',()=>showView(true));
  function boards(p) {
    $('#board-links').replaceChildren(...searchLinks(p).map(item=>link(`${item.name} ↗`,item.url)));
  }
  boards(profile);
  function render(p) {
    boards(p);
    if (!feed) return;
    const matches = rankJobs(feed.jobs,p);
    $('#results-count').textContent = matches.length;
    const states = feed.sources.map(source=>`${source.name}: ${source.status === 'ok' ? `${source.count} listings loaded` : source.status === 'partial' ? `${source.count} listings loaded; some requests failed` : 'unavailable — source may be blocked, rate-limited, or temporarily down'}`);
    const refreshed = new Date(feed.fetchedAt).toLocaleString();
    $('#source-status').textContent = `${states.join('\n')}\nFeed fetched: ${refreshed}${feed.cached ? ' (cached)' : ''}. Ranked using your current form values.`;
    const container = $('#job-results'); container.replaceChildren();
    if (!matches.length) {
      const empty = el('article',undefined,'job-card'); empty.append(el('h3',feed.jobs.length ? 'No listings meet these filters.' : 'No listings could be loaded.'));
      empty.append(el('p',feed.jobs.length ? 'Try fewer required keywords, a wider location, any job type, or a longer posting window. Unknown work arrangement, job type, and dates are excluded when you filter on them. The tailored searches above cover many more employers.' : 'Use the LinkedIn, Indeed, or Handshake searches above while the public feeds are unavailable. No example jobs have been substituted.','field-help')); container.append(empty);
    }
    for (const job of matches.slice(0,100)) {
      const card = el('article',undefined,'job-card'), top = el('div',undefined,'job-card-top'), heading = el('div');
      heading.append(el('h3',job.title),el('p',`${job.company} · ${job.location}`,'job-meta'));
      const published = Number.isFinite(Date.parse(job.published)) ? new Date(job.published).toLocaleDateString() : 'Date not listed';
      heading.append(el('p',`${job.source} · ${published} · ${job.work === 'unknown' ? 'Arrangement not listed' : job.work} · ${job.type === 'unknown' ? 'Type not listed' : job.type.replace('_',' ')}`,'job-meta'));
      top.append(heading,el('span',`${job.points} match points`,'match-points')); card.append(top,el('p',`Advertised pay: ${job.salaryText}`,'job-pay'));
      const reasons = el('div',undefined,'job-reasons'); job.reasons.forEach(reason=>reasons.append(el('div',reason))); card.append(reasons);
      if (job.warnings.length) { const warnings = el('div',undefined,'job-warnings'); job.warnings.forEach(warning=>warnings.append(el('p',warning))); card.append(warnings); }
      const detail = el('details'); detail.append(el('summary','Read listing details'),el('p',job.description,'job-description')); card.append(detail);
      const actions = el('div',undefined,'job-actions'), add = el('button',applications().some(j=>j.url === job.url) ? 'Already in tracker' : 'Save to tracker','secondary'); add.type = 'button'; add.disabled = applications().some(j=>j.url === job.url);
      add.addEventListener('click',()=>{
        showView(false);
        openApplication({id:crypto.randomUUID(),company:job.company,role:job.title,status:'Saved',applied:today(),followup:'',followupDone:false,url:job.url,notes:`Found on ${job.source}. Location: ${job.location}.\n${job.reasons.join('\n')}\n${job.warnings.join('\n')}`.slice(0,10000)});
      });
      actions.append(link(`View on ${job.source} ↗`,job.url),add); card.append(actions); container.append(card);
    }
    if (matches.length > 100) container.append(el('p','Showing the top 100 matches. Narrow your filters to see more specific results.','field-help'));
  }
  form.addEventListener('input',()=>{
    $('#profile-status').textContent = 'Changes not saved. Find jobs or save your profile to keep them.';
    try { const p = read(); $('#profile-error').textContent = ''; if (feed) render(p); else boards(p); } catch (error) { fail(error); }
  });
  $('#save-profile').addEventListener('click',()=>{ try { const p = read(); persist(p); $('#profile-error').textContent = ''; if (feed) render(p); else boards(p); } catch (error) { fail(error); } });
  form.addEventListener('submit',async event=>{
    event.preventDefault(); if (busy) return;
    let p; try { p = read(); persist(p); $('#profile-error').textContent = ''; } catch (error) { fail(error); return; }
    boards(p); busy = true; const requestGeneration = ++generation;
    $('#find-button').disabled = true; $('#find-button').textContent = 'Checking job sources…'; $('#source-status').textContent = 'Checking public job sources. This can take up to 20 seconds…';
    try {
      const response = await fetch('/api/jobs',{signal:AbortSignal.timeout(25000)}); const data = await response.json();
      if (!response.ok || !Array.isArray(data.jobs) || !Array.isArray(data.sources)) throw new Error(data.error || 'Invalid response from the job server.');
      if (requestGeneration !== generation) return;
      feed = data; render(read());
    } catch (error) { if (requestGeneration !== generation) return; $('#source-status').textContent = `Could not refresh job listings. ${error.name === 'TimeoutError' ? 'The request timed out.' : error.message} Use the tailored searches above.${feed ? ' Previously loaded listings remain below.' : ''}`; }
    finally { busy = false; $('#find-button').disabled = false; $('#find-button').textContent = 'Find matching jobs ↗'; }
  });
  $('#resume-file').addEventListener('change',async event=>{
    const file = event.target.files[0]; if (!file) return;
    try { if (!/\.(txt|md)$/i.test(file.name) || file.size > 150000) throw new Error('Choose a TXT or Markdown resume smaller than 150 KB. Copy PDF / Word text into the text box.'); const text = await file.text(); if (text.length > 30000) throw new Error('Resume text must be 30,000 characters or fewer.'); form.elements.resume.value = text; form.dispatchEvent(new Event('input')); $('#profile-status').textContent = 'Resume imported into the form. Find jobs or save your profile to keep it.'; }
    catch (error) { fail(error); } finally { event.target.value = ''; }
  });
  $('#forget-profile').addEventListener('click',()=>{
    if (!confirm('Clear your saved search profile and resume from this browser? Your tracked applications will remain.')) return;
    try { localStorage.removeItem(profileKey); writable = true; ++generation; profile = {...defaultProfile}; fill(profile); feed = null; $('#job-results').replaceChildren(); $('#results-count').textContent = '0'; $('#source-status').textContent = 'Profile cleared. Set your preferences to start a new search.'; $('#profile-status').textContent = ''; $('#profile-error').textContent = ''; boards(profile); }
    catch { fail(new Error('Could not clear browser storage.')); }
  });
  $('#export-profile').addEventListener('click',()=>{
    try { if (!writable) { const raw = localStorage.getItem(profileKey); const url = URL.createObjectURL(new Blob([raw || ''],{type:'application/json'})); const a = el('a'); a.href = url; a.download = 'next-step-profile-recovery.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); return; } download(read(),`next-step-profile-${today()}.json`); $('#profile-status').textContent = 'Profile exported, including resume text. Keep the backup private.'; }
    catch (error) { fail(error); }
  });
  $('#import-profile').addEventListener('click',()=>$('#profile-file').click());
  $('#profile-file').addEventListener('change',async event=>{
    const file = event.target.files[0]; if (!file) return;
    try { if (file.size > 200000) throw new Error('Choose a profile backup smaller than 200 KB.'); const p = validateProfile(JSON.parse(await file.text())); if (!confirm('Replace your search profile and resume with this backup? Tracked applications will remain.')) return; const previous = writable; writable = true; try { persist(p); } catch (error) { writable = previous; throw error; } fill(p); $('#profile-error').textContent = ''; if (feed) render(p); else boards(p); }
    catch (error) { fail(error); } finally { event.target.value = ''; }
  });
}
