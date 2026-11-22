const crypto = require('crypto');
const pool = require('../db');
const { ApiError } = require('../errors');
const { getPlan } = require('./progress');

const envInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
const PRICE = envInt('SUBSCRIPTION_PRICE', 4900);
const PERIOD_DAYS = envInt('SUBSCRIPTION_DAYS', 30);
// completeMission 의 Premium 배율(1.5)과 같은 값. 안내용 표시이며 실제 지급은 progress.js 가 계산한다.
const PREMIUM_POINT_MULTIPLIER = 1.5;

// 모의 결제: 실제 결제 없이 성공/실패를 시뮬레이션하고 거래 ID 를 만든다 (TRD ADR: 모의 결제)
function mockPay(mockResult) {
  if (mockResult === 'fail') return { ok: false, transactionId: null };
  return { ok: true, transactionId: `MOCK-${crypto.randomUUID()}` };
}

async function getSubscription(userNumber, connection = pool) {
  const [[subscription]] = await connection.query(
    'SELECT plan, sub_status, started_at, expires_at FROM Subscriptions WHERE Users_user_number = ?',
    [userNumber],
  );
  const plan = await getPlan(userNumber, connection);
  const [payments] = await connection.query(
    `SELECT payment_id, amount, pay_status, pg_transaction_id, created_at
       FROM Payment_logs WHERE Users_user_number = ? ORDER BY payment_id DESC LIMIT 5`,
    [userNumber],
  );
  return {
    plan,
    sub_status: subscription?.sub_status ?? null,
    started_at: subscription?.started_at ?? null,
    expires_at: plan === 'premium' ? subscription.expires_at : null,
    price: PRICE,
    period_days: PERIOD_DAYS,
    point_multiplier: plan === 'premium' ? PREMIUM_POINT_MULTIPLIER : 1,
    payments,
  };
}

// 결제 성공 시에만 Premium 과 만료일을 적용한다. 실패하면 구독 상태는 그대로 두고 결제 기록(failed)만 남긴다.
async function subscribe(userNumber, mockResult = 'success') {
  const connection = await pool.getConnection();
  let failed = false;
  try {
    await connection.beginTransaction();
    await connection.query('SELECT user_number FROM Users WHERE user_number = ? FOR UPDATE', [userNumber]);
    if ((await getPlan(userNumber, connection)) === 'premium') {
      throw new ApiError(409, 'ALREADY_SUBSCRIBED', '이미 Premium을 구독 중입니다.');
    }

    const [pending] = await connection.query(
      "INSERT INTO Payment_logs (Users_user_number, amount, pay_status) VALUES (?, ?, 'pending')",
      [userNumber, PRICE],
    );
    const paymentId = pending.insertId;
    const result = mockPay(mockResult);

    if (!result.ok) {
      await connection.query("UPDATE Payment_logs SET pay_status = 'failed' WHERE payment_id = ?", [paymentId]);
      failed = true;
    } else {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + PERIOD_DAYS * 24 * 60 * 60 * 1000);
      await connection.query(
        `INSERT INTO Subscriptions (Users_user_number, plan, sub_status, started_at, expires_at)
         VALUES (?, 'premium', 'active', ?, ?)
         ON DUPLICATE KEY UPDATE plan = 'premium', sub_status = 'active', started_at = VALUES(started_at), expires_at = VALUES(expires_at)`,
        [userNumber, startedAt, expiresAt],
      );
      const [[subscription]] = await connection.query(
        'SELECT subscriptions_id FROM Subscriptions WHERE Users_user_number = ?',
        [userNumber],
      );
      await connection.query(
        "UPDATE Payment_logs SET pay_status = 'success', pg_transaction_id = ?, Subscriptions_subscriptions_id = ? WHERE payment_id = ?",
        [result.transactionId, subscription.subscriptions_id, paymentId],
      );
    }
    await connection.commit();
    if (failed) throw new ApiError(402, 'PAYMENT_FAILED', '결제에 실패했습니다. 구독 상태는 변경되지 않았습니다.');

    const [[payment]] = await connection.query(
      'SELECT payment_id, amount, pay_status, pg_transaction_id, created_at FROM Payment_logs WHERE payment_id = ?',
      [paymentId],
    );
    const [[subscription]] = await connection.query(
      'SELECT plan, sub_status, started_at, expires_at FROM Subscriptions WHERE Users_user_number = ?',
      [userNumber],
    );
    return { plan: subscription.plan, sub_status: subscription.sub_status, expires_at: subscription.expires_at, payment };
  } catch (error) {
    if (!failed) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { getSubscription, subscribe };
