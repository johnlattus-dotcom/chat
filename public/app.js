import { initDiscovery } from './discovery.js';
import { today, validate, due, pending, calendar } from './model.js';
const $ = selector => document.querySelector(selector);
const key = 'next-step-applications-v1';
let jobs = [], filter = 'All', writable = true;
function message(text) { $('#message').textContent = text; }
try {
  const stored = localStorage.getItem(key);
  if (stored) { jobs = JSON.parse(stored); if (!Array.isArray(jobs)) throw new Error(); jobs.forEach(validate); }
} catch { writable = false; jobs = []; message('Saved data could not be read. Export a backup before importing a valid backup. Existing data will not be overwritten.'); }
function save(next) {
  if (!writable) { message('Storage is unavailable or contains unreadable data. Export a backup, then import a valid backup to recover.'); return false; }
  try { localStorage.setItem(key, JSON.stringify(next)); jobs = next; render(); return true; }
  catch { message('Your changes could not be saved. Browser storage may be full or disabled. Export a backup of your current applications.'); return false; }
}
function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
function button(text, action, className) { const b = node('button', text, className); b.type = 'button'; b.addEventListener('click', action); return b; }
function format(date) { return date ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function download(content, filename, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = node('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function openEditor(job) {
  const form = $('#job-form'); form.reset(); $('#form-error').textContent = '';
  $('#editor-title').textContent = job && jobs.some(j => j.id === job.id) ? 'Edit application' : 'Add an application';
  $('#delete').hidden = !job || !jobs.some(j => j.id === job.id);
  const values = job || { id: '', company: '', role: '', status: 'Applied', applied: today(), followup: '', url: '', notes: '', followupDone: false };
  for (const [name, value] of Object.entries(values)) { const field = form.elements.namedItem(name); if (!field) continue; if (field.type === 'checkbox') field.checked = value; else field.value = value; }
  $('#editor').showModal(); form.elements.company.focus();
}
function render() {
  $('#total').textContent = jobs.length;
  $('#interviews').textContent = jobs.filter(j => ['Interviewing','Offer'].includes(j.status)).length;
  $('#offers').textContent = jobs.filter(j => j.status === 'Offer').length;
  $('#due').textContent = jobs.filter(j => due(j)).length;
  const query = $('#search').value.toLowerCase().trim();
  const visible = jobs.filter(j => (filter === 'All' || (filter === 'Closed' ? ['Rejected','Withdrawn'].includes(j.status) : j.status === filter)) && `${j.company} ${j.role}`.toLowerCase().includes(query)).sort((a,b) => b.applied.localeCompare(a.applied));
  $('#count').textContent = visible.length;
  const rows = $('#rows'); rows.replaceChildren();
  for (const job of visible) {
    const tr = node('tr'), td = node('td'), company = node('div', undefined, 'company');
    company.append(node('span', job.company.slice(0,1).toUpperCase(), 'avatar'));
    const names = node('div'); names.append(node('strong', job.company), node('small', job.role)); company.append(names); td.append(company); tr.append(td);
    const status = node('td'); status.append(node('span', job.status, `badge ${job.status.toLowerCase()}`)); tr.append(status, node('td', format(job.applied)));
    tr.append(node('td', job.followupDone ? '✓ Completed' : format(job.followup), due(job) ? 'overdue' : ''));
    const actions = node('td'); actions.append(button('Edit ↗', () => openEditor(job), 'edit')); tr.append(actions); rows.append(tr);
  }
  $('#empty').hidden = visible.length > 0;
  $('#empty h3').textContent = jobs.length ? 'No applications match just yet.' : 'A fresh start, full of possibility.';
  $('#empty p').textContent = jobs.length ? 'Try another search or filter to find what you’re looking for.' : 'Add your first application and take the next step. We’ll help you keep the details together.';
  $('#empty-add').hidden = jobs.length > 0;
  const reminders = $('#reminder-list'); reminders.replaceChildren();
  const upcoming = jobs.filter(pending).sort((a,b) => a.followup.localeCompare(b.followup));
  if (!upcoming.length) reminders.append(node('p', 'All clear for now. Add a follow-up date to an application and it’ll appear here.', 'no-reminders'));
  for (const job of upcoming) {
    const item = node('article', undefined, 'reminder-item'); item.append(node('strong', job.company), node('p', job.role));
    const time = node('time', `${due(job) ? job.followup === today() ? 'Due today · ' : 'Overdue · ' : ''}${format(job.followup)}`); time.dateTime = job.followup; item.append(time);
    const actions = node('div', undefined, 'reminder-actions'); actions.append(button('Add to calendar', () => download(calendar(job), 'follow-up.ics', 'text/calendar')), button('Mark done', () => { if (save(jobs.map(j => j.id === job.id ? { ...j, followupDone: true } : j))) message('Follow-up marked complete. You can schedule the next one by editing the application.'); }));
    item.append(actions); reminders.append(item);
  }
}
$('#add').addEventListener('click', () => openEditor());
$('#empty-add').addEventListener('click', () => openEditor());
$('#close').addEventListener('click', () => $('#editor').close());
$('#search').addEventListener('input', render);
for (const b of document.querySelectorAll('[data-filter]')) b.addEventListener('click', () => { filter = b.dataset.filter; document.querySelectorAll('[data-filter]').forEach(el => el.classList.toggle('selected', el === b)); render(); });
$('#job-form').addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(event.currentTarget); const job = Object.fromEntries(data);
  job.id ||= crypto.randomUUID(); job.followupDone = data.has('followupDone'); job.company = job.company.trim(); job.role = job.role.trim(); job.url = job.url.trim();
  const previous = jobs.find(j => j.id === job.id);
  if (previous && previous.followup !== job.followup) job.followupDone = false;
  try { validate(job); if (save(previous ? jobs.map(j => j.id === job.id ? job : j) : [...jobs, job])) { $('#editor').close(); message('Application saved. Your next step is on the board.'); } } catch (error) { $('#form-error').textContent = error.message; }
});
$('#delete').addEventListener('click', () => { if (confirm('Delete this application? This cannot be undone.')) { const id = $('#job-form').elements.id.value; if (save(jobs.filter(j => j.id !== id))) { $('#editor').close(); message('Application deleted.'); } } });
$('#backup').addEventListener('click', () => {
  try { const content = writable ? JSON.stringify(jobs, null, 2) : localStorage.getItem(key) || '[]'; download(content, `next-step-backup-${today()}.json`, 'application/json'); } catch { message('Browser storage could not be accessed to export a backup.'); }
});
$('#restore').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 5_000_000) throw new Error('Choose a backup smaller than 5 MB.');
    const imported = JSON.parse(await file.text()); if (!Array.isArray(imported)) throw new Error('Choose a valid Next Step backup.');
    imported.forEach(validate); if (new Set(imported.map(j => j.id)).size !== imported.length) throw new Error('Backup contains duplicate application IDs.');
    if (!confirm(`Replace current applications with ${imported.length} applications from this backup? Export your current data first if you need to keep it.`)) return;
    const before = writable; writable = true; if (save(imported)) message('Backup imported. Your applications are restored.'); else writable = before;
  } catch (error) { message(`Import failed: ${error.message}`); } finally { event.target.value = ''; }
});
render();
// Refresh overdue counts after midnight and when returning to the tab.
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

initDiscovery({ openApplication: openEditor, applications: () => jobs });
