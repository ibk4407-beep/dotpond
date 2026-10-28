import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {validImage,validLevel,trustedUrl}=require('../desktop/validation.cjs');
test('desktop IPC accepts only bounded image buffers and finite audio levels',()=>{
  assert.equal(validImage({width:2,height:2,data:new Uint8ClampedArray(16)}),true);
  assert.equal(validImage({width:1e6,height:1e6,data:[]}),false);
  assert.equal(validImage({width:2,height:2,data:new Uint8Array(3)}),false);
  assert.equal(validLevel(NaN),false);assert.equal(validLevel(-1),false);assert.equal(validLevel(.7),true);
});
test('only the packaged app origin is trusted',()=>{
  assert.equal(trustedUrl('app://dotpond/index.html'),true);
  assert.equal(trustedUrl('https://dotpond.evil/index.html'),false);
  assert.equal(trustedUrl('app://dotpond.evil/index.html'),false);
  assert.equal(trustedUrl('invalid'),false);
});
