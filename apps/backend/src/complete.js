const express = require("express");
const router = express.Router();
const db = require("./db");

function calculateLevel(totalXp) {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  return Math.floor(Math.sqrt(safeXp / 100)) + 1;
}

function getPointMultiplier(isPremium) {
  return isPremium ? 1.5 : 1.0;
}

router.post("/complete", async (req, res) => {
  const { userId, missionId, completedAt } = req.body;

  if (!userId || !missionId) {
    return res.status(400).json({
      ok: false,
      message: "userId and missionId are required.",
    });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [users] = await conn.query(
      `SELECT id, fit_point, total_earned_xp, level, streak_days, last_completed_date, is_premium
       FROM users
       WHERE id = ? FOR UPDATE`,
      [userId]
    );

    if (!users || users.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    const [missions] = await conn.query(
      `SELECT id, reward_points, reward_xp
       FROM missions
       WHERE id = ?`,
      [missionId]
    );

    if (!missions || missions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Mission not found." });
    }

    const user = users[0];
    const mission = missions[0];

    const basePoints = Number(mission.reward_points) || 0;
    const baseXp = Number(mission.reward_xp) || 0;
    const multiplier = getPointMultiplier(Boolean(user.is_premium));
    const earnedPoints = Math.round(basePoints * multiplier);

    const prevXp = Number(user.total_earned_xp) || 0;
    const nextXp = prevXp + baseXp;
    const prevLevel = Number(user.level) || calculateLevel(prevXp);
    const nextLevel = calculateLevel(nextXp);
    const nextPoints = (Number(user.fit_point) || 0) + earnedPoints;

    const targetDate = completedAt
      ? new Date(completedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    let nextStreak = Number(user.streak_days) || 0;
    if (user.last_completed_date !== targetDate) {
      nextStreak += 1;
    }

    await conn.query(
      `UPDATE users
       SET fit_point = ?,
           total_earned_xp = ?,
           level = ?,
           streak_days = ?,
           last_completed_date = ?
       WHERE id = ?`,
      [nextPoints, nextXp, nextLevel, nextStreak, targetDate, userId]
    );

    await conn.query(
      `INSERT INTO mission_completions (user_id, mission_id, earned_points, earned_xp, completed_date)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, missionId, earnedPoints, baseXp, targetDate]
    );

    await conn.commit();

    return res.status(200).json({
      ok: true,
      data: {
        userId,
        missionId,
        earnedPoints,
        earnedXp: baseXp,
        multiplier,
        fitPoint: nextPoints,
        totalEarnedXp: nextXp,
        previousLevel: prevLevel,
        level: nextLevel,
        leveledUp: nextLevel > prevLevel,
        streakDays: nextStreak,
      },
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }
    console.error("[complete.js] transaction error:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to complete mission.",
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

module.exports = router;
