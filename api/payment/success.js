export default function handler(req, res) {
  const data = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const invId = data.InvId || data.inv_id || '';
  
  // Перенаправляем пользователя обратно в Mini App с флагом успешной оплаты
  const targetUrl = invId ? `/?payment=success&invId=${invId}` : '/?payment=success';
  res.writeHead(302, { Location: targetUrl });
  res.end();
}
