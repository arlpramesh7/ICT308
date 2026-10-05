const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validPhone } = require('../src/services/phoneValidation');
const accepted = ['', '   ', '0400123456', '0400 123 456', '+61 400 123 456', '(02) 9123 4567', '+61 2 9123 4567', '1300 123 456', '1800 123 456', '13 12 34'];
const rejected = ['dvds', 'fwefwe', 'not-a-phone', '123', '0000000000', '+614001234567', '++61 400 123 456', '++', '---+', '---', '()', '+44 7700 900123', '04/00123456', '04'.repeat(14), null, ['0400123456'], 400123456];
test('optional Australian phone validation accepts blank and standard local/international formats', () => {
  for (const phone of accepted) assert.equal(validPhone(phone), true, JSON.stringify(phone));
});
test('phone validation rejects malformed and non-Australian values', () => {
  for (const phone of rejected) assert.equal(validPhone(phone), false, JSON.stringify(phone));
});
test('browser and server phone rules remain consistent', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/js/phone-validation.js'), 'utf8');
  const browser = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  for (const phone of [...accepted, ...rejected]) assert.equal(browser.validPhone(phone), validPhone(phone));
});
