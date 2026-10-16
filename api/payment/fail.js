export default function handler(req, res) {
  // Перенаправляем пользователя обратно в Mini App с флагом отмены оплаты
  res.writeHead(302, { Location: '/?payment=fail' });
  res.end();
}
