import crypto from 'node:crypto';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { amount = 490, plan = 'monthly_sub', userId = 'user_demo' } = body;
    const merchantLogin = process.env.ROBOKASSA_LOGIN || 'AstroMaxTest';
    const pass1 = process.env.ROBOKASSA_PASS1 || 'testPass1_sample';
    const invId = Math.floor(Date.now() / 1000);
    const isRecurring = plan === 'monthly_sub';

    const outSumFormatted = Number(amount).toFixed(2);
    const signatureString = `${merchantLogin}:${outSumFormatted}:${invId}:${pass1}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const isTest = process.env.ROBOKASSA_TEST ? '1' : '1';
    let paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchantLogin}&OutSum=${outSumFormatted}&InvId=${invId}&Description=${encodeURIComponent('Подписка АСТРА Селеста VIP')}&SignatureValue=${signature}&IsTest=${isTest}`;
    
    if (isRecurring) {
      paymentUrl += `&Recurring=true`;
    }

    return res.status(200).json({
      invId,
      amount: outSumFormatted,
      plan,
      paymentUrl,
      recurring: isRecurring,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
