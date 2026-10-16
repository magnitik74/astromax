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
    const { amount, plan = 'trial_3d', userId = 'user_demo', email = '' } = body;
    const finalAmount = amount !== undefined ? amount : (plan === 'trial_3d' ? 1 : 399);
    const isRecurring = plan === 'trial_3d' || plan === 'monthly_sub';
    const description = plan === 'trial_3d'
      ? 'Пробный период 3 дня АСТРА VIP (далее 245 ₽/нед)'
      : 'Подписка АСТРА Селеста VIP';

    const client = new RobokassaClient();
    const order = client.generatePaymentUrl({
      amount: finalAmount,
      plan,
      isRecurring,
      email,
      description
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
