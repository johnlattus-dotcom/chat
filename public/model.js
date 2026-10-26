export const statuses = ['Applied', 'Interviewing', 'Offer', 'Rejected', 'Withdrawn'];
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(+d) && d.toISOString().slice(0,10) === value;
}
export function validate(job) {
  if (!job || typeof job !== 'object') throw new Error('Invalid application.');
  for (const key of ['company', 'role']) if (typeof job[key] !== 'string' || !job[key].trim() || job[key].length > 200) throw new Error('Enter a company and role (up to 200 characters each).');
  if (!statuses.includes(job.status) || !validDate(job.applied)) throw new Error('Choose a valid status and application date.');
  if (job.followup && !validDate(job.followup)) throw new Error('Choose a valid follow-up date.');
  if (typeof job.notes !== 'string' || job.notes.length > 10000) throw new Error('Notes must be under 10,000 characters.');
  if (typeof job.url !== 'string') throw new Error('Invalid job link.');
  if (job.url) {
    let url; try { url = new URL(job.url); } catch { throw new Error('Enter a complete https:// or http:// job link.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Job links must use https:// or http://.');
  }
  if (typeof job.id !== 'string' || !job.id || typeof job.followupDone !== 'boolean') throw new Error('Invalid application data.');
  return job;
}
export function pending(job) { return !!job.followup && !job.followupDone && !['Rejected','Withdrawn'].includes(job.status); }
export function due(job, date = today()) { return pending(job) && job.followup <= date; }
const escape = value => value.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\r','');
export function calendar(job) {
  validate(job);
  if (!pending(job)) throw new Error('Set an unfinished follow-up date first.');
  // All-day events preserve the chosen local calendar date in every timezone.
  const end = new Date(`${job.followup}T12:00:00Z`); end.setUTCDate(end.getUTCDate()+1);
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Next Step//Job tracker//EN','BEGIN:VEVENT',`UID:${escape(job.id)}@nextstep.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${job.followup.replaceAll('-','')}`,`DTEND;VALUE=DATE:${end.toISOString().slice(0,10).replaceAll('-','')}`,`SUMMARY:${escape(`Follow up: ${job.company} — ${job.role}`)}`,`DESCRIPTION:${escape(job.notes || 'Check in on your application.')}`,'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:Job application follow-up','TRIGGER:-PT9H','END:VALARM','END:VEVENT','END:VCALENDAR'];
  // RFC 5545 folding: keep physical lines below 75 octets, including Unicode.
  return lines.map(line => { let output = '', count = 0; for (const char of line) { const size = new TextEncoder().encode(char).length; if (count + size > 74) { output += '\r\n '; count = 1; } output += char; count += size; } return output; }).join('\r\n')+'\r\n';
}
