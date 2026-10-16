import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { RobokassaClient } from '../src/core/robokassa.js';
import { createServer } from '../src/server.js';

test('RobokassaClient: Production mode produces correct MD5 signature and omits IsTest=1', () => {
  const client = new RobokassaClient({
    isTest: false,
    login: 'AstraApp',
    pass1Prod: 'RtUx4cUwFuv53R7FIp0I',
    pass2Prod: 'nko052HLKsUIvX25yAUC'
  });

  const order = client.generatePaymentUrl({
    amount: 399,
    invId: 998877,
    description: 'Подписка АСТРА Селеста VIP'
  });

  const expectedSig = crypto.createHash('md5')
    .update('AstraApp:399.00:998877:RtUx4cUwFuv53R7FIp0I')
    .digest('hex');

  assert.equal(order.invId, 998877);
  assert.equal(order.amount, '399.00');
  assert.equal(order.signature, expectedSig);
  assert.equal(order.isTest, false);
  assert.ok(order.paymentUrl.includes('MerchantLogin=AstraApp'));
  assert.ok(order.paymentUrl.includes(`SignatureValue=${expectedSig}`));
  assert.equal(order.paymentUrl.includes('IsTest=1'), false, 'Production URL must NOT contain IsTest=1');

  // ResultURL Signature check (Pass2)
  const resultSig = crypto.createHash('md5')
    .update('399.00:998877:nko052HLKsUIvX25yAUC')
    .digest('hex');

  assert.equal(client.verifyResultSignature({ outSum: '399.00', invId: 998877, signatureValue: resultSig }), true);
  assert.equal(client.verifyResultSignature({ outSum: '399.00', invId: 998877, signatureValue: 'wrong_sig' }), false);
});

test('RobokassaClient: Testing/Sandbox mode uses test passwords and includes IsTest=1', () => {
  const client = new RobokassaClient({
    isTest: true,
    login: 'AstraApp',
    pass1Test: 'gzk2f3BeFQEG2qpg0S4H',
    pass2Test: 'VJINZ7gxF21HV0coA5XL'
  });

  const order = client.generatePaymentUrl({
    amount: 399,
    invId: 554433,
    description: 'Подписка АСТРА Селеста VIP'
  });

  const expectedSig = crypto.createHash('md5')
    .update('AstraApp:399.00:554433:gzk2f3BeFQEG2qpg0S4H')
    .digest('hex');

  assert.equal(order.signature, expectedSig);
  assert.equal(order.isTest, true);
  assert.ok(order.paymentUrl.includes('IsTest=1'), 'Test URL must include IsTest=1');

  // ResultURL Signature check with test Pass2
  const resultSig = crypto.createHash('md5')
    .update('399.00:554433:VJINZ7gxF21HV0coA5XL')
    .digest('hex');

  assert.equal(client.verifyResultSignature({ outSum: '399.00', invId: 554433, signatureValue: resultSig }), true);
});

test('Server API: End-to-end Robokassa lifecycle (/api/payment/create-order and /result)', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Create order
    const orderRes = await fetch(`http://localhost:${port}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 399, plan: 'monthly_sub', userId: 'client_101' }),
    });
    assert.equal(orderRes.status, 200);
    const orderData = await orderRes.json();
    assert.ok(orderData.paymentUrl.includes('auth.robokassa.ru'));
    assert.ok(orderData.paymentUrl.includes('MerchantLogin=AstraApp'));
    assert.ok(orderData.invId > 0);

    const client = new RobokassaClient();
    const pass2 = client.getPass2();
    const validResultSig = crypto.createHash('md5')
      .update(`399.00:${orderData.invId}:${pass2}`)
      .digest('hex');

    // 2. ResultURL callback with valid signature
    const resultRes = await fetch(`http://localhost:${port}/api/payment/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        OutSum: '399.00',
        InvId: String(orderData.invId),
        SignatureValue: validResultSig,
        shp_userId: 'client_101'
      }).toString(),
    });

    assert.equal(resultRes.status, 200);
    const resultText = await resultRes.text();
    assert.equal(resultText, `OK${orderData.invId}`, 'Robokassa requires OK{InvId} response');

    // 3. ResultURL callback with invalid signature
    const badRes = await fetch(`http://localhost:${port}/api/payment/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        OutSum: '399.00',
        InvId: String(orderData.invId),
        SignatureValue: 'fraudulent_signature',
      }).toString(),
    });
    assert.equal(badRes.status, 400);

    // 4. SuccessURL redirect
    const successRes = await fetch(`http://localhost:${port}/api/payment/success?InvId=${orderData.invId}`, {
      redirect: 'manual'
    });
    assert.equal(successRes.status, 302);
    assert.ok(successRes.headers.get('location').includes('payment=success'));

    // 5. FailURL redirect
    const failRes = await fetch(`http://localhost:${port}/api/payment/fail`, {
      redirect: 'manual'
    });
    assert.equal(failRes.status, 302);
    assert.ok(failRes.headers.get('location').includes('payment=fail'));
  } finally {
    server.close();
  }
});
