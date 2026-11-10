// DB 스키마 마이그레이션 실행기
//   npm run migrate        : 이미 fitbuddy DB가 있으면 중단 (데이터 보호)
//   npm run migrate:reset  : 기존 fitbuddy DB를 삭제하고 db/*.sql 을 번호 순서대로 재생성
//   npm run migrate -- --from 005 : 기존 DB를 유지한 채 005 이상 번호의 파일만 적용 (배포 DB 업데이트용)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const reset = process.argv.includes('--reset');
  const fromIdx = process.argv.indexOf('--from');
  const from = fromIdx > -1 ? Number(process.argv[fromIdx + 1]) : null;
  if (from !== null && (!Number.isInteger(from) || from < 2 || reset)) {
    // 001(스키마)은 DB를 지우므로 --from 으로 실행할 수 없음
    console.error('[migrate] --from 은 002 이상의 번호와 함께, --reset 없이 사용하세요. 예: npm run migrate -- --from 005');
    process.exit(1);
  }
  const dbName = process.env.DB_NAME || 'fitbuddy';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const [rows] = await conn.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [dbName]);
  if (from !== null && !rows.length) {
    console.error(`[migrate] '${dbName}' DB가 없습니다. 처음 만들 때는 npm run migrate`);
    process.exit(1);
  }
  if (rows.length && !reset && from === null) {
    console.error(`[migrate] '${dbName}' DB가 이미 있습니다. 삭제 후 재생성하려면 npm run migrate:reset, 새 파일만 적용하려면 npm run migrate -- --from <번호>`);
    process.exit(1);
  }

  const dir = path.join(__dirname, '..', 'db');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.*\.sql$/.test(f))
    .filter((f) => from === null || parseInt(f, 10) >= from).sort();
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
