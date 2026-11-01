import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isClientEmailSearch, matchesClientSearch, matchesClientOwnership, getClientListCategory } from '../src/logic/clientSearch.ts';

const own={user_id:'owner',name:'王小明',birthYear:1980,creatorEmail:'owner@example.com',majorStars:'紫微天府'};
const student={user_id:'student',name:'學員本人',birthYear:1990,creatorEmail:'Student.Test@Example.com',majorStars:'天同太陰'};
const stars=['紫微','天府','天同','太陰'];

test('full and partial Email searches are literal, case insensitive and trimmed',()=>{
  for(const term of ['Student.Test@Example.com','  student.test@example.com  ','student.test@','@example.com']) {
    assert.equal(isClientEmailSearch(term),true);
    assert.equal(matchesClientSearch(student,term,stars),true);
  }
  assert.equal(matchesClientSearch(student,'unknown@example.com',stars),false);
  assert.equal(matchesClientSearch({...student,creatorEmail:'天同@example.com'},'天同@example.com',stars),true);
});
test('owner Email search can find students even with only-mine enabled; name search cannot bypass it',()=>{
  assert.equal(matchesClientOwnership(student,'owner',true,true,'student.test@example.com'),true);
  assert.equal(matchesClientOwnership(student,'owner',true,true,'學員'),false);
  assert.equal(matchesClientOwnership(student,'owner',true,false,'學員'),true);
});
test('non-owner Email searches never grant access to another account or an unknown session',()=>{
  assert.equal(matchesClientOwnership(student,'owner',false,true,'student.test@example.com'),false);
  assert.equal(matchesClientOwnership(student,'owner',false,false,'student.test@example.com'),false);
  assert.equal(matchesClientOwnership(student,'student',false,true,'student.test@example.com'),true);
  assert.equal(matchesClientOwnership(student,null,false,false,'student.test@example.com'),false);
});
test('name, birth year and combined star searches retain their behavior',()=>{
  for(const term of ['王小明','1980','紫微天府','王小明 紫微']) assert.equal(matchesClientSearch(own,term,stars),true);
  assert.equal(matchesClientSearch(own,'太陰',stars),false);
  assert.equal(matchesClientSearch(own,'',stars),true);
});

test('all existing charts from student accounts group under 學員 for the owner without rewriting categories',()=>{
  for (const type of ['我','家人','朋友','VIP','客戶','紫占']) {
    const chart={...student,creatorRole:'student',type};
    assert.equal(getClientListCategory(chart,true),'學員');
    assert.equal(getClientListCategory(chart,false),type);
    assert.equal(chart.type,type);
  }
});
test('student grouping follows current role; non-students and manual categories are preserved',()=>{
  assert.equal(getClientListCategory({...own,creatorRole:'general',type:'客戶'},true),'客戶');
  assert.equal(getClientListCategory({...own,creatorRole:'admin',type:'我'},true),'我');
  assert.equal(getClientListCategory({...own,type:'學員'},true),'學員');
  assert.equal(getClientListCategory({...student,creatorRole:'student',type:'家人'},true),'學員');
  assert.equal(getClientListCategory({...student,creatorRole:'general',type:'家人'},true),'家人');
  assert.equal(getClientListCategory({...own},true),'其他');
});
