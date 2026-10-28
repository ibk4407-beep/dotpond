import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, normalize, koiPosition, koiWidth, pixelColor, validateImage, audioLevel} from '../dist/model.mjs';

test('settings reject unsupported values and clamp numeric input', () => {
  assert.deepEqual(normalize(null), defaults);
  const result = normalize({scene:'<script>', speed:99, size:-5, brightness:'bad', color:'#ff0000', paused:true});
  assert.equal(result.scene, 'pond'); assert.equal(result.speed, 2); assert.equal(result.size, 3);
  assert.equal(result.brightness, defaults.brightness); assert.equal(result.color, '#ff0000'); assert.equal(result.paused, true);
  assert.equal(normalize({scene:'image'}).scene, 'pond');
});
test('fish stay inside the viewport and have a tapered body', () => {
  for(let t=0;t<2000;t+=3) for(let i=0;i<5;i++) {
    const p=koiPosition(t,i); assert.ok(p.x>.05 && p.x<.95 && p.y>.05 && p.y<.95);
  }
  assert.equal(koiWidth(0),0); assert.equal(koiWidth(1),0); assert.ok(koiWidth(.35)>koiWidth(.85));
});
test('pixel conversion handles transparent and dark pixels', () => {
  assert.equal(pixelColor(255,255,255,0,1), null);
  assert.equal(pixelColor(255,128,64,255,.5), 'rgb(128,64,32)');
  assert.equal(pixelColor(0,0,0,255,1), null);
});
test('file boundary accepts only supported types and limited size', () => {
  assert.equal(validateImage({type:'image/png',size:100}), null);
  assert.match(validateImage({type:'image/svg+xml',size:100}), /PNG/);
  assert.match(validateImage({type:'image/jpeg',size:16*1024*1024}), /15/);
});
test('audio RMS is normalized and silent input remains zero', () => {
  assert.equal(audioLevel(new Uint8Array([128,128])),0);
  assert.equal(audioLevel(new Uint8Array([0,255])),1);
});
