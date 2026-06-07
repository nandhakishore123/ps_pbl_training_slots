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
        } catch (migErr) {
            console.error(chalk.red('  ✗ Migration for venue_mapping_transfer_log failed:'), migErr.message);
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
