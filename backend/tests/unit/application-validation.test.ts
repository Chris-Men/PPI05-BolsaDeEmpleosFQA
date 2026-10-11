import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicationDataSchema, finalApplicationDataSchema, updateDraftSchema, applicationFiltersSchema, applicationDecisionSchema } from '../../src/validation/application.schema.js';
/** Blank fields can autosave; submission uses a separate required-field validation. */
const blank={personal:{firstName:'',lastName:'',phone:'',department:'',municipality:'',profession:'',educationLevel:''},experience:{lastRole:'',lastOrg:'',skills:'',motivation:''}};
test('borradores incompletos conservan límites y el envío exige datos completos',()=>{
  assert.equal(applicationDataSchema.safeParse(blank).success,true);const final=finalApplicationDataSchema.safeParse(blank);assert.equal(final.success,false);if(!final.success)assert.deepEqual(final.error.issues.map(issue=>issue.path.join('.')),['personal.firstName','personal.lastName','personal.phone','experience.motivation']);
  assert.equal(applicationDataSchema.safeParse({...blank,personal:{...blank.personal,firstName:'x'.repeat(101)}}).success,false);
  assert.equal(updateDraftSchema.safeParse({version:1,currentStep:2,data:blank,resumeId:null,userId:2}).success,false);
});
test('las decisiones son finales, versionadas y excluyen agenda de entrevistas',()=>{
  for(const status of ['PENDING','WITHDRAWN','INTERVIEW'])assert.equal(applicationDecisionSchema.safeParse({version:1,status}).success,false);
  assert.equal(applicationDecisionSchema.safeParse({version:0,status:'SELECTED'}).success,false);
  assert.equal(applicationDecisionSchema.safeParse({version:1,status:'REJECTED',reason:'x'.repeat(2001)}).success,false);
});
test('filtros rechazan fechas inválidas e intervalos invertidos',()=>{
  assert.equal(applicationFiltersSchema.safeParse({from:'2026-02-30'}).success,false);
  assert.equal(applicationFiltersSchema.safeParse({from:'2026-10-12',to:'2026-10-11'}).success,false);
  assert.equal(applicationFiltersSchema.safeParse({kind:'VOLUNTEER',from:'2026-10-01',page:'2'}).success,true);
});
