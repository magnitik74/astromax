import crypto from 'node:crypto';

/**
 * Модуль интеграции с платежным шлюзом Robokassa
 * Поддерживает боевой (Production) и тестовый (Sandbox) режимы,
 * рекуррентные подписки, расчет и валидацию MD5 подписей по протоколу Robokassa.
 */
export class RobokassaClient {
  constructor(options = {}) {
    this.isTest = options.isTest !== undefined 
      ? Boolean(options.isTest)
      : (process.env.ROBOKASSA_TEST === '1');

    this.login = options.login || process.env.ROBOKASSA_LOGIN || 'AstraApp';
    
    // Пароли инициализации (Пароль #1)
    this.pass1Prod = options.pass1Prod || process.env.ROBOKASSA_PASS1 || 'RtUx4cUwFuv53R7FIp0I';
    this.pass1Test = options.pass1Test || process.env.ROBOKASSA_TEST_PASS1 || 'gzk2f3BeFQEG2qpg0S4H';

    // Пароли валидации оповещений ResultURL (Пароль #2)
    this.pass2Prod = options.pass2Prod || process.env.ROBOKASSA_PASS2 || 'nko052HLKsUIvX25yAUC';
    this.pass2Test = options.pass2Test || process.env.ROBOKASSA_TEST_PASS2 || 'VJINZ7gxF21HV0coA5XL';
  }

  getPass1() {
    return this.isTest ? this.pass1Test : this.pass1Prod;
  }

  getPass2() {
    return this.isTest ? this.pass2Test : this.pass2Prod;
  }

  /**
   * Генерация платежной ссылки Robokassa
   * @param {Object} params
   * @param {number|string} params.amount - Сумма платежа (например 399)
   * @param {number|string} [params.invId] - Уникальный номер заказа
   * @param {string} [params.description] - Описание заказа
   * @param {boolean} [params.isRecurring] - Флаг рекуррентной подписки
   * @param {string} [params.email] - Email плательщика (для фискального чека)
   * @param {string} [params.culture] - Язык интерфейса ('ru')
   * @returns {Object} { invId, amount, signature, isTest, recurring, paymentUrl }
   */
  generatePaymentUrl({
    amount = 399,
    invId = null,
    description = 'Подписка АСТРА Селеста VIP',
    isRecurring = true,
    email = '',
    culture = 'ru'
  } = {}) {
    const validInvId = invId ? Number(invId) : Math.floor(Date.now() / 1000);
    const outSum = Number(amount).toFixed(2);
    const pass1 = this.getPass1();

    // SignatureValue = md5(MerchantLogin:OutSum:InvId:Pass1)
    const signatureSource = `${this.login}:${outSum}:${validInvId}:${pass1}`;
    const signature = crypto.createHash('md5').update(signatureSource).digest('hex');

    const params = new URLSearchParams();
    params.set('MerchantLogin', this.login);
    params.set('OutSum', outSum);
    params.set('InvId', String(validInvId));
    params.set('Description', description);
    params.set('SignatureValue', signature);
    params.set('Culture', culture);

    // В боевом режиме параметр IsTest передавать ЗАПРЕЩЕНО (Robokassa переключится в песочницу и потребует тестовый пароль)
    if (this.isTest) {
      params.set('IsTest', '1');
    }

    if (isRecurring) {
      params.set('Recurring', 'true');
    }

    if (email) {
      params.set('Email', email);
    }

    return {
      invId: validInvId,
      amount: outSum,
      signature,
      isTest: this.isTest,
      recurring: Boolean(isRecurring),
      paymentUrl: `https://auth.robokassa.ru/Merchant/Index.aspx?${params.toString()}`
    };
  }

  /**
   * Проверка подписи уведомления от Robokassa на ResultURL
   * SignatureValue = md5(OutSum:InvId:Pass2)
   */
  verifyResultSignature({ outSum, invId, signatureValue }) {
    if (!outSum || invId === undefined || !signatureValue) return false;
    const pass2 = this.getPass2();

    const expectedFixed = crypto.createHash('md5')
      .update(`${Number(outSum).toFixed(2)}:${invId}:${pass2}`)
      .digest('hex');

    const expectedRaw = crypto.createHash('md5')
      .update(`${outSum}:${invId}:${pass2}`)
      .digest('hex');

    const cleanSig = String(signatureValue).trim().toLowerCase();
    return cleanSig === expectedFixed.toLowerCase() || cleanSig === expectedRaw.toLowerCase();
  }

  /**
   * Проверка подписи перенаправления пользователя на SuccessURL
   * SignatureValue = md5(OutSum:InvId:Pass1)
   */
  verifySuccessSignature({ outSum, invId, signatureValue }) {
    if (!outSum || invId === undefined || !signatureValue) return false;
    const pass1 = this.getPass1();

    const expectedFixed = crypto.createHash('md5')
      .update(`${Number(outSum).toFixed(2)}:${invId}:${pass1}`)
      .digest('hex');

    const expectedRaw = crypto.createHash('md5')
      .update(`${outSum}:${invId}:${pass1}`)
      .digest('hex');

    const cleanSig = String(signatureValue).trim().toLowerCase();
    return cleanSig === expectedFixed.toLowerCase() || cleanSig === expectedRaw.toLowerCase();
  }
}

export const robokassaClient = new RobokassaClient();
