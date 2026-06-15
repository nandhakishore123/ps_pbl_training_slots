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

        connection.release();
        return true;
    } catch (error) {
        console.error(chalk.red('✗ Database connection failed:'));
        console.error(chalk.red(`  ${error.message}`));
        return false;
    }
};


export default db;
