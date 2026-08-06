import dotenv from 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TiDB SSL Configuration
const sslConfig = process.env.DB_SSL_CA_PATH ? {
    ssl: {
        ca: fs.readFileSync(path.resolve(__dirname, '../../', process.env.DB_SSL_CA_PATH)),
        rejectUnauthorized: true
    }
} : {};

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    ...sslConfig
});

// Test database connection
export const testConnection = async () => {
    try {
        const connection = await db.getConnection();
        console.log(chalk.green('✓ TiDB Database connected successfully!'));
        console.log(chalk.blue(`  Host: ${process.env.DB_HOST}`));
        console.log(chalk.blue(`  Database: ${process.env.DB_NAME}`));
        
        // Auto-run schema migration check for end_survey
        try {
            console.log(chalk.yellow('  Checking end_survey columns for missing booking_id...'));
            const [columns] = await connection.execute("DESCRIBE end_survey");
            const hasBookingId = columns.some(col => col.Field === 'booking_id');
            if (!hasBookingId) {
                console.log(chalk.yellow('  booking_id is missing! Performing ALTER TABLE on end_survey...'));
                await connection.execute("ALTER TABLE end_survey ADD COLUMN booking_id bigint DEFAULT NULL");
                console.log(chalk.green('  Added column booking_id successfully.'));
                
                try {
                    await connection.execute("ALTER TABLE end_survey ADD KEY idx_es_booking (booking_id)");
                    console.log(chalk.green('  Added index idx_es_booking.'));
                } catch (e) {
                    console.log(chalk.yellow('  Index idx_es_booking already exists.'));
                }

                try {
                    await connection.execute("ALTER TABLE end_survey ADD CONSTRAINT fk_es_booking FOREIGN KEY (booking_id) REFERENCES student_booking (booking_id)");
                    console.log(chalk.green('  Added foreign key fk_es_booking.'));
                } catch (e) {
                    console.log(chalk.yellow('  Foreign key fk_es_booking already exists.'));
                }
            } else {
                console.log(chalk.green('  ✓ end_survey schema is up-to-date.'));
            }
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration check failed:'), migErr.message);
        }

        try {
            console.log(chalk.yellow('  Checking venue_mapping_transfer_log table...'));
            const createTableSql = `
                CREATE TABLE IF NOT EXISTS venue_mapping_transfer_log (
                  transfer_id bigint NOT NULL AUTO_INCREMENT,
                  from_faculty_id bigint NOT NULL,
                  to_faculty_id bigint NOT NULL,
                  reason text,
                  venue_id bigint NOT NULL,
                  slot_id bigint NOT NULL,
                  current_status enum('PENDING','REJECTED','ACCEPTED') COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING',
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (transfer_id),
                  KEY idx_vmt_from (from_faculty_id),
                  KEY idx_vmt_to (to_faculty_id),
                  KEY idx_vmt_venue (venue_id),
                  CONSTRAINT fk_vmt_from FOREIGN KEY (from_faculty_id) REFERENCES faculties (faculty_id),
                  CONSTRAINT fk_vmt_to FOREIGN KEY (to_faculty_id) REFERENCES faculties (faculty_id),
                  CONSTRAINT fk_vmt_venue FOREIGN KEY (venue_id) REFERENCES venues (venue_id),
                  CONSTRAINT fk_vmt_slot FOREIGN KEY (slot_id) REFERENCES slot_timings (slot_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `;
            await connection.execute(createTableSql);
            console.log(chalk.green('  ✓ venue_mapping_transfer_log schema is ready.'));

            // Check if slot_id column exists
            const [columns] = await connection.execute("DESCRIBE venue_mapping_transfer_log");
            const hasSlotId = columns.some(col => col.Field === 'slot_id');
            if (!hasSlotId) {
                console.log(chalk.yellow('  slot_id is missing from venue_mapping_transfer_log! Adding it...'));
                await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD COLUMN slot_id bigint NOT NULL");
                console.log(chalk.green('  Added column slot_id.'));

                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD KEY idx_vmt_slot (slot_id)");
                    console.log(chalk.green('  Added index idx_vmt_slot.'));
                } catch (e) {
                    console.log(chalk.yellow('  Index idx_vmt_slot already exists.'));
                }

                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD CONSTRAINT fk_vmt_slot FOREIGN KEY (slot_id) REFERENCES slot_timings (slot_id)");
                    console.log(chalk.green('  Added foreign key constraint fk_vmt_slot.'));
                } catch (e) {
                    console.log(chalk.yellow('  Foreign key constraint fk_vmt_slot already exists.'));
                }
            }

            // Check if transfer_date column exists
            const hasTransferDate = columns.some(col => col.Field === 'transfer_date');
            if (!hasTransferDate) {
                console.log(chalk.yellow('  transfer_date is missing from venue_mapping_transfer_log! Adding it...'));
                await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD COLUMN transfer_date DATE DEFAULT NULL");
                console.log(chalk.green('  Added column transfer_date.'));
            }

            // Check if target_venue_id column exists
            const hasTargetVenueId = columns.some(col => col.Field === 'target_venue_id');
            if (!hasTargetVenueId) {
                console.log(chalk.yellow('  target_venue_id is missing from venue_mapping_transfer_log! Adding it...'));
                await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD COLUMN target_venue_id bigint DEFAULT NULL");
                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD KEY idx_vmt_target_venue (target_venue_id)");
                } catch (e) {}
                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD CONSTRAINT fk_vmt_target_venue FOREIGN KEY (target_venue_id) REFERENCES venues (venue_id)");
                } catch (e) {}
                console.log(chalk.green('  Added column target_venue_id.'));
            }

            // Check if target_slot_id column exists
            const hasTargetSlotId = columns.some(col => col.Field === 'target_slot_id');
            if (!hasTargetSlotId) {
                console.log(chalk.yellow('  target_slot_id is missing from venue_mapping_transfer_log! Adding it...'));
                await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD COLUMN target_slot_id bigint DEFAULT NULL");
                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD KEY idx_vmt_target_slot (target_slot_id)");
                } catch (e) {}
                try {
                    await connection.execute("ALTER TABLE venue_mapping_transfer_log ADD CONSTRAINT fk_vmt_target_slot FOREIGN KEY (target_slot_id) REFERENCES slot_timings (slot_id)");
                } catch (e) {}
                console.log(chalk.green('  Added column target_slot_id.'));
            }

            // Make to_faculty_id nullable
            const toFacultyCol = columns.find(col => col.Field === 'to_faculty_id');
            if (toFacultyCol && toFacultyCol.Null === 'NO') {
                console.log(chalk.yellow('  Making to_faculty_id nullable in venue_mapping_transfer_log...'));
                await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
                await connection.execute("ALTER TABLE venue_mapping_transfer_log MODIFY COLUMN to_faculty_id bigint DEFAULT NULL");
                await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
                console.log(chalk.green('  Made to_faculty_id nullable.'));
            }
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for venue_mapping_transfer_log failed:'), migErr.message);
        }

        // ── Activity-Points confirmation flag (decoupled, additive) ──
        // Per-booking confirmation that a student's result is confirmed for the
        // Activity-Points export handoff. NO points are awarded — this is just a
        // flag. Fully decoupled from the seat/booking engine (no FK, the engine
        // never reads/writes it). Single-table writes keyed by booking_id.
        try {
            console.log(chalk.yellow('  Checking activity_point_confirmations table...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS activity_point_confirmations (
                  booking_id bigint NOT NULL,
                  status enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING',
                  confirmed_by bigint DEFAULT NULL,
                  confirmed_at timestamp NULL DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (booking_id),
                  KEY idx_apc_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ activity_point_confirmations schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for activity_point_confirmations failed:'), migErr.message);
        }

        // ── Admin → Student announcements (additive, decoupled) ──
        // Admin-authored broadcast messages targeted by department (course)
        // and/or year. TiDB-safe: no FKs, equality-keyed. announcement_reads
        // tracks per-student popup (seen_at) + bell read (read_at).
        try {
            console.log(chalk.yellow('  Checking announcements tables...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS announcements (
                  announcement_id bigint NOT NULL AUTO_INCREMENT,
                  title varchar(255) NOT NULL,
                  body text NOT NULL,
                  target_course varchar(50) DEFAULT NULL,
                  target_year int DEFAULT NULL,
                  is_active tinyint(1) NOT NULL DEFAULT 1,
                  created_by bigint NOT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (announcement_id),
                  KEY idx_ann_active (is_active),
                  KEY idx_ann_target (target_course, target_year)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS announcement_reads (
                  announcement_id bigint NOT NULL,
                  student_id bigint NOT NULL,
                  seen_at timestamp NULL DEFAULT NULL,
                  read_at timestamp NULL DEFAULT NULL,
                  PRIMARY KEY (announcement_id, student_id),
                  KEY idx_anr_student (student_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ announcements schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for announcements failed:'), migErr.message);
        }

        // ── Student feedback (additive, decoupled) ──
        // Free-text feedback from students; admin views with credentials and a
        // verified flag. TiDB-safe: no FKs, equality-keyed by student_id.
        try {
            console.log(chalk.yellow('  Checking feedback table...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS feedback (
                  feedback_id bigint NOT NULL AUTO_INCREMENT,
                  student_id bigint NOT NULL,
                  message text NOT NULL,
                  is_verified tinyint(1) NOT NULL DEFAULT 0,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (feedback_id),
                  KEY idx_fb_student (student_id),
                  KEY idx_fb_verified (is_verified)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ feedback schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for feedback failed:'), migErr.message);
        }

        // ── Surveys (additive, decoupled) ──
        // Admin-authored surveys with single/multi-choice questions, targeted by
        // department (course) and/or year (reuses announcement targeting). Students
        // submit one response per survey. TiDB-safe: no FKs, equality-keyed.
        try {
            console.log(chalk.yellow('  Checking survey tables...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS surveys (
                  survey_id bigint NOT NULL AUTO_INCREMENT,
                  title varchar(255) NOT NULL,
                  description text DEFAULT NULL,
                  target_course varchar(50) DEFAULT NULL,
                  target_year int DEFAULT NULL,
                  status varchar(20) NOT NULL DEFAULT 'active',
                  created_by bigint NOT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (survey_id),
                  KEY idx_survey_status (status),
                  KEY idx_survey_target (target_course, target_year)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS survey_questions (
                  question_id bigint NOT NULL AUTO_INCREMENT,
                  survey_id bigint NOT NULL,
                  question_text text NOT NULL,
                  question_type varchar(10) NOT NULL DEFAULT 'single',
                  display_order int NOT NULL DEFAULT 0,
                  PRIMARY KEY (question_id),
                  KEY idx_sq_survey (survey_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS survey_options (
                  option_id bigint NOT NULL AUTO_INCREMENT,
                  question_id bigint NOT NULL,
                  option_text varchar(500) NOT NULL,
                  display_order int NOT NULL DEFAULT 0,
                  PRIMARY KEY (option_id),
                  KEY idx_so_question (question_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS survey_responses (
                  response_id bigint NOT NULL AUTO_INCREMENT,
                  survey_id bigint NOT NULL,
                  student_id bigint NOT NULL,
                  submitted_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (response_id),
                  UNIQUE KEY uq_sr (survey_id, student_id),
                  KEY idx_sr_survey (survey_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS survey_answers (
                  answer_id bigint NOT NULL AUTO_INCREMENT,
                  response_id bigint NOT NULL,
                  question_id bigint NOT NULL,
                  option_id bigint NOT NULL,
                  PRIMARY KEY (answer_id),
                  KEY idx_sa_response (response_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ survey schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for survey failed:'), migErr.message);
        }

        // Inventory Request system: catalog/stock + buying/return requests (multi-item),
        // approvals (faculty for BUY by purpose, incharge for RETURN), and a stock-change
        // audit log. TiDB-safe: no FKs, equality-keyed, VARCHAR statuses.
        try {
            console.log(chalk.yellow('  Checking inventory tables...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_items (
                  item_id bigint NOT NULL AUTO_INCREMENT,
                  category varchar(60) NOT NULL,
                  subcategory varchar(80) DEFAULT NULL,
                  item_name varchar(255) NOT NULL,
                  sub_name varchar(255) DEFAULT NULL,
                  unit varchar(30) DEFAULT NULL,
                  current_quantity decimal(12,2) NOT NULL DEFAULT 0,
                  rack_location varchar(120) DEFAULT NULL,
                  is_returnable tinyint(1) NOT NULL DEFAULT 0,
                  is_active tinyint(1) NOT NULL DEFAULT 1,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (item_id),
                  KEY idx_inv_items_category (category),
                  KEY idx_inv_items_name (item_name)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_requests (
                  request_id bigint NOT NULL AUTO_INCREMENT,
                  student_id bigint NOT NULL,
                  request_type varchar(10) NOT NULL,
                  purpose_type varchar(15) DEFAULT NULL,
                  purpose text DEFAULT NULL,
                  status varchar(15) NOT NULL DEFAULT 'PENDING',
                  approver_user_id bigint DEFAULT NULL,
                  approver_role tinyint DEFAULT NULL,
                  decided_at timestamp NULL DEFAULT NULL,
                  remarks varchar(255) DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (request_id),
                  KEY idx_inv_req_student (student_id),
                  KEY idx_inv_req_type_status (request_type, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_request_items (
                  line_id bigint NOT NULL AUTO_INCREMENT,
                  request_id bigint NOT NULL,
                  item_id bigint NOT NULL,
                  item_name varchar(255) DEFAULT NULL,
                  quantity decimal(12,2) NOT NULL,
                  unit varchar(30) DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (line_id),
                  KEY idx_inv_reqitems_request (request_id),
                  KEY idx_inv_reqitems_item (item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_stock_txns (
                  txn_id bigint NOT NULL AUTO_INCREMENT,
                  item_id bigint NOT NULL,
                  change_qty decimal(12,2) NOT NULL,
                  reason varchar(40) DEFAULT NULL,
                  request_id bigint DEFAULT NULL,
                  actor_user_id bigint DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (txn_id),
                  KEY idx_inv_txn_item (item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            // Stage 5: per-item obligations. One row per taken (BUY-approved) line item,
            // snapshotting category/returnable/taken-qty. Lifecycle OPEN → RETURN_PENDING → CLEARED.
            // The student is blocked from a new BUY while any obligation is not CLEARED.
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_obligations (
                  obligation_id bigint NOT NULL AUTO_INCREMENT,
                  student_id bigint NOT NULL,
                  buy_request_id bigint NOT NULL,
                  buy_line_id bigint NOT NULL,
                  item_id bigint NOT NULL,
                  item_name varchar(255) DEFAULT NULL,
                  category varchar(60) DEFAULT NULL,
                  unit varchar(30) DEFAULT NULL,
                  taken_quantity decimal(12,2) NOT NULL,
                  is_returnable tinyint(1) NOT NULL DEFAULT 0,
                  status varchar(20) NOT NULL DEFAULT 'OPEN',
                  return_request_id bigint DEFAULT NULL,
                  returned_quantity decimal(12,2) DEFAULT NULL,
                  cleared_at timestamp NULL DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (obligation_id),
                  KEY idx_inv_obl_student (student_id, status),
                  KEY idx_inv_obl_buyreq (buy_request_id),
                  KEY idx_inv_obl_return (return_request_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            // Additive columns on inventory_request_items so RETURN request lines can carry
            // their obligation link + action (RETURN vs FULLY_COMPLETED). BUY lines leave these NULL.
            const [iriCols] = await connection.execute('DESCRIBE inventory_request_items');
            const iriHas = (f) => iriCols.some((c) => c.Field === f);
            if (!iriHas('obligation_id')) {
                await connection.execute('ALTER TABLE inventory_request_items ADD COLUMN obligation_id bigint DEFAULT NULL');
                console.log(chalk.green('  Added inventory_request_items.obligation_id.'));
            }
            if (!iriHas('action')) {
                await connection.execute("ALTER TABLE inventory_request_items ADD COLUMN action varchar(20) DEFAULT NULL");
                console.log(chalk.green('  Added inventory_request_items.action.'));
            }
            if (!iriHas('return_quantity')) {
                await connection.execute('ALTER TABLE inventory_request_items ADD COLUMN return_quantity decimal(12,2) DEFAULT NULL');
                console.log(chalk.green('  Added inventory_request_items.return_quantity.'));
            }
            // Additive: the lab a student's BUY request is for. NULLABLE by design —
            // requests created before this column existed keep NULL, and RETURN
            // requests never set it. Required-ness is enforced in the service for
            // NEW buying requests only. FK by convention (TiDB-safe: no FKs), so
            // every read LEFT JOINs labs and tolerates a NULL/dangling lab_id.
            const [invReqCols] = await connection.execute('DESCRIBE inventory_requests');
            if (!invReqCols.some((c) => c.Field === 'lab_id')) {
                await connection.execute('ALTER TABLE inventory_requests ADD COLUMN lab_id bigint DEFAULT NULL');
                console.log(chalk.green('  Added inventory_requests.lab_id.'));
            }
            const [invReqIdx] = await connection.execute("SHOW INDEX FROM inventory_requests WHERE Key_name = 'idx_invreq_lab'");
            if (!invReqIdx.length) {
                await connection.execute('ALTER TABLE inventory_requests ADD INDEX idx_invreq_lab (lab_id)');
                console.log(chalk.green('  Added inventory_requests.idx_invreq_lab.'));
            }
            // Admin-configurable inventory settings (key/value). Currently holds the two
            // buying approver user_ids ('project_approver_user_id', 'training_approver_user_id').
            // TiDB-safe: no FKs, PK on setting_key so writes use ON DUPLICATE KEY UPDATE.
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS inventory_settings (
                  setting_key varchar(60) NOT NULL,
                  setting_value varchar(255) DEFAULT NULL,
                  updated_by bigint DEFAULT NULL,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (setting_key)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ inventory schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for inventory failed:'), migErr.message);
        }

        // ═══════════════════════════════════════════════════════════════════
        // ROLE WHITELIST + INTERN LAB FEATURE — REMOVABLE BLOCK (start)
        // Adds: role 5 'INTERN' (Intern / Lab Technician), an email→role_id
        // whitelist ("whitelist always wins" at login), a `labs` master table,
        // a `lab_purchases` log for intern direct-buy, and a `lab_returns` log
        // for intern direct-return (stock added back against a past purchase).
        // Order is strict: fk_users_role is enforced live, so the enum must be
        // widened BEFORE role 5 is seeded, and role 5 must exist BEFORE any
        // user row may reference it.
        // TiDB-safe: no FKs on the new tables (role validation is
        // application-level), equality-keyed, explicit KEY lines.
        // To remove the feature: delete this whole block, then manually
        // DROP TABLE role_whitelist, labs, lab_purchases, lab_returns and DELETE the role 5
        // row (the enum widening is harmless to leave in place).
        // ═══════════════════════════════════════════════════════════════════
        try {
            console.log(chalk.yellow('  Checking role whitelist / lab tables...'));

            // ── STEP A — widen role_entities.role_name to include 'INTERN' ──
            // Read the live ENUM, preserve EVERY member currently present, and
            // only ADD 'INTERN'. Idempotent: no-op once 'INTERN' is a member.
            const [roleNameCols] = await connection.execute("SHOW COLUMNS FROM role_entities LIKE 'role_name'");
            const roleNameType = String(roleNameCols?.[0]?.Type ?? '');
            const enumMembers = roleNameType.match(/'(?:[^']|'')*'/g) ?? [];

            if (!roleNameType.toLowerCase().startsWith('enum(')) {
                // Someone converted the column away from an ENUM — nothing to
                // widen, and blindly ALTERing would be destructive. Warn only.
                console.log(chalk.yellow(`  role_entities.role_name is not an ENUM (${roleNameType || 'unknown'}); skipping widen.`));
            } else if (enumMembers.includes("'INTERN'")) {
                console.log(chalk.green("  ✓ role_entities.role_name already allows 'INTERN'."));
            } else {
                const widened = [...enumMembers, "'INTERN'"].join(',');
                await connection.execute(`ALTER TABLE role_entities MODIFY role_name enum(${widened}) NOT NULL`);
                console.log(chalk.green(`  Widened role_entities.role_name to enum(${widened}).`));
            }

            // ── STEP B — seed role 5 'INTERN' (only after the widen) ────────
            // PK on role_id → ON DUPLICATE KEY UPDATE makes this idempotent.
            // created_at is NOT NULL but DEFAULT CURRENT_TIMESTAMP, so it is
            // omitted; warn if any other column would reject the insert.
            const [roleCols] = await connection.execute('DESCRIBE role_entities');
            const missingRequired = roleCols.filter((c) => (
                c.Null === 'NO'
                && c.Default === null
                && !String(c.Extra || '').includes('auto_increment')
                && !['role_id', 'role_name'].includes(c.Field)
            ));
            if (missingRequired.length) {
                console.log(chalk.yellow(`  role_entities has extra required column(s): ${missingRequired.map((c) => c.Field).join(', ')} — role 5 seed may fail.`));
            }
            await connection.execute(
                `INSERT INTO role_entities (role_id, role_name) VALUES (5, 'INTERN')
                 ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`
            );
            console.log(chalk.green("  ✓ role 5 'INTERN' seeded in role_entities."));

            // ── STEP C — new tables ─────────────────────────────────────────
            // Email → role_id whitelist. PK on email mirrors the live UNIQUE
            // KEY on users.email (varchar(255)); role_id matches users.role_id
            // (tinyint). No FK on role_id by design.
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS role_whitelist (
                  email varchar(255) NOT NULL,
                  role_id tinyint NOT NULL,
                  added_by bigint DEFAULT NULL,
                  is_active tinyint(1) NOT NULL DEFAULT 1,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ role_whitelist table ready.'));

            // Labs master table.
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS labs (
                  lab_id bigint NOT NULL AUTO_INCREMENT,
                  lab_name varchar(150) NOT NULL,
                  lab_code varchar(40) DEFAULT NULL,
                  in_charge varchar(150) DEFAULT NULL,
                  room_no varchar(40) DEFAULT NULL,
                  is_active tinyint(1) NOT NULL DEFAULT 1,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (lab_id),
                  KEY idx_labs_active (is_active)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ labs table ready.'));

            // Intern direct-buy log. One row per purchased line item; stock is
            // decremented on the shared inventory_items pool (no approval step).
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS lab_purchases (
                  purchase_id bigint NOT NULL AUTO_INCREMENT,
                  lab_id bigint NOT NULL,
                  item_id bigint NOT NULL,
                  item_name varchar(255) DEFAULT NULL,
                  quantity decimal(12,2) NOT NULL,
                  unit varchar(30) DEFAULT NULL,
                  buyer_user_id bigint DEFAULT NULL,
                  buyer_name varchar(150) DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (purchase_id),
                  KEY idx_labpur_lab (lab_id),
                  KEY idx_labpur_item (item_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ lab_purchases table ready.'));

            // Additive: lab photo. A plain URL string, exactly like
            // training_skills.image_url — pasted by an admin, resolved at render
            // time. varchar(512) rather than 255 because signed CDN links
            // routinely exceed 255 and would silently truncate.
            const [labCols] = await connection.execute('DESCRIBE labs');
            if (!labCols.some((c) => c.Field === 'image_url')) {
                await connection.execute('ALTER TABLE labs ADD COLUMN image_url varchar(512) DEFAULT NULL');
                console.log(chalk.green('  Added labs.image_url.'));
            }

            // ── INTERN LAB RETURNS — REMOVABLE SUB-BLOCK (start) ────────────
            // Intern direct-return log. One row per return event, always against
            // ONE lab_purchases row, so a purchase can be returned in several
            // instalments and each is auditable on its own. lab_id / item_name /
            // unit are snapshots copied from the purchase — the same denormalised
            // style as lab_purchases, so history survives a catalog rename.
            // purchase_id is an FK by convention only (TiDB-safe: no FKs); the
            // "cannot return more than purchased" cap is enforced in the model's
            // transaction (SUM over this table vs the locked purchase row), NOT
            // by a constraint.
            // To remove: DROP TABLE lab_returns and revert the lab_returns
            // additions in inventory.model.js (incl. the consumption-report net).
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS lab_returns (
                  return_id bigint NOT NULL AUTO_INCREMENT,
                  purchase_id bigint NOT NULL,
                  lab_id bigint NOT NULL,
                  item_id bigint NOT NULL,
                  item_name varchar(255) DEFAULT NULL,
                  quantity decimal(12,2) NOT NULL,
                  unit varchar(30) DEFAULT NULL,
                  returner_user_id bigint DEFAULT NULL,
                  returner_name varchar(150) DEFAULT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (return_id),
                  KEY idx_labret_purchase (purchase_id),
                  KEY idx_labret_item (item_id),
                  KEY idx_labret_returner (returner_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ lab_returns table ready.'));
            // ── INTERN LAB RETURNS — REMOVABLE SUB-BLOCK (end) ──────────────

            console.log(chalk.green('  ✓ role whitelist / lab schema is ready.'));
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for role whitelist / labs failed:'), migErr.message);
        }
        // ═══ ROLE WHITELIST + INTERN LAB FEATURE — REMOVABLE BLOCK (end) ═══

        // ═══════════════════════════════════════════════════════════════════
        // USER MANAGEMENT (non-student roles 2,3,4,5) — REMOVABLE BLOCK (start)
        // Names for non-student users. `users` has no name column, and only
        // students/faculties carry one (in their own profile tables), so roles
        // 3/4/5 had nowhere to store a display name. One row per user_id.
        // TiDB-safe: no FKs; the UNIQUE key makes the write an upsert target.
        // To remove: delete this block and DROP TABLE user_profiles.
        // ═══════════════════════════════════════════════════════════════════
        try {
            console.log(chalk.yellow('  Checking user_profiles table...'));
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS user_profiles (
                  profile_id bigint NOT NULL AUTO_INCREMENT,
                  user_id bigint NOT NULL,
                  name varchar(150) NOT NULL,
                  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
                  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  PRIMARY KEY (profile_id),
                  UNIQUE KEY uq_user_profiles_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
            `);
            console.log(chalk.green('  ✓ user_profiles table ready.'));

            // ── ROLE-5 SUB-TYPE — REMOVABLE SUB-BLOCK (start) ───────────────
            // Role 5 is really three kinds of lab member (faculty / intern /
            // technician) but everything labelled them "INTERN". This column
            // stores which one, purely as a LABEL — it grants no permission and
            // changes no routing or purchasing behaviour. Additive DESCRIBE-then
            // -ALTER, same idiom as labs.image_url above, so re-runs are safe.
            // NULL is left as-is rather than backfilled: reads coalesce NULL to
            // 'INTERN', which is exactly the pre-feature behaviour.
            // varchar, not ENUM: TiDB-friendly, and a 4th kind stays a code change.
            // To remove: ALTER TABLE user_profiles DROP COLUMN member_subtype.
            const [upCols] = await connection.execute('DESCRIBE user_profiles');
            if (!upCols.some((c) => c.Field === 'member_subtype')) {
                await connection.execute(
                    `ALTER TABLE user_profiles ADD COLUMN member_subtype varchar(20) DEFAULT NULL`
                );
                console.log(chalk.green('  Added user_profiles.member_subtype.'));
            }
            // ── ROLE-5 SUB-TYPE — REMOVABLE SUB-BLOCK (end) ─────────────────
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration/Check for user_profiles failed:'), migErr.message);
        }
        // ═══ USER MANAGEMENT — REMOVABLE BLOCK (end) ═══

        connection.release();
        return true;
    } catch (error) {
        console.error(chalk.red('✗ Database connection failed:'));
        console.error(chalk.red(`  ${error.message}`));
        return false;
    }
};


export default db;
