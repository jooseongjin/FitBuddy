const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const recommendModule = require('../services/recommend'); // 객체든 함수든 안전하게 받기 위해 모듈 통째로 임포트
const missionController = require('../controllers/missionController');
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
                // recommend.js가 내보내는 방식(단일 함수 vs 객체 내부 메서드)에 맞게 유연하게 실행
                if (typeof recommendModule === 'function') {
                    await recommendModule(userNumber);
                } else if (recommendModule && typeof recommendModule.generateAndAssignMissions === 'function') {
                    await recommendModule.generateAndAssignMissions(userNumber);
                } else if (recommendModule && typeof recommendModule.recommendMissions === 'function') {
                    await recommendModule.recommendMissions(userNumber);
                } else {
                    console.error('recommend.js에서 유효한 함수를 찾지 못했습니다.');
                }
            } catch (err) {
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

// 3. POST /api/v1/missions/today/:missionId/complete - 미션 완료 처리 라우트 추가
if (missionController && typeof missionController.completeMission === 'function') {
    router.post('/today/:missionId/complete', auth, missionController.completeMission);
} else {
    router.post('/today/:missionId/complete', auth, async (req, res, next) => {
        const conn = await pool.getConnection();
        try {
            const userNumber = req.user.userNumber;
            const { missionId } = req.params;

            await conn.query(
                `UPDATE User_missions 
                 SET mission_status = 'completed', completed_at = NOW() 
                 WHERE Users_user_number = ? AND Missions_id = ? AND assigned_date = CURDATE()`,
                [userNumber, missionId]
            );

            res.status(200).json({ success: true, message: '미션이 성공적으로 완료되었습니다.' });
        } catch (e) {
            next(e);
        } finally {
            conn.release();
        }
    });
}

module.exports = router;
