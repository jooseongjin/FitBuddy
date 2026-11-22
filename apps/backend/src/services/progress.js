const pool = require('../db');
const { ApiError } = require('../errors');

const DAY_MS = 24 * 60 * 60 * 1000;
const envInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
};
const REPAIR_COST = envInt('STREAK_REPAIR_COST', 300);
// 놓친 날로부터 며칠 안에 복구할 수 있는지 (기본 3일: 오늘 기준 1~3일 전에 놓친 하루)
const REPAIR_WINDOW_DAYS = Math.max(1, envInt('STREAK_REPAIR_WINDOW_DAYS', 3));
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

// 복구 대상 찾기. 놓친 날이 "하루"이고 최근 REPAIR_WINDOW_DAYS일 안이면 복구할 수 있다.
//  A) 기록이 끊긴 채 아직 새로 시작하지 않음: 마지막 기록 다음 날 하루만 비었을 때
//     → 그날을 채우면 연속 기록이 그대로 이어진다 (current_streak 유지, 마지막 날짜만 갱신)
//  B) 놓친 뒤 이미 새로 시작함 (예: 금 놓침 → 토·일 완료): 완료·복구 이력으로 놓친 날과 그 전 연속 기록을 찾는다
//     → 그날을 채우면 이전 연속 기록 + 지금 연속 기록이 합쳐진다
//  복구한 날은 기록을 "잇기"만 하고 연속 일수에는 더하지 않는다 (기존 규칙과 같음)
// 반환: { status: 'available'|'expired'|'none', missedDate, resultStreak, lastCompletedDate }
async function findRepairTarget(connection, userNumber, today, record) {
  const currentStreak = Number(record?.current_streak ?? 0);
  const lastDate = dateKey(record?.last_completed_date);
  if (!lastDate || currentStreak < 1) return { status: 'none', missedDate: null, resultStreak: 0 };
  const gap = daysBetween(lastDate, today);

  // A) 아직 새로 시작하지 않음
  if (gap > 1) {
    if (gap === 2) {
      return { status: 'available', missedDate: addDays(today, -1), resultStreak: currentStreak, lastCompletedDate: addDays(today, -1) };
    }
    return { status: 'expired', missedDate: null, resultStreak: currentStreak };
  }

  // B) 이미 새로 시작함: 이력으로 놓친 날 찾기
  const windowStart = addDays(today, -REPAIR_WINDOW_DAYS);
  const historyStart = addDays(today, -400);
  const [completedRows] = await connection.query(
    `SELECT DISTINCT assigned_date FROM User_missions
      WHERE Users_user_number = ? AND mission_status = 'completed' AND assigned_date BETWEEN ? AND ?`,
    [userNumber, historyStart, today],
  );
  const [repairedRows] = await connection.query(
    'SELECT missed_date FROM Streak_repairs WHERE Users_user_number = ? AND missed_date BETWEEN ? AND ?',
    [userNumber, historyStart, today],
  );
  const completed = new Set(completedRows.map((row) => dateKey(row.assigned_date)));
  const covered = new Set([...completed, ...repairedRows.map((row) => dateKey(row.missed_date))]);

  // 마지막 기록일부터 거꾸로 이어진 날을 따라가 처음 비는 날 = 놓친 날
  let missed = lastDate;
  while (covered.has(missed)) missed = addDays(missed, -1);
  if (missed === lastDate || missed < windowStart || missed >= today) return { status: 'none', missedDate: null, resultStreak: 0 };

  // 놓친 날 바로 전날까지 이어진 이전 연속 기록 (완료한 날만 센다)
  let previous = 0;
  let day = addDays(missed, -1);
  while (covered.has(day)) {
    if (completed.has(day)) previous += 1;
    day = addDays(day, -1);
  }
  if (previous < 1) return { status: 'none', missedDate: null, resultStreak: 0 };
  return { status: 'available', missedDate: missed, resultStreak: previous + currentStreak, lastCompletedDate: lastDate };
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

  const target = await findRepairTarget(connection, userNumber, today, record);
  let repairStatus = target.status;
  if (repairStatus === 'available' && monthlyRemaining <= 0) repairStatus = 'monthly_limit';
  const missedDate = repairStatus === 'available' || repairStatus === 'monthly_limit' ? target.missedDate : null;
  // 복구하면 이어지는 연속 일수 (화면 문구 "N일 연속 기록이 이어져요"에 사용)
  const brokenStreak = target.resultStreak;

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
    const target = await findRepairTarget(connection, userNumber, today, streak);
    if (target.status === 'expired') {
      throw new ApiError(409, 'STREAK_NOT_REPAIRABLE', `${REPAIR_WINDOW_DAYS}일보다 오래되었거나 이틀 이상 놓친 기록은 복구할 수 없습니다.`);
    }
    if (target.status !== 'available') {
      throw new ApiError(409, 'STREAK_NOT_BROKEN', '복구할 수 있는 놓친 날이 없습니다.');
    }
    if (request.missed_date !== target.missedDate) {
      throw new ApiError(409, 'MISSED_DATE_MISMATCH', '복구 대상 날짜가 다릅니다.', { missed_date: target.missedDate });
    }

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
      'UPDATE Streaks SET current_streak = ?, last_completed_date = ? WHERE Users_user_number = ?',
      [target.resultStreak, target.lastCompletedDate, userNumber],
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