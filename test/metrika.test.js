import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MetrikaTracker } from '../src/analytics/metrika.js';

test('MetrikaTracker handles offline conversion in simulation mode', async () => {
  const tracker = new MetrikaTracker();
  const res = await tracker.trackOfflineConversion({
    clientId: '123456789.987654321',
    target: 'payment_success_tripwire',
    price: 199,
  });

  assert.equal(res.success, true);
  assert.equal(res.simulated, true);
});
