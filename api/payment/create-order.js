import { RobokassaClient } from '../../src/core/robokassa.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { amount = 399, plan = 'monthly_sub', userId = 'user_demo', email = '' } = body;
    const isRecurring = plan === 'monthly_sub';

    const client = new RobokassaClient();
    const order = client.generatePaymentUrl({
      amount,
      plan,
      isRecurring,
      email,
      description: 'Подписка АСТРА Селеста VIP'
    });

    return res.status(200).json({
      invId: order.invId,
      amount: order.amount,
      plan,
      paymentUrl: order.paymentUrl,
      recurring: order.recurring,
      isTest: order.isTest,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
