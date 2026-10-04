const test = require('node:test');
const assert = require('node:assert/strict');
const rateLimit = require('../middleware/rateLimit');

const response = { set() {} };

/** Send `count` requests from one address and collect what each was answered with. */
function attempt(limiter, count, ip = '203.0.113.9') {
  const outcomes = [];
  for (let index = 0; index < count; index += 1) {
    limiter({ ip }, response, (error) => outcomes.push(error));
  }
  return outcomes;
}

test('allows requests up to the limit and refuses the next with 429', () => {
  const outcomes = attempt(rateLimit({ windowMs: 60 * 1000, max: 2 }), 3);
  assert.equal(outcomes[0], undefined);
  assert.equal(outcomes[1], undefined);
  assert.equal(outcomes[2].status, 429);
});

test('names a one-minute wait in the singular', () => {
  const [, blocked] = attempt(rateLimit({ windowMs: 60 * 1000, max: 1 }), 2);
  assert.equal(blocked.message, 'Too many attempts. Wait 1 minute and try again.');
});

test('names a longer wait in the plural', () => {
  const [, blocked] = attempt(rateLimit({ windowMs: 15 * 60 * 1000, max: 1 }), 2);
  assert.equal(blocked.message, 'Too many attempts. Wait 15 minutes and try again.');
});

test('counts each address separately', () => {
  const limiter = rateLimit({ windowMs: 60 * 1000, max: 1 });
  attempt(limiter, 2, '203.0.113.9');
  const [other] = attempt(limiter, 1, '203.0.113.10');
  assert.equal(other, undefined);
});
