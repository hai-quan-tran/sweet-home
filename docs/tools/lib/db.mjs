// Làm việc với DB dev qua mysql/mysqldump: sao lưu - khôi phục baseline, chạy câu lệnh, đọc cấu trúc bảng.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MYSQL_BIN, devDbConfig } from './config.mjs';

const db = devDbConfig();
const bin = (name) => (MYSQL_BIN && existsSync(join(MYSQL_BIN, name + '.exe')) ? join(MYSQL_BIN, name + '.exe') : name);
const connArgs = ['-h', db.host, '-P', db.port, '-u', db.user, '--default-character-set=utf8mb4'];
const env = { ...process.env, MYSQL_PWD: db.password };

/**
 * Chạy câu SQL, trả về kết quả dạng chuỗi (mỗi dòng một bản ghi, cột cách nhau bằng tab, không tiêu đề).
 * @param {string} sql câu lệnh
 * @returns {string}
 */
export function sql(sql) {
  return execFileSync(bin('mysql'), [...connArgs, '--batch', '--raw', '--skip-column-names', db.database, '-e', sql], {
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

/**
 * Sao lưu toàn bộ DB (cấu trúc + dữ liệu) ra file để khôi phục đúng baseline sau khi chụp.
 * @param {string} file đường dẫn file .sql
 */
export function backup(file) {
  const dump = execFileSync(
    bin('mysqldump'),
    [...connArgs, '--no-tablespaces', '--single-transaction', '--skip-comments', db.database],
    { env, maxBuffer: 512 * 1024 * 1024 },
  );
  writeFileSync(file, dump);
}

/**
 * Khôi phục DB từ file sao lưu (xoá bảng rồi tạo lại đúng như lúc sao lưu, kể cả AUTO_INCREMENT).
 * @param {string} file đường dẫn file .sql
 */
export function restore(file) {
  execFileSync(bin('mysql'), [...connArgs, db.database], { env, input: readFileSync(file), maxBuffer: 64 * 1024 * 1024 });
}

/**
 * Đọc cấu trúc các bảng nghiệp vụ (bỏ bảng của Liquibase): cột, kiểu, null, mặc định, khoá, khoá ngoại, index.
 * @returns {{tables: string[], columns: object[], foreignKeys: object[], indexes: object[]}}
 */
export function readSchema() {
  const filter = (a = '') => `${a}table_schema = '${db.database}' AND ${a}table_name NOT LIKE 'databasechangelog%'`;
  const where = filter();
  const json = (q) => JSON.parse(sql(q) || '[]');
  const columns = json(`SELECT JSON_ARRAYAGG(JSON_OBJECT('table', table_name, 'column', column_name, 'pos', ordinal_position,
      'type', column_type, 'nullable', is_nullable = 'YES', 'default', column_default, 'key', column_key, 'extra', extra))
    FROM information_schema.columns WHERE ${where}`);
  const foreignKeys = json(`SELECT JSON_ARRAYAGG(JSON_OBJECT('table', k.table_name, 'column', k.column_name,
      'refTable', k.referenced_table_name, 'refColumn', k.referenced_column_name, 'onDelete', r.delete_rule))
    FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints r
      ON r.constraint_schema = k.table_schema AND r.constraint_name = k.constraint_name
    WHERE ${filter('k.')} AND k.referenced_table_name IS NOT NULL`);
  const indexes = json(`SELECT JSON_ARRAYAGG(JSON_OBJECT('table', table_name, 'name', index_name, 'unique', non_unique = 0,
      'columns', cols)) FROM (SELECT table_name, index_name, non_unique, GROUP_CONCAT(column_name ORDER BY seq_in_index) cols
      FROM information_schema.statistics WHERE ${where} GROUP BY table_name, index_name, non_unique) s`);
  columns.sort((a, b) => a.table.localeCompare(b.table) || a.pos - b.pos);
  return { tables: [...new Set(columns.map((c) => c.table))], columns, foreignKeys, indexes };
}
