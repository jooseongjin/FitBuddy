const db = require('./db');

// 미션 목록 조회
const getMissions = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT Missions_id, title, description, exercise_type, environment, target_value, target_unit, difficulty, base_point FROM Missions WHERE is_active = TRUE`
        );
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

// 미션 완료 처리 (complete)
const completeMission = async (req, res, next) => {
    try {
        const { userNumber, missionId, assignedDate } = req.body;

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
    getMissions,
    completeMission
};
