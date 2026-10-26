export const defaultProfile = {
  interests: 'personal finance, financial advisory, wealth management, financial planning, financial analyst',
  location: '', work: 'any', experience: 'student', type: 'any', keywords: '', exclusions: 'commission only, unpaid',
  minSalary: '', currency: 'USD', disclosedSalary: false, maxAge: '30', resume: '', linkedin: ''
};
export const splitTerms = value => String(value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const aliases = {
  'personal finance': ['personal finance', 'financial planning', 'financial wellness'],
  'financial advisory': ['financial advis', 'financial consultant', 'financial planner', 'wealth advis'],
  'wealth management': ['wealth', 'private banking', 'investment advis'],
  'financial planning': ['financial plan', 'paraplann', 'cfp'],
  'financial analyst': ['financial analyst', 'finance analyst', 'fp&a', 'investment analyst']
};
const skills = ['excel', 'financial modeling', 'financial analysis', 'accounting', 'bloomberg', 'python', 'sql', 'power bi', 'tableau', 'valuation', 'portfolio', 'customer service', 'communication', 'research', 'series 7', 'series 65', 'cfp', 'cfa', 'budgeting', 'quickbooks'];
const has = (text, word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text);
export function validateProfile(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid search profile.');
  const p = { ...defaultProfile, ...value };
  for (const name of ['interests','location','keywords','exclusions','resume','linkedin','minSalary','currency','maxAge','work','experience','type']) {
    if (typeof p[name] !== 'string' || p[name].length > (name === 'resume' ? 30000 : 2000)) throw new Error(`Please shorten or correct ${name}.`);
  }
  if (!splitTerms(p.interests).length) throw new Error('Enter at least one area of interest.');
  if (!['any','remote','hybrid','onsite'].includes(p.work) || !['student','any'].includes(p.experience) || !['any','internship','full_time','part_time','contract'].includes(p.type)) throw new Error('Choose valid search options.');
  if (p.minSalary && (!/^\d+(\.\d{1,2})?$/.test(p.minSalary) || +p.minSalary > 10000000)) throw new Error('Enter a valid minimum annual salary.');
  if (!['USD','GBP','EUR','CAD','AUD'].includes(p.currency) || !['7','30','90','any'].includes(p.maxAge)) throw new Error('Choose valid salary and posting options.');
  if (p.linkedin) { let u; try { u = new URL(p.linkedin); } catch { throw new Error('Enter a complete LinkedIn profile URL.'); } if (u.protocol !== 'https:' || !/(^|\.)linkedin\.com$/.test(u.hostname)) throw new Error('Use an https://www.linkedin.com profile link.'); }
  return {...p, disclosedSalary: p.disclosedSalary === true};
}
export function rankJobs(jobs, profile, now = Date.now()) {
  const p = validateProfile(profile), interests = splitTerms(p.interests), required = splitTerms(p.keywords), excluded = splitTerms(p.exclusions);
  const profileSkills = skills.filter(skill => has(p.resume.toLowerCase(), skill));
  return jobs.flatMap(job => {
    const title = job.title.toLowerCase(), description = job.description.toLowerCase(), text = `${title} ${description}`;
    const interestMatches = interests.filter(term => (aliases[term] || [term]).some(s => text.includes(s)));
    if (!interestMatches.length || excluded.some(term => text.includes(term)) || required.some(term => !has(text, term))) return [];
    if (p.experience === 'student' && /\b(senior|sr\.?|director|vice president|vp|principal|head of|lead|manager)\b/i.test(job.title) && !/\b(intern|internship|trainee)\b/i.test(job.title)) return [];
    const internship = /\b(intern|internship|co-op)\b/i.test(text) || job.type === 'internship';
    const student = internship || /\b(entry.level|junior|graduate|early career|trainee|student)\b/i.test(`${title} ${job.level}`);
    if (p.experience === 'student' && !student) return [];
    if (p.type === 'internship' ? !internship : p.type !== 'any' && job.type !== p.type) return [];
    if (p.work !== 'any' && job.work !== p.work) return [];
    const locations = splitTerms(p.location);
    if (locations.length && !locations.some(location => has(job.location.toLowerCase(), location))) return [];
    if (p.maxAge !== 'any' && (!Number.isFinite(Date.parse(job.published)) || now - Date.parse(job.published) > +p.maxAge * 86400000)) return [];
    const salaryKnown = job.salaryAnnualMax !== null && job.salaryCurrency === p.currency;
    if (p.disclosedSalary && !salaryKnown) return [];
    if (p.minSalary && salaryKnown && job.salaryAnnualMax < +p.minSalary) return [];
    const matchingSkills = profileSkills.filter(skill => has(text, skill));
    const reasons = [`Interest: ${interestMatches.join(', ')}`];
    let points = interestMatches.length * 10 + (student ? 10 : 0) + matchingSkills.length * 4;
    if (student) reasons.push(internship ? 'Internship or co-op mentioned' : 'Student / early-career level');
    if (matchingSkills.length) reasons.push(`Resume keywords: ${matchingSkills.join(', ')}`);
    if (locations.length) reasons.push('Listed location matches your preference');
    if (p.work !== 'any') reasons.push(`Listed as ${p.work}`);
    const warnings = [];
    if (!salaryKnown) warnings.push(`Annual pay in ${p.currency} not confirmed${p.minSalary ? '; your minimum has not been verified' : ''}.`);
    else if (p.minSalary && (job.salaryAnnualMin === null || job.salaryAnnualMin < +p.minSalary)) warnings.push('Only the top of the advertised pay range meets your minimum.');
    if (job.work === 'remote') warnings.push('Remote does not mean worldwide: check location and work authorization.');
    if (p.experience === 'student' && /\b([3-9]|\d{2,})\+?\s*years?\b/i.test(description)) warnings.push('Posting mentions 3+ years; read the experience requirements.');
    if (/\b(series (7|65|66)|licensed|licen[cs]e required)\b/i.test(description)) warnings.push('Check licensing requirements before applying.');
    return [{...job, points, reasons, warnings}];
  }).sort((a,b) => b.points - a.points || (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));
}
export function searchLinks(profile) {
  const p = validateProfile(profile);
  // Public search links contain only role/location preferences, never resume text.
  const terms = splitTerms(p.interests).map(t => `"${t}"`).join(' OR ');
  const query = `${terms}${p.experience === 'student' ? ' (intern OR internship OR "entry level" OR graduate)' : ''}${p.work !== 'any' ? ` ${p.work}` : ''}${p.type !== 'any' ? ` ${p.type.replace('_',' ')}` : ''}${splitTerms(p.keywords).map(t=>' '+t).join('')}${splitTerms(p.exclusions).map(t=>' -"'+t+'"').join('')}`;
  const linkedin = new URL('https://www.linkedin.com/jobs/search/'); linkedin.searchParams.set('keywords', query); if (p.location) linkedin.searchParams.set('location',p.location); if (p.work === 'remote') linkedin.searchParams.set('f_WT','2'); if (p.experience === 'student') linkedin.searchParams.set('f_E','1,2'); if (p.maxAge !== 'any') linkedin.searchParams.set('f_TPR',`r${+p.maxAge*86400}`);
  const indeed = new URL('https://www.indeed.com/jobs'); indeed.searchParams.set('q',query); if (p.location) indeed.searchParams.set('l',p.location); if (p.maxAge !== 'any') indeed.searchParams.set('fromage',p.maxAge);
  const handshake = new URL('https://app.joinhandshake.com/stu/postings'); handshake.searchParams.set('text',query + (p.location ? ` ${p.location}` : ''));
  return [{name:'LinkedIn',url:linkedin.href},{name:'Indeed',url:indeed.href},{name:'Handshake',url:handshake.href}];
}
