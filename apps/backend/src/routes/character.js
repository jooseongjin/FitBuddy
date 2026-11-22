const express = require("express");
const router = express.Router();
const db = require("../db");

function getXpForNextLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  return safeLevel * safeLevel * 100;
}

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [users] = await db.query(
      `SELECT id, fit_point, total_earned_xp, level, equipped_item_id
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    const [inventory] = await db.query(
      `SELECT ui.item_id, si.name, si.category, si.price, si.image_url
       FROM user_items ui
       JOIN shop_items si ON ui.item_id = si.id
       WHERE ui.user_id = ?`,
      [userId]
    );

    const user = users[0];
    const currentLevel = Number(user.level) || 1;
    const totalXp = Number(user.total_earned_xp) || 0;

    return res.status(200).json({
      ok: true,
      data: {
        userId: user.id,
        fitPoint: Number(user.fit_point) || 0,
        totalEarnedXp: totalXp,
        level: currentLevel,
        nextLevelXp: getXpForNextLevel(currentLevel),
        equippedItemId: user.equipped_item_id || null,
        inventory,
      },
    });
  } catch (err) {
    console.error("[character.js] get error:", err);
    return res.status(500).json({ ok: false, message: "Failed to fetch character." });
  }
});

router.post("/shop/buy", async (req, res) => {
  const { userId, itemId } = req.body;

  if (!userId || !itemId) {
    return res.status(400).json({
      ok: false,
      message: "userId and itemId are required.",
    });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [users] = await conn.query(
      `SELECT id, fit_point
       FROM users
       WHERE id = ? FOR UPDATE`,
      [userId]
    );

    if (!users || users.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "User not found." });
    }

    const [items] = await conn.query(
      `SELECT id, name, price
       FROM shop_items
       WHERE id = ?`,
      [itemId]
    );

    if (!items || items.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Shop item not found." });
    }

    const [owned] = await conn.query(
      `SELECT id
       FROM user_items
       WHERE user_id = ? AND item_id = ?`,
      [userId, itemId]
    );

    if (owned && owned.length > 0) {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Item already owned." });
    }

    const currentPoints = Number(users[0].fit_point) || 0;
    const price = Number(items[0].price) || 0;

    if (currentPoints < price) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Insufficient FitPoint." });
    }

    const nextPoints = currentPoints - price;

    await conn.query(
      `UPDATE users
       SET fit_point = ?
       WHERE id = ?`,
      [nextPoints, userId]
    );

    await conn.query(
      `INSERT INTO user_items (user_id, item_id)
       VALUES (?, ?)`,
      [userId, itemId]
    );

    await conn.commit();

    return res.status(200).json({
      ok: true,
      data: {
        userId,
        itemId,
        itemName: items[0].name,
        spentPoints: price,
        fitPoint: nextPoints,
      },
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_) {}
    }
    console.error("[character.js] buy error:", err);
    return res.status(500).json({ ok: false, message: "Failed to purchase item." });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

router.post("/equip", async (req, res) => {
  const { userId, itemId } = req.body;

  if (!userId) {
    return res.status(400).json({ ok: false, message: "userId is required." });
  }

  try {
    if (itemId !== null && itemId !== undefined) {
      const [owned] = await db.query(
        `SELECT id
         FROM user_items
         WHERE user_id = ? AND item_id = ?`,
        [userId, itemId]
      );

      if (!owned || owned.length === 0) {
        return res.status(403).json({
          ok: false,
          message: "You do not own this item.",
        });
      }
    }

    await db.query(
      `UPDATE users
       SET equipped_item_id = ?
       WHERE id = ?`,
      [itemId ?? null, userId]
    );

    return res.status(200).json({
      ok: true,
      data: {
        userId,
        equippedItemId: itemId ?? null,
      },
    });
  } catch (err) {
    console.error("[character.js] equip error:", err);
    return res.status(500).json({ ok: false, message: "Failed to equip item." });
  }
});

module.exports = router;
