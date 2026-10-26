// Fixed public sources only: user profile and resume are never sent upstream.
const sources = [
  { name: 'The Muse', urls: [0,1].map(page => `https://www.themuse.com/api/public/jobs?category=Accounting%20and%20Finance&page=${page}`), array: 'results', map: museJob },
  { name: 'Remotive', urls: ['https://remotive.com/api/remote-jobs?category=finance-legal'], array: 'jobs', map: remotiveJob }
];
export function plain(value = '') { return String(value).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim(); }
function safeUrl(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }
function base(value) {
  return { ...value, title: plain(value.title).slice(0,200), company: plain(value.company).slice(0,200), location: plain(value.location).slice(0,500), description: plain(value.description).slice(0,30000), url: safeUrl(value.url), salaryAnnualMin: null, salaryAnnualMax: null, salaryCurrency: '' };
}
export function museJob(job) {
  const location = (job.locations || []).map(l=>l.name).join('; '), title = plain(job.name);
  return base({id:`muse-${job.id}`,source:'The Muse',title,company:job.company?.name || 'Company not listed',location:location || 'Location not listed',description:job.contents,published:job.publication_date || '',url:job.refs?.landing_page,level:(job.levels || []).map(l=>l.name).join(' '),work:/\bremote\b/i.test(location) ? 'remote' : 'unknown',type:/\b(intern|internship|co-op)\b/i.test(title) ? 'internship' : 'unknown',salaryText:'Not listed'});
}
export function remotiveJob(job) {
  const normalized = base({id:`remotive-${job.id}`,source:'Remotive',title:job.title,company:job.company_name || 'Company not listed',location:job.candidate_required_location || 'Location not listed',description:job.description,published:job.publication_date || '',url:job.url,level:'',work:'remote',type:job.job_type || 'unknown',salaryText:plain(job.salary || 'Not listed').slice(0,300)});
  return {...normalized,...annualSalary(normalized.salaryText)};
}

let cached, inflight;
export async function discover({fetcher = fetch, now = Date.now(), useCache = true} = {}) {
  if (useCache && cached && now - cached.created < 6 * 3600000) return {...cached.data, cached: true};
  if (useCache && inflight) return inflight;
  async function load() {
    const results = await Promise.all(sources.map(async source => {
      const pages = await Promise.allSettled(source.urls.map(async url => {
        const response = await fetcher(url, { signal: AbortSignal.timeout(18000), headers: { Accept: 'application/json', 'User-Agent': 'NextStepPersonalJobTracker/1.1' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text(); if (text.length > 15000000) throw new Error('Feed response too large');
        const data = JSON.parse(text); if (!Array.isArray(data[source.array])) throw new Error('Unexpected feed format');
        return data[source.array].slice(0,1000).map(source.map).filter(j=>j.title && j.url);
      }));
      const successes = pages.filter(r=>r.status === 'fulfilled');
      return {jobs:successes.flatMap(r=>r.value), status:{name:source.name,status:successes.length === pages.length ? 'ok' : successes.length ? 'partial' : 'unavailable',count:successes.flatMap(r=>r.value).length,message:successes.length < pages.length ? 'Some or all requests failed. The source may be blocked, rate-limited, or temporarily unavailable.' : ''}};
    }));
    const jobs = [...new Map(results.flatMap(r=>r.jobs).map(j=>[j.url,j])).values()];
    const data = {jobs,sources:results.map(r=>r.status),fetchedAt:new Date(now).toISOString(),cached:false};
    if (useCache && results.some(r=>r.status.status !== 'unavailable')) cached = {created:now,data};
    return data;
  }
  if (!useCache) return load();
  inflight = load(); try { return await inflight; } finally { inflight = null; }
}

export function annualSalary(text) {
  const unknown = { salaryAnnualMin:null, salaryAnnualMax:null, salaryCurrency:'' };
  // Never guess currency for a bare dollar sign or annualize hourly pay.
  const currency = text.match(/\b(USD|GBP|EUR|CAD|AUD)\b/i)?.[1]?.toUpperCase() || (/US\$/.test(text) ? 'USD' : text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : '');
  if (!currency || !/\b(annual|annually|year|yearly|annum)\b/i.test(text) || /\b(hour|hourly|month|monthly)\b/i.test(text)) return unknown;
  const matches = [...text.matchAll(/(?<![a-z0-9])(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k)?(?![a-z0-9])/gi)].slice(0,2);
  const amounts = matches.map(m=>Number(m[1].replaceAll(',',''))*(m[2]?1000:1)).filter(n=>n>0);
  if (!amounts.length) return unknown;
  return {salaryAnnualMin:Math.min(...amounts),salaryAnnualMax:Math.max(...amounts),salaryCurrency:currency};
}
