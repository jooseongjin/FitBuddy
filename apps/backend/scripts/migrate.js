// DB 스키마 마이그레이션 실행기
//   npm run migrate        : 이미 fitbuddy DB가 있으면 중단 (데이터 보호)
//   npm run migrate:reset  : 기존 fitbuddy DB를 삭제하고 db/*.sql 을 번호 순서대로 재생성
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const reset = process.argv.includes('--reset');
  const dbName = process.env.DB_NAME || 'fitbuddy';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const [rows] = await conn.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [dbName]);
  if (rows.length && !reset) {
    console.error(`[migrate] '${dbName}' DB가 이미 있습니다. 삭제 후 재생성하려면 npm run migrate:reset`);
    process.exit(1);
  }

  const dir = path.join(__dirname, '..', 'db');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/DELIMITER/i.test(sql)) {
      // 프로시저 파일: DELIMITER $$ 구문은 클라이언트 명령이므로 제거 후 본문만 실행
      sql = sql.replace(/DELIMITER\s+\S+/gi, '').replace(/\$\$/g, '');
      const m = sql.match(/DROP PROCEDURE[^;]*;/i);
      const create = sql.slice(sql.search(/CREATE\s+PROCEDURE/i)).trim();
      await conn.query('USE ' + dbName);
      if (m) await conn.query(m[0]);
      await conn.query(create.replace(/END\s*;?\s*$/i, 'END'));
    } else {
      await conn.query(sql);
    }
    console.log(`[migrate] applied ${f}`);
  }
  await conn.end();
  console.log('[migrate] done');
})().catch((e) => { console.error(e); process.exit(1); });
