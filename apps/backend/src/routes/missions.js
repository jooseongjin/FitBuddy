const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { generateAndAssignMissions } = require('../services/recommend');
const { ApiError } = require('../errors');

const router = express.Router();

// GET /api/v1/missions/today - 오늘의 미션 조회 (없으면 추천 엔진으로 자동 배정)
router.get('/today', auth, async (req, res, next) => {
    const conn = await pool.getConnection();
    try {
        const userNumber = req.user.userNumber;

        // 1. 오늘 배정된 미션 조회
        let [rows] = await conn.query(
            `SELECT M.Missions_id, M.title, M.description, M.exercise_type, M.environment, M.target_value, M.target_unit, M.difficulty, M.base_point, UM.mission_status 
             FROM User_missions UM
             JOIN Missions M ON UM.Missions_id = M.Missions_id
             WHERE UM.Users_user_number = ? AND UM.assigned_date = CURDATE()`,
            [userNumber]
        );

        // 2. 오늘 배정된 미션이 없다면 추천 엔진을 통해 미션 생성/배정 후 재조회
        if (rows.length === 0) {
            try {
                await generateAndAssignMissions(userNumber);
            } catch (err) {
                // 추천 엔진 연동 중 에러 발생 시 로그를 남기거나 넘어갈 수 있음
                console.error('Recommend engine auto-assignment failed:', err);
            }

            [rows] = await conn.query(
                `SELECT M.Missions_id, M.title, M.description, M.exercise_type, M.environment, M.target_value, M.target_unit, M.difficulty, M.base_point, UM.mission_status 
                 FROM User_missions UM
                 JOIN Missions M ON UM.Missions_id = M.Missions_id
                 WHERE UM.Users_user_number = ? AND UM.assigned_date = CURDATE()`,
                [userNumber]
            );
        }

        res.status(200).json({ success: true, data: rows });
    } catch (e) {
        next(e);
    } finally {
        conn.release();
    }
});

module.exports = router;
