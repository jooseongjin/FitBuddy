const db = require('./db');

// 오늘의 미션 조회 (추천 엔진 연동 대비)
const getTodayMissions = async (req, res, next) => {
    try {
        const userNumber = req.user.user_number;
        
        // 사용자에 맞춘 미션 조회 쿼리 (recommend-engine 브랜치와 연동)
        const [rows] = await db.query(
            `SELECT M.Missions_id, M.title, M.description, M.exercise_type, M.environment, M.target_value, M.target_unit, M.difficulty, M.base_point, UM.mission_status 
             FROM User_missions UM
             JOIN Missions M ON UM.Missions_id = M.Missions_id
             WHERE UM.Users_user_number = ? AND UM.assigned_date = CURDATE()`,
            [userNumber]
        );

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// 미션 완료 처리
const completeMission = async (req, res, next) => {
    try {
        // body 대신 토큰에서 인증된 userNumber 사용
        const userNumber = req.user.user_number;
        const { missionId, assignedDate } = req.body;

        const [result] = await db.query(
            `UPDATE User_missions 
             SET mission_status = 'completed', completed_at = NOW() 
             WHERE Users_user_number = ? AND Missions_id = ? AND assigned_date = ?`,
            [userNumber, missionId, assignedDate]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '해당하는 사용자 미션 정보를 찾을 수 없습니다.' });
        }

        res.status(200).json({ success: true, message: '미션이 성공적으로 완료되었습니다.' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getTodayMissions,
    completeMission
};
