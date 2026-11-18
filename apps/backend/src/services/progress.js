const pool = require('../db');
const { ApiError } = require('../errors');

const DAY_MS = 24 * 60 * 60 * 1000;
const envInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};
const REPAIR_COST = envInt('STREAK_REPAIR_COST', 300);
// 월별 복구 한도: 무료 복구와 포인트 복구를 따로 센다 (매월 1일 00:00 KST에 초기화, 이월 없음)
const REPAIR_LIMITS = {
  basic: {
    free: envInt('STREAK_REPAIR_FREE_BASIC', 1),
    points: envInt('STREAK_REPAIR_POINTS_BASIC', 1),
  },
  premium: {
    free: envInt('STREAK_REPAIR_FREE_PREMIUM', 2),
    points: envInt('STREAK_REPAIR_POINTS_PREMIUM', 2),
  },
};

const todayKST = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const addDays = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const dateKey = (value) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
const daysBetween = (from, to) => (Date.parse(`${dateKey(to)}T00:00:00Z`) - Date.parse(`${dateKey(from)}T00:00:00Z`)) / DAY_MS;
const toKstIso = (date = new Date()) => `${new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)}+09:00`;

async function getBalance(userNumber, connection = pool) {
  const [[row]] = await connection.query(
    'SELECT COALESCE(SUM(amount), 0) AS balance FROM Point_transactions WHERE Users_user_number = ?',
    [userNumber],
  );
  return Number(row.balance);
}

async function getPlan(userNumber, connection = pool) {
  const [[subscription]] = await connection.query(
    'SELECT plan, sub_status, expires_at FROM Subscriptions WHERE Users_user_number = ?',
    [userNumber],
  );
  const premium = subscription?.plan === 'premium'
    && subscription.sub_status === 'active'
    && (!subscription.expires_at || new Date(subscription.expires_at) > new Date());
  return premium ? 'premium' : 'basic';
}

async function getCharacter(userNumber, connection = pool) {
  const [[character]] = await connection.query(
    'SELECT level, total_earned_xp FROM `Characters` WHERE Users_user_number = ?',
    [userNumber],
  );
  if (!character) throw new ApiError(404, 'CHARACTER_NOT_FOUND', '캐릭터 정보를 찾을 수 없습니다.');
  return {
    level: Number(character.level),
    total_earned_xp: Number(character.total_earned_xp),
    current_level_xp: null,
    next_level_xp: null,
    is_max_level: false,
  };
}

async function getStreak(userNumber, connection = pool, today = todayKST()) {
  const [[record]] = await connection.query(
    'SELECT current_streak, last_completed_date FROM Streaks WHERE Users_user_number = ?',
    [userNumber],
  );
  const plan = await getPlan(userNumber, connection);
  const currentStreak = Number(record?.current_streak ?? 0);
  const lastCompletedDate = dateKey(record?.last_completed_date);
  const gap = lastCompletedDate ? daysBetween(lastCompletedDate, today) : null;
  const displayStreak = gap !== null && gap <= 1 ? currentStreak : 0;
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthStart = addDays(monthStart, 32).slice(0, 7) + '-01';
  const weekStart = addDays(today, -6);

  const [repairs] = await connection.query(
    `SELECT missed_date, repair_method, DATE(created_at) AS repaired_on
       FROM Streak_repairs
      WHERE Users_user_number = ?
        AND (created_at >= ? AND created_at < ? OR missed_date BETWEEN ? AND ?)`,
    [userNumber, monthStart, nextMonthStart, weekStart, today],
  );
  const monthRepairs = repairs.filter((repair) => dateKey(repair.repaired_on) >= monthStart && dateKey(repair.repaired_on) < nextMonthStart);
  const limits = REPAIR_LIMITS[plan];
  const freeUsed = monthRepairs.filter((repair) => repair.repair_method === 'free').length;
  const pointsUsed = monthRepairs.length - freeUsed;
  const freeRemaining = Math.max(0, limits.free - freeUsed);
  const pointsRemaining = Math.max(0, limits.points - pointsUsed);
  const monthlyRemaining = freeRemaining + pointsRemaining;

  let repairStatus = 'none';
  let missedDate = null;
  let brokenStreak = 0;
  if (gap !== null && gap > 1 && currentStreak > 0) {
    brokenStreak = currentStreak;
    if (gap > 2) repairStatus = 'expired';
    else {
      repairStatus = monthlyRemaining > 0 ? 'available' : 'monthly_limit';
      missedDate = addDays(today, -1);
    }
  }

  const [completedRows] = await connection.query(
    `SELECT assigned_date
       FROM User_missions
      WHERE Users_user_number = ? AND mission_status = 'completed' AND assigned_date BETWEEN ? AND ?`,
    [userNumber, weekStart, today],
  );
  const completedDates = new Set(completedRows.map((row) => dateKey(row.assigned_date)));
  const repairedDates = new Set(repairs.map((repair) => dateKey(repair.missed_date)));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const status = date === today
      ? (completedDates.has(date) ? 'today_done' : 'today_pending')
      : completedDates.has(date)
        ? 'done'
        : repairedDates.has(date)
          ? 'repaired'
          : 'missed';
    return { date, status };
  });

  return {
    current_streak: displayStreak,
    last_completed_date: lastCompletedDate,
    today_completed: gap === 0,
    is_broken: gap !== null && gap > 1,
    plan,
    repair: {
      status: repairStatus,
      missed_date: missedDate,
      broken_streak: brokenStreak,
      cost: REPAIR_COST,
      free_remaining: freeRemaining,
      points_remaining: pointsRemaining,
      free_limit: limits.free,
      points_limit: limits.points,
      monthly_remaining: monthlyRemaining,
      resets_on: nextMonthStart,
    },
    week,
    server_now: toKstIso(),
  };
}

async function completeMission(userNumber, userMissionId) {
  const connection = await pool.getConnection();
  const today = todayKST();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT user_number FROM Users WHERE user_number = ? FOR UPDATE', [userNumber]);

    const [[mission]] = await connection.query(
      `SELECT um.user_mission_id, um.mission_status, um.progress_value, um.assigned_date,
              m.Missions_id, m.base_point, m.target_value, m.target_unit,
              r.metric AS verify_metric, r.min_value AS required_value,
              COALESCE(d.verified_steps, 0) AS verified_steps,
              COALESCE(d.active_minutes, 0) AS verified_minutes
         FROM User_missions um
         JOIN Missions m ON m.Missions_id = um.Missions_id
         LEFT JOIN Mission_verify_rules r ON r.Missions_id = m.Missions_id
         LEFT JOIN Daily_activity d
           ON d.Users_user_number = um.Users_user_number AND d.activity_date = um.assigned_date
        WHERE um.user_mission_id = ? AND um.Users_user_number = ?
        FOR UPDATE`,
      [userMissionId, userNumber],
    );
    if (!mission) throw new ApiError(404, 'MISSION_NOT_FOUND', '배정된 미션을 찾을 수 없습니다.');
    if (dateKey(mission.assigned_date) !== today) throw new ApiError(409, 'MISSION_NOT_TODAY', '오늘 배정된 미션만 완료할 수 있습니다.');
    if (mission.mission_status !== 'assigned') throw new ApiError(409, 'MISSION_ALREADY_COMPLETED', '이미 완료한 미션입니다.');
    if (Number(mission.progress_value) < Number(mission.target_value)) {
      throw new ApiError(409, 'MISSION_NOT_ACHIEVED', '미션 목표를 채운 뒤 완료할 수 있습니다.', {
        current: Number(mission.progress_value),
        target: Number(mission.target_value),
        unit: mission.target_unit,
      });
    }

    const verifyMetric = mission.verify_metric ?? null;
    const measuredValue = verifyMetric === 'steps'
      ? Number(mission.verified_steps)
      : verifyMetric === 'exercise_minutes'
        ? Number(mission.verified_minutes)
        : Number(mission.progress_value);
    if (verifyMetric && measuredValue < Number(mission.required_value)) {
      throw new ApiError(409, 'MISSION_NOT_VERIFIED', '건강 기록이 미션 인증 기준에 도달하지 않았습니다.', {
        metric: verifyMetric,
        current: measuredValue,
        required: Number(mission.required_value),
      });
    }
    const verifyStatus = verifyMetric ? 'verified' : 'unverified';
    const verificationMultiplier = verifyMetric ? 1 : 0.5;

    const plan = await getPlan(userNumber, connection);
    const planMultiplier = plan === 'premium' ? 1.5 : 1;
    const multiplier = planMultiplier * verificationMultiplier;
    const basePoint = Number(mission.base_point);
    const earnedPoint = Math.floor(basePoint * multiplier);
    const [[character]] = await connection.query(
      'SELECT level, total_earned_xp FROM `Characters` WHERE Users_user_number = ? FOR UPDATE',
      [userNumber],
    );
    const [[streak]] = await connection.query(
      'SELECT current_streak, last_completed_date FROM Streaks WHERE Users_user_number = ? FOR UPDATE',
      [userNumber],
    );

    const [updated] = await connection.query(
      `UPDATE User_missions SET mission_status = 'completed', completed_at = NOW()
        WHERE user_mission_id = ? AND Users_user_number = ? AND mission_status = 'assigned'`,
      [userMissionId, userNumber],
    );
    if (!updated.affectedRows) throw new ApiError(409, 'MISSION_ALREADY_COMPLETED', '이미 완료한 미션입니다.');

    await connection.query(
      `INSERT INTO Mission_verifications
         (User_missions_user_mission_id, verify_status, metric, measured_value, required_value, reward_multiplier)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userMissionId, verifyStatus, verifyMetric, measuredValue,
        verifyMetric ? Number(mission.required_value) : Number(mission.target_value), verificationMultiplier],
    );

    await connection.query(
      `INSERT INTO Point_transactions (Users_user_number, source, ref_id, base_point, multiplier, amount)
       VALUES (?, 'mission_complete', ?, ?, ?, ?)`,
      [userNumber, userMissionId, basePoint, multiplier, earnedPoint],
    );
    const totalEarnedXp = Number(character.total_earned_xp) + earnedPoint;
    await connection.query(
      'UPDATE `Characters` SET total_earned_xp = ? WHERE Users_user_number = ?',
      [totalEarnedXp, userNumber],
    );

    const lastDate = dateKey(streak.last_completed_date);
    const gap = lastDate ? daysBetween(lastDate, today) : null;
    const previous = gap !== null && gap <= 1 ? Number(streak.current_streak) : 0;
    const increased = gap !== 0;
    const nextStreak = gap === 0
      ? Number(streak.current_streak)
      : gap === 1
        ? Number(streak.current_streak) + 1
        : 1;
    const restarted = increased && lastDate !== null && gap !== 1;
    if (increased) {
      await connection.query(
        'UPDATE Streaks SET current_streak = ?, last_completed_date = ? WHERE Users_user_number = ?',
        [nextStreak, today, userNumber],
      );
    }

    const balance = await getBalance(userNumber, connection);
    await connection.commit();
    return {
      earned_point: earnedPoint,
      earned_xp: earnedPoint,
      total_earned_xp: totalEarnedXp,
      level: { before: Number(character.level), after: Number(character.level) },
      streak: { increased, previous, current: nextStreak, restarted },
      balance,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function repairStreak(userNumber, request) {
  const connection = await pool.getConnection();
  const today = todayKST();
  try {
    await connection.beginTransaction();
    await connection.query('SELECT user_number FROM Users WHERE user_number = ? FOR UPDATE', [userNumber]);
    const [[streak]] = await connection.query(
      'SELECT current_streak, last_completed_date FROM Streaks WHERE Users_user_number = ? FOR UPDATE',
      [userNumber],
    );
    const lastDate = dateKey(streak?.last_completed_date);
    const gap = lastDate ? daysBetween(lastDate, today) : null;
    if (gap === null || gap <= 1 || Number(streak.current_streak) < 1) {
      throw new ApiError(409, 'STREAK_NOT_BROKEN', '연속 기록이 이어지고 있어 복구할 필요가 없습니다.');
    }
    if (gap > 2) throw new ApiError(409, 'STREAK_NOT_REPAIRABLE', '이틀 이상 지난 기록은 복구할 수 없습니다.');
    const expectedMissedDate = addDays(today, -1);
    if (request.missed_date !== expectedMissedDate) throw new ApiError(409, 'MISSED_DATE_MISMATCH', '복구 대상 날짜가 오늘 기준 어제와 다릅니다.');

    const [[existing]] = await connection.query(
      'SELECT repair_id FROM Streak_repairs WHERE Users_user_number = ? AND missed_date = ?',
      [userNumber, request.missed_date],
    );
    if (existing) throw new ApiError(409, 'ALREADY_REPAIRED', '이미 복구한 날짜입니다.');

    const plan = await getPlan(userNumber, connection);
    const monthStart = `${today.slice(0, 7)}-01`;
    const nextMonthStart = addDays(monthStart, 32).slice(0, 7) + '-01';
    const [[usage]] = await connection.query(
      `SELECT COUNT(*) AS used,
              SUM(repair_method = 'free') AS free_used
         FROM Streak_repairs
        WHERE Users_user_number = ? AND created_at >= ? AND created_at < ?`,
      [userNumber, monthStart, nextMonthStart],
    );
    const limits = REPAIR_LIMITS[plan];
    const freeUsed = Number(usage.free_used ?? 0);
    const pointsUsed = Number(usage.used) - freeUsed;
    if (request.method === 'free' && freeUsed >= limits.free) {
      throw new ApiError(409, 'NO_FREE_REPAIR', '이번 달 무료 복구 횟수를 모두 사용했습니다.');
    }
    if (request.method === 'points' && pointsUsed >= limits.points) {
      throw new ApiError(409, 'MONTHLY_LIMIT_EXCEEDED', '이번 달 포인트 복구 횟수를 모두 사용했습니다.');
    }
    const balanceBefore = await getBalance(userNumber, connection);
    if (request.method === 'points' && balanceBefore < REPAIR_COST) {
      throw new ApiError(409, 'INSUFFICIENT_POINTS', 'FitPoint가 부족합니다.', { required: REPAIR_COST, balance: balanceBefore });
    }

    const [inserted] = await connection.query(
      'INSERT INTO Streak_repairs (Users_user_number, missed_date, repair_method) VALUES (?, ?, ?)',
      [userNumber, request.missed_date, request.method],
    );
    if (request.method === 'points') {
      await connection.query(
        `INSERT INTO Point_transactions (Users_user_number, source, ref_id, amount)
         VALUES (?, 'streak_repair', ?, ?)`,
        [userNumber, inserted.insertId, -REPAIR_COST],
      );
    }
    await connection.query(
      'UPDATE Streaks SET last_completed_date = ? WHERE Users_user_number = ?',
      [request.missed_date, userNumber],
    );
    const balance = await getBalance(userNumber, connection);
    await connection.commit();
    return { balance };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { todayKST, getBalance, getPlan, getCharacter, getStreak, completeMission, repairStreak };