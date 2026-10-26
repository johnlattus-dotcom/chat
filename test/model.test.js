import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, pending, due, calendar, validDate } from '../public/model.js';
const job = { id:'test-1', company:'Acme', role:'Designer', status:'Applied', applied:'2026-10-20', followup:'2026-10-26', followupDone:false, notes:'Ask about team, timeline; next\ninterview', url:'https://example.com/job' };
test('due dates include today and overdue dates, excluding completed or closed applications', () => {
  assert.equal(due(job, '2026-10-26'), true);
  assert.equal(due(job, '2026-10-27'), true);
  assert.equal(due(job, '2026-10-25'), false);
  for (const status of ['Rejected','Withdrawn']) assert.equal(pending({...job,status}),false);
  assert.equal(due({...job,followupDone:true},'2026-10-27'),false);
  assert.equal(pending({...job,followup:''}),false);
});
test('validation rejects invalid dates, unsafe URLs and malformed backups', () => {
  assert.equal(validate(job),job);
  assert.equal(validDate('2026-02-30'),false);
  assert.equal(validDate('2028-02-29'),true);
  for (const change of [{company:''},{role:' '},{status:'Unknown'},{applied:'2026-02-30'},{url:'javascript:alert(1)'},{followup:'tomorrow'},{followupDone:'false'},{notes:null}]) assert.throws(() => validate({...job,...change}));
});
test('calendar uses exact dates, escaped notes and an alarm, including year rollover', () => {
  const ics = calendar({...job,followup:'2026-12-31'});
  assert.match(ics,/DTSTART;VALUE=DATE:20261231\r\n/);
  assert.match(ics,/DTEND;VALUE=DATE:20270101\r\n/);
  assert.ok(ics.includes('team\\, timeline\\; next\\ninterview'));
  assert.match(ics,/BEGIN:VALARM/);
  assert.throws(() => calendar({...job,followupDone:true}));
});
test('calendar folds long Unicode lines without losing content', () => {
  const ics = calendar({...job,company:'🌱'.repeat(70)});
  assert.ok(ics.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
  assert.ok(ics.replaceAll('\r\n ','').includes('🌱'.repeat(70)));
});
