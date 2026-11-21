const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');
const { getCharacter } = require('../services/progress');
const { ApiError } = require('../errors');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const userNumber = req.user.user_number;
    const baseCharacter = await getCharacter(userNumber);
    const [inventoryRows] = await pool.query(
      `SELECT ci.item_id, ci.image_key, ci.item_name, ci.category, ci.price_point, ui.is_equipped
         FROM User_inventory ui
         JOIN Customization_items ci ON ci.item_id = ui.Customization_items_item_id
        WHERE ui.Users_user_number = ? AND ci.is_active = TRUE`,
      [userNumber],
    );

    res.json({
      success: true,
      data: {
        ...baseCharacter,
        owned_image_keys: inventoryRows.map((r) => r.image_key),
        equipped_image_keys: inventoryRows.filter((r) => Boolean(r.is_equipped)).map((r) => r.image_key),
        inventory: inventoryRows,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/customize', auth, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userNumber = req.user.user_number;
    const rawItemKey = req.body?.item_key ?? req.body?.image_key ?? req.body?.itemId;
    const rawItemId = req.body?.item_id;
    const hasItemId = rawItemId !== undefined && rawItemId !== null && String(rawItemId).trim() !== '';

    if (!rawItemKey && !hasItemId) {
      throw new ApiError(400, 'VALIDATION_ERROR', '구매할 아이템 정보가 필요합니다.');
    }

    await connection.beginTransaction();

    const [users] = await connection.query(
      'SELECT user_number FROM Users WHERE user_number = ? FOR UPDATE',
      [userNumber],
    );
    if (!users.length) {
      throw new ApiError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
    }

    const [items] = hasItemId
      ? await connection.query(
          `SELECT item_id, item_name, category, price_point, image_key, is_active
             FROM Customization_items
            WHERE item_id = ? LIMIT 1`,
          [Number(rawItemId)],
        )
      : await connection.query(
          `SELECT item_id, item_name, category, price_point, image_key, is_active
             FROM Customization_items
            WHERE image_key = ? LIMIT 1`,
          [String(rawItemKey)],
        );

    const item = items[0];
    if (!item || !item.is_active) {
      throw new ApiError(404, 'ITEM_NOT_FOUND', '구매 가능한 아이템을 찾을 수 없습니다.');
    }

    const [existingInv] = await connection.query(
      `SELECT Customization_items_item_id
         FROM User_inventory
        WHERE Users_user_number = ? AND Customization_items_item_id = ?
        FOR UPDATE`,
      [userNumber, item.item_id],
    );
    if (existingInv.length > 0) {
      throw new ApiError(409, 'ALREADY_OWNED', '이미 보유 중인 아이템입니다.');
    }

    const [balRows] = await connection.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM Point_transactions
        WHERE Users_user_number = ?`,
      [userNumber],
    );
    const currentBalance = Number(balRows[0]?.balance ?? 0);
    const price = Number(item.price_point ?? 0);

    if (currentBalance < price) {
      throw new ApiError(400, 'INSUFFICIENT_POINTS', '보유 FitPoint가 부족합니다.', {
        balance: currentBalance,
        price,
        shortage: price - currentBalance,
      });
    }

    await connection.query(
      `INSERT INTO User_inventory (Customization_items_item_id, Users_user_number, is_equipped)
       VALUES (?, ?, FALSE)`,
      [item.item_id, userNumber],
    );

    await connection.query(
      `INSERT INTO Point_transactions
         (Users_user_number, source, ref_id, base_point, multiplier, amount)
       VALUES (?, 'shop_purchase', ?, ?, 1.00, ?)`,
      [userNumber, item.item_id, price, -price],
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      data: {
        item_id: item.item_id,
        image_key: item.image_key,
        item_name: item.item_name,
        spent_point: price,
        balance: currentBalance - price,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    next(error);
  } finally {
    connection.release();
  }
});

router.post('/equip', auth, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userNumber = req.user.user_number;
    const imageKey = req.body?.image_key ?? null;
    const slotKeys = Array.isArray(req.body?.slot_keys) ? req.body.slot_keys.map(String) : [];

    await connection.beginTransaction();

    if (slotKeys.length > 0) {
      const placeholders = slotKeys.map(() => '?').join(',');
      await connection.query(
        `UPDATE User_inventory ui
           JOIN Customization_items ci ON ci.item_id = ui.Customization_items_item_id
          SET ui.is_equipped = FALSE
          WHERE ui.Users_user_number = ? AND ci.image_key IN (${placeholders})`,
        [userNumber, ...slotKeys],
      );
    }

    if (imageKey) {
      const [rows] = await connection.query(
        `SELECT ci.item_id
           FROM User_inventory ui
           JOIN Customization_items ci ON ci.item_id = ui.Customization_items_item_id
          WHERE ui.Users_user_number = ? AND ci.image_key = ? LIMIT 1`,
        [userNumber, String(imageKey)],
      );
      if (!rows.length) {
        throw new ApiError(400, 'NOT_OWNED', '보유하지 않은 아이템은 장착할 수 없습니다.');
      }
      await connection.query(
        `UPDATE User_inventory
            SET is_equipped = TRUE
          WHERE Users_user_number = ? AND Customization_items_item_id = ?`,
        [userNumber, rows[0].item_id],
      );
    }

    await connection.commit();
    res.json({ success: true, data: { image_key: imageKey } });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
