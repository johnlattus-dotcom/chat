import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, validateProfile, rankJobs, searchLinks } from '../public/discovery-model.js';
import { discover, museJob, remotiveJob, plain, annualSalary } from '../discovery.js';
const now = Date.parse('2026-10-26T12:00:00Z');
const base = {id:'1',title:'Financial Planning Intern',company:'Example',description:'Use Excel and research to support financial planning.',location:'New York, NY, United States',work:'hybrid',type:'internship',level:'Internship',published:'2026-10-25T12:00:00Z',url:'https://example.com/1',salaryAnnualMin:null,salaryAnnualMax:null,salaryCurrency:'',salaryText:'Not listed'};
const p = {...defaultProfile,exclusions:'',resume:'I have Excel skills and experience in research.'};
test('ranker follows role, student level and resume keywords with explained matches',()=>{
  const result = rankJobs([base,{...base,id:'2',description:'Support financial planning.'},{...base,id:'3',title:'Senior Financial Planner',level:'Senior'}, {...base,id:'4',title:'Junior Software Engineer',description:'Write code',level:'Entry Level'}],p,now);
  assert.deepEqual(result.map(j=>j.id),['1','2']);
  assert.ok(result[0].reasons.some(r=>r.includes('excel, research')));
  assert.ok(result[0].warnings.some(r=>r.includes('not confirmed')));
  assert.equal(rankJobs([{...base,title:'Financial Advisor',level:'Entry Level',type:'unknown'}],p,now).length,1);
});
test('strict parameters filter location, work, required terms, exclusions, type, age and salary',()=>{
  for (const change of [{location:'Boston'},{work:'remote'},{keywords:'sql'},{exclusions:'excel'},{type:'full_time'},{maxAge:'7'}]) {
    const job = change.maxAge ? {...base,published:'2026-01-01'} : base;
    assert.equal(rankJobs([job],{...p,...change},now).length,0,JSON.stringify(change));
  }
  assert.equal(rankJobs([{...base,published:''}],p,now).length,0);
  assert.equal(rankJobs([{...base,published:''}],{...p,maxAge:'any'},now).length,1);
  assert.equal(rankJobs([base],{...p,disclosedSalary:true},now).length,0);
  assert.equal(rankJobs([base],{...p,minSalary:'65000'},now).length,1);
  const paid = {...base,salaryAnnualMin:50000,salaryAnnualMax:70000,salaryCurrency:'USD'};
  assert.equal(rankJobs([paid],{...p,minSalary:'75000'},now).length,0);
  assert.ok(rankJobs([paid],{...p,minSalary:'65000'},now)[0].warnings.some(w=>w.includes('top')));
  assert.equal(rankJobs([paid],{...p,currency:'EUR',disclosedSalary:true},now).length,0);
});
test('annual salary normalization does not guess hourly rates or dollar currencies',()=>{
  assert.deepEqual(annualSalary('USD 60,000 - 80,000 per year'),{salaryAnnualMin:60000,salaryAnnualMax:80000,salaryCurrency:'USD'});
  assert.equal(annualSalary('£35k–45k annually').salaryAnnualMax,45000);
  for (const text of ['$70,000 annually','USD 20 per hour','USD 90k','EUR 5000 monthly']) assert.equal(annualSalary(text).salaryAnnualMax,null);
});
test('search links reflect preferences and never leak resume text or private LinkedIn URL',()=>{
  const profile = {...p,location:'New York',work:'remote',keywords:'Excel',linkedin:'https://www.linkedin.com/in/private-person',resume:'secret-personal-resume-text'};
  const links = searchLinks(profile); assert.equal(links.length,3);
  const linkedin = new URL(links[0].url); assert.equal(linkedin.searchParams.get('location'),'New York');assert.equal(linkedin.searchParams.get('f_WT'),'2');
  assert.ok(linkedin.searchParams.get('keywords').includes('Excel'.toLowerCase()));
  for (const link of links) {assert.equal(link.url.includes('secret-personal'),false);assert.equal(link.url.includes('private-person'),false);assert.equal(new URL(link.url).protocol,'https:');}
});
test('profile validation blocks bad options, invalid pay and unsafe links',()=>{
  for (const change of [{interests:''},{minSalary:'-1'},{work:'anything'},{linkedin:'javascript:alert(1)'},{linkedin:'https://linkedin.com.evil.test/profile'},{resume:'a'.repeat(30001)}]) assert.throws(()=>validateProfile({...p,...change}));
});
test('public adapters strip HTML and reject unsafe job URLs',()=>{
  assert.equal(plain('<script>bad()</script><p>Finance &amp; research</p>'),'Finance & research');
  const muse = museJob({id:123,name:'Finance Intern',company:{name:'Bank'},locations:[{name:'New York'}],levels:[{name:'Internship'}],contents:'<p>Excel</p>',refs:{landing_page:'https://example.com/job'}});
  assert.equal(muse.description,'Excel');assert.equal(muse.type,'internship');assert.equal(muse.level,'Internship');
  assert.equal(remotiveJob({id:1,title:'Role',url:'javascript:alert(1)'}).url,'');
  assert.equal(remotiveJob({id:2,title:'Finance Intern',url:'https://example.com',salary:'USD 60k per year'}).salaryAnnualMax,60000);
});
test('source aggregation reports partial failures, deduplicates and exposes no fake jobs',async()=>{
  const requested=[];
  const fetcher = async url=>{ requested.push(url); if(url.includes('remotive')) throw new Error('blocked'); const record={id:1,name:'Finance Intern',company:{name:'Bank'},locations:[],levels:[],contents:'Finance',refs:{landing_page:'https://example.com/job'}};return {ok:true,text:async()=>JSON.stringify({results:[record]})}; };
  const data = await discover({fetcher,now,useCache:false});
  assert.equal(data.jobs.length,1);assert.equal(data.sources.find(s=>s.name==='Remotive').status,'unavailable');assert.equal(data.sources[0].status,'ok');
  assert.ok(requested.every(url=>!url.includes('resume')));
  const empty = await discover({fetcher:async()=>({ok:false,status:403}),now,useCache:false});assert.equal(empty.jobs.length,0);assert.ok(empty.sources.every(s=>s.status==='unavailable'));
});
