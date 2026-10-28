const db = require('../db/database'); // 또는 사용 중인 DB 연결 모듈

// 1. 미션 목록 조회 또는 미션 관련 컨트롤러 예시
const getMissions = async (req, res) => {
    try {
        // 스키마의 Missions 테이블 및 Missions_id 컬럼 반영
        const query = `SELECT Missions_id, title, description, exercise_type, environment, target_value, target_unit, difficulty, base_point FROM Missions WHERE is_active = TRUE`;
        const [rows] = await db.query(query);
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Get missions error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. 미션 완료 처리 (complete) 컨트롤러
const completeMission = async (req, res) => {
    try {
        const { userNumber, missionId, assignedDate } = req.body;

        // 스키마에 정의된 정확한 컬럼명 사용: Users_user_number, Missions_id
        const query = `
            UPDATE User_missions 
            SET mission_status = 'completed', completed_at = NOW() 
            WHERE Users_user_number = ? AND Missions_id = ? AND assigned_date = ?
        `;
        
        const [result] = await db.query(query, [userNumber, missionId, assignedDate]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: '해당하는 사용자 미션 정보를 찾을 수 없습니다.' });
        }

        return res.status(200).json({ success: true, message: '미션이 성공적으로 완료되었습니다.' });
    } catch (error) {
        console.error('Mission complete error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getMissions,
    completeMission
};
