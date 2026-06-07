-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: gateway01.ap-southeast-1.prod.aws.tidbcloud.com    Database: ps_pbl_training_slots
-- ------------------------------------------------------
-- Server version	8.0.11-TiDB-v8.5.3-serverless

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `all_groups`
--

DROP TABLE IF EXISTS `all_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `all_groups` (
  `group_id` bigint NOT NULL AUTO_INCREMENT,
  `group_name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `group_type` varchar(100) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `all_groups`
--

LOCK TABLES `all_groups` WRITE;
/*!40000 ALTER TABLE `all_groups` DISABLE KEYS */;
INSERT INTO `all_groups` VALUES (1,'#test_1','C','2026-05-11 01:30:47'),(2,'#test_2','C','2026-05-11 01:30:49');
/*!40000 ALTER TABLE `all_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_coding_questions`
--

DROP TABLE IF EXISTS `assessment_coding_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_coding_questions` (
  `coding_question_id` bigint NOT NULL AUTO_INCREMENT,
  `assessment_id` bigint NOT NULL,
  `problem_title` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `problem_statement` text COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `input_format` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `output_format` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `constraints_text` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `sample_input` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `sample_output` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `starter_code` longtext COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `solution_code` longtext COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `time_limit_sec` int DEFAULT '1',
  `memory_limit_mb` int DEFAULT '128',
  `marks` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`coding_question_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_coding_assessment` (`assessment_id`),
  CONSTRAINT `fk_acq_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`assessment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_coding_questions`
--

LOCK TABLES `assessment_coding_questions` WRITE;
/*!40000 ALTER TABLE `assessment_coding_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_coding_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_mcq_questions`
--

DROP TABLE IF EXISTS `assessment_mcq_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_mcq_questions` (
  `mcq_question_id` bigint NOT NULL AUTO_INCREMENT,
  `assessment_id` bigint NOT NULL,
  `question_text` text COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `option_a` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `option_b` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `option_c` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `option_d` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `correct_option` enum('A','B','C','D') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `mcq_type_id` bigint DEFAULT NULL,
  `difficulty` enum('EASY','MEDIUM','HARD') DEFAULT NULL,
  `marks` int DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`mcq_question_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_mcq_assessment` (`assessment_id`),
  KEY `idx_mcq_type` (`mcq_type_id`),
  CONSTRAINT `fk_amq_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`assessment_id`),
  CONSTRAINT `fk_amq_mcq_type` FOREIGN KEY (`mcq_type_id`) REFERENCES `mcq_types` (`mcq_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_mcq_questions`
--

LOCK TABLES `assessment_mcq_questions` WRITE;
/*!40000 ALTER TABLE `assessment_mcq_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_mcq_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_mcq_type_config`
--

DROP TABLE IF EXISTS `assessment_mcq_type_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_mcq_type_config` (
  `config_id` bigint NOT NULL AUTO_INCREMENT,
  `assessment_id` bigint NOT NULL,
  `mcq_type_id` bigint NOT NULL,
  `question_count` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_assessment_mcq_type` (`assessment_id`,`mcq_type_id`),
  KEY `idx_amtc_assessment` (`assessment_id`),
  KEY `idx_amtc_mcq_type` (`mcq_type_id`),
  CONSTRAINT `fk_amtc_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`assessment_id`),
  CONSTRAINT `fk_amtc_mcq_type` FOREIGN KEY (`mcq_type_id`) REFERENCES `mcq_types` (`mcq_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_mcq_type_config`
--

LOCK TABLES `assessment_mcq_type_config` WRITE;
/*!40000 ALTER TABLE `assessment_mcq_type_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessment_mcq_type_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessments`
--

DROP TABLE IF EXISTS `assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessments` (
  `assessment_id` bigint NOT NULL AUTO_INCREMENT,
  `training_skill_id` bigint NOT NULL,
  `level_id` bigint NOT NULL,
  `assessment_title` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `assessment_type` enum('MCQ','CODING') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `total_marks` int NOT NULL,
  `passing_marks` int NOT NULL,
  `duration_minutes` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessment_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_assessment_skill` (`training_skill_id`),
  KEY `idx_assessment_level` (`level_id`),
  KEY `idx_assessment_type` (`assessment_type`),
  CONSTRAINT `fk_assessment_level` FOREIGN KEY (`level_id`) REFERENCES `skill_levels` (`level_id`),
  CONSTRAINT `fk_assessment_skill` FOREIGN KEY (`training_skill_id`) REFERENCES `training_skills` (`training_skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessments`
--

LOCK TABLES `assessments` WRITE;
/*!40000 ALTER TABLE `assessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `attendance_id` bigint NOT NULL AUTO_INCREMENT,
  `booking_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `attendance_status` enum('PRESENT','ABSENT') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `remarks` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `idx_attendance_student` (`student_id`),
  KEY `idx_attendance_status` (`attendance_status`),
  CONSTRAINT `fk_att_booking` FOREIGN KEY (`booking_id`) REFERENCES `student_booking` (`booking_id`),
  CONSTRAINT `fk_att_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coding_test_cases`
--

DROP TABLE IF EXISTS `coding_test_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coding_test_cases` (
  `test_case_id` bigint NOT NULL AUTO_INCREMENT,
  `coding_question_id` bigint NOT NULL,
  `input_data` longtext COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `expected_output` longtext COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_hidden_test_case` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`test_case_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_testcase_question` (`coding_question_id`),
  CONSTRAINT `fk_ctc_question` FOREIGN KEY (`coding_question_id`) REFERENCES `assessment_coding_questions` (`coding_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coding_test_cases`
--

LOCK TABLES `coding_test_cases` WRITE;
/*!40000 ALTER TABLE `coding_test_cases` DISABLE KEYS */;
/*!40000 ALTER TABLE `coding_test_cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `end_survey`
--

DROP TABLE IF EXISTS `end_survey`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `end_survey` (
  `survey_id` bigint NOT NULL AUTO_INCREMENT,
  `faculty_id` bigint DEFAULT NULL,
  `student_id` bigint NOT NULL,
  `survey_question_id` bigint NOT NULL,
  `student_response` text COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `booking_id` bigint DEFAULT NULL,
  `is_caption_verified` tinyint DEFAULT '0',
  `is_incharge_verified` tinyint DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`survey_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_es_faculty` (`faculty_id`),
  KEY `idx_es_student` (`student_id`),
  KEY `idx_es_question` (`survey_question_id`),
  KEY `idx_es_booking` (`booking_id`),
  CONSTRAINT `fk_es_question` FOREIGN KEY (`survey_question_id`) REFERENCES `end_survey_questions` (`survey_question_id`),
  CONSTRAINT `fk_es_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `end_survey`
--

LOCK TABLES `end_survey` WRITE;
/*!40000 ALTER TABLE `end_survey` DISABLE KEYS */;
/*!40000 ALTER TABLE `end_survey` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `end_survey_questions`
--

DROP TABLE IF EXISTS `end_survey_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `end_survey_questions` (
  `survey_question_id` bigint NOT NULL AUTO_INCREMENT,
  `question` text COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`survey_question_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_question_id` (`survey_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `end_survey_questions`
--

LOCK TABLES `end_survey_questions` WRITE;
/*!40000 ALTER TABLE `end_survey_questions` DISABLE KEYS */;
INSERT INTO `end_survey_questions` (`survey_question_id`, `question`) VALUES
(1,  'What was the main objective of today\'s lab session?'),
(2,  'What tools / equipment / software were used?'),
(3,  'How was the session structured? (Briefly describe the flow)'),
(4,  'What specific task or activity did you personally carry out?'),
(5,  'What tools, equipment, or software did you use personally?'),
(6,  'What was the output or result of your activity?'),
(7,  'What new concept or skill did you learn or practise today?'),
(8,  'What challenges did you face and how did you overcome them?'),
(9,  'What will you do differently in the next session?');
/*!40000 ALTER TABLE `end_survey_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `faculties`
--

DROP TABLE IF EXISTS `faculties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faculties` (
  `faculty_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `reg_num` varchar(20) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `designation` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `department` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`faculty_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `reg_num` (`reg_num`),
  KEY `idx_faculties_user` (`user_id`),
  KEY `idx_faculties_reg` (`reg_num`),
  CONSTRAINT `fk_faculty_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `faculties`
--

LOCK TABLES `faculties` WRITE;
/*!40000 ALTER TABLE `faculties` DISABLE KEYS */;
/*!40000 ALTER TABLE `faculties` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_members`
--

DROP TABLE IF EXISTS `group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_members` (
  `member_id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` bigint NOT NULL,
  `student_id` bigint NOT NULL,
  `group_role_id` bigint NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`member_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `group_id` (`group_id`,`student_id`),
  KEY `idx_group_members_group` (`group_id`),
  KEY `idx_group_members_student` (`student_id`),
  KEY `idx_group_members_role` (`group_role_id`),
  CONSTRAINT `fk_gm_group` FOREIGN KEY (`group_id`) REFERENCES `all_groups` (`group_id`),
  CONSTRAINT `fk_gm_role` FOREIGN KEY (`group_role_id`) REFERENCES `group_roles` (`group_role_id`),
  CONSTRAINT `fk_gm_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_members`
--

LOCK TABLES `group_members` WRITE;
/*!40000 ALTER TABLE `group_members` DISABLE KEYS */;
INSERT INTO `group_members` VALUES (1,1,1,1,'2026-05-11 01:33:51','2026-05-11 01:33:51'),(2,2,2,1,'2026-05-11 01:33:52','2026-05-11 01:33:52');
/*!40000 ALTER TABLE `group_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_roles`
--

DROP TABLE IF EXISTS `group_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_roles` (
  `group_role_id` bigint NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_role_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_roles`
--

LOCK TABLES `group_roles` WRITE;
/*!40000 ALTER TABLE `group_roles` DISABLE KEYS */;
INSERT INTO `group_roles` VALUES (1,'CAPTION','2026-05-11 01:33:32'),(2,'VICE CAPTION','2026-05-11 01:33:34'),(3,'TEAM MANAGER','2026-05-11 01:33:34'),(4,'TEAM STRATEGIST','2026-05-11 01:33:35');
/*!40000 ALTER TABLE `group_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mcq_types`
--

DROP TABLE IF EXISTS `mcq_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mcq_types` (
  `mcq_type_id` bigint NOT NULL AUTO_INCREMENT,
  `mcq_type_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`mcq_type_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mcq_types`
--

LOCK TABLES `mcq_types` WRITE;
/*!40000 ALTER TABLE `mcq_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `mcq_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `point_transactions`
--

DROP TABLE IF EXISTS `point_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `point_transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `point_type` enum('REWARD_POINTS','ACTIVITY_POINTS') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `point_source` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `points_earned` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_pt_student` (`student_id`),
  KEY `idx_pt_type` (`point_type`),
  CONSTRAINT `fk_pt_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `point_transactions`
--

LOCK TABLES `point_transactions` WRITE;
/*!40000 ALTER TABLE `point_transactions` DISABLE KEYS */;
INSERT INTO `point_transactions` VALUES (1,1,'REWARD_POINTS','C level -1 ',300,'2026-05-11 04:48:28'),(2,1,'REWARD_POINTS','test_1',700,'2026-05-11 04:48:28'),(3,1,'ACTIVITY_POINTS','attendance',2000,'2026-05-11 04:48:29'),(4,2,'REWARD_POINTS','test_2',1200,'2026-05-11 04:48:30'),(5,2,'ACTIVITY_POINTS','attendance',1000,'2026-05-11 04:48:30');
/*!40000 ALTER TABLE `point_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `points`
--

DROP TABLE IF EXISTS `points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `points` (
  `point_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `point_type` enum('REWARD_POINTS','ACTIVITY_POINTS') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `points_available` int NOT NULL DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`point_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `student_id` (`student_id`,`point_type`),
  KEY `idx_points_student` (`student_id`),
  KEY `idx_points_type` (`point_type`),
  CONSTRAINT `fk_points_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `points`
--

LOCK TABLES `points` WRITE;
/*!40000 ALTER TABLE `points` DISABLE KEYS */;
/*!40000 ALTER TABLE `points` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `professional_skills`
--

DROP TABLE IF EXISTS `professional_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `professional_skills` (
  `skill_id` bigint NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `professional_skills`
--

LOCK TABLES `professional_skills` WRITE;
/*!40000 ALTER TABLE `professional_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `professional_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_entities`
--

DROP TABLE IF EXISTS `role_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_entities` (
  `role_id` tinyint NOT NULL AUTO_INCREMENT,
  `role_name` enum('STUDENT','FACULTY','ADMIN') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_entities`
--

LOCK TABLES `role_entities` WRITE;
/*!40000 ALTER TABLE `role_entities` DISABLE KEYS */;
INSERT INTO `role_entities` VALUES (1,'STUDENT','2026-05-10 05:28:59'),(2,'FACULTY','2026-05-10 05:28:59'),(3,'ADMIN','2026-05-10 05:28:59');
/*!40000 ALTER TABLE `role_entities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_levels`
--

DROP TABLE IF EXISTS `skill_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_levels` (
  `level_id` bigint NOT NULL AUTO_INCREMENT,
  `training_skill_id` bigint NOT NULL,
  `level_name` varchar(255) NOT NULL,
  `core_concept` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `max_attempts` int DEFAULT NULL,
  PRIMARY KEY (`level_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_skill_levels_training_skill` (`training_skill_id`),
  CONSTRAINT `fk_sl_skill` FOREIGN KEY (`training_skill_id`) REFERENCES `training_skills` (`training_skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=90002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_levels`
--

LOCK TABLES `skill_levels` WRITE;
/*!40000 ALTER TABLE `skill_levels` DISABLE KEYS */;
INSERT INTO `skill_levels` VALUES (1,1,'1','C - if else conditions',5),(2,2,'1','Rotics and automations',5),(23,23,'1','C++ Fundamentals',3),(24,24,'1','Java Programming Basics',3),(25,25,'1','Python Programming Basics',3),(26,26,'1','JavaScript Fundamentals',3),(27,27,'1','Basic Data Structures Concepts',3),(28,28,'1','Database Management Fundamentals',3),(29,29,'1','Operating System Basics',3),(30,30,'1','Computer Networking Fundamentals',3),(31,31,'1','Basic Quantitative Aptitude',3),(32,32,'1','SQL Query Fundamentals',3),(33,33,'1','Artificial Intelligence Fundamentals',3),(34,34,'1','Cybersecurity Fundamentals',3),(35,35,'1','Internet of Things Basics',3),(36,36,'1','Cloud Computing Basics',3),(37,37,'1','AR and VR Fundamentals',3),(38,38,'1','Drone Technology Fundamentals',3),(39,39,'1','Embedded Systems Basics',3),(40,40,'1','Blockchain Technology Fundamentals',3),(41,41,'1','Web Development Fundamentals',3),(42,42,'1','Game Development Fundamentals',3),(43,1,'2','for loop',3);
/*!40000 ALTER TABLE `skill_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_points`
--

DROP TABLE IF EXISTS `skill_points`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_points` (
  `skill_point_id` bigint NOT NULL AUTO_INCREMENT,
  `training_skill_id` bigint NOT NULL,
  `level_id` bigint NOT NULL,
  `point_type` enum('REWARD_POINTS','ACTIVITY_POINTS') NOT NULL,
  `points_alloted` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_point_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_skill_points_training_skill` (`training_skill_id`),
  KEY `idx_skill_points_type` (`point_type`),
  KEY `fk_skill_points_level` (`level_id`),
  KEY `idx_skill_points_level` (`level_id`),
  CONSTRAINT `fk_skill_points_training_skill` FOREIGN KEY (`training_skill_id`) REFERENCES `training_skills` (`training_skill_id`),
  CONSTRAINT `fk_skill_points_level` FOREIGN KEY (`level_id`) REFERENCES `skill_levels` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_points`
--

LOCK TABLES `skill_points` WRITE;
/*!40000 ALTER TABLE `skill_points` DISABLE KEYS */;
/*!40000 ALTER TABLE `skill_points` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `skill_syllabus`
--

DROP TABLE IF EXISTS `skill_syllabus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skill_syllabus` (
  `syllabus_id` bigint NOT NULL AUTO_INCREMENT,
  `level_id` bigint NOT NULL,
  `order_index` int NOT NULL,
  `topic_title` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `topic_description` text COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`syllabus_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_skill_syllabus_level` (`level_id`),
  CONSTRAINT `fk_ss_level` FOREIGN KEY (`level_id`) REFERENCES `skill_levels` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=60001;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `skill_syllabus`
--

LOCK TABLES `skill_syllabus` WRITE;
/*!40000 ALTER TABLE `skill_syllabus` DISABLE KEYS */;
INSERT INTO `skill_syllabus` VALUES (1,1,1,'Introduction to if Statement','Learn the basic syntax of if statements in C and understand how conditions are used to control program execution.'),(2,1,2,'if else Statement','Understand how if else works to execute one block when the condition is true and another block when the condition is false.'),(3,1,3,'Nested if else','Learn how to place if else statements inside another if else statement for handling multiple conditions.'),(4,1,4,'else if Ladder','Study how else if ladders are used to check multiple conditions sequentially in a C program.'),(5,1,5,'Conditional Operators and Comparisons','Practice using relational and logical operators such as >, <, ==, !=, &&, and || inside conditional statements.'),(6,2,1,'Introduction to Robotics','Learn the basics of robotics, different types of robots, and the applications of robotics in industries and daily life.'),(7,2,2,'Electronic Components and Sensors','Understand common electronic components such as resistors, LEDs, motors, and sensors used in beginner robotics projects.'),(8,2,3,'Arduino Basics','Study the fundamentals of Arduino boards, pin configuration, and uploading simple programs for robotic control.'),(9,2,4,'Motor Control and Movement','Learn how DC motors and servo motors work and how they are controlled for robot movement and navigation.'),(10,2,5,'Building a Simple Line Follower Robot','Apply basic robotics concepts to design and build a beginner-level line follower robot using sensors and motors.'),(11,43,1,'For loop','Learn how to Apply for loop'),(12,43,2,'while loop','Learn how to Apply while loop'),(13,43,3,'do while loop','Learn how to Apply do while loop');
/*!40000 ALTER TABLE `skill_syllabus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_timings`
--

DROP TABLE IF EXISTS `slot_timings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `slot_timings` (
  `slot_id` bigint NOT NULL AUTO_INCREMENT,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`slot_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_timings`
--

LOCK TABLES `slot_timings` WRITE;
/*!40000 ALTER TABLE `slot_timings` DISABLE KEYS */;
INSERT INTO `slot_timings` VALUES (1,'13:00:00','14:00:00',1,'2026-05-18 07:55:23');
/*!40000 ALTER TABLE `slot_timings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_assessments`
--

DROP TABLE IF EXISTS `student_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_assessments` (
  `student_assessment_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `assessment_id` bigint NOT NULL,
  `score_obtained` int DEFAULT '0',
  `total_marks` int NOT NULL,
  `status` enum('ONGOING','PASSED','FAILED','COMPLETED') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`student_assessment_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_student_assessment_student` (`student_id`),
  KEY `idx_student_assessment_assessment` (`assessment_id`),
  KEY `idx_student_assessment_status` (`status`),
  CONSTRAINT `fk_sa_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`assessment_id`),
  CONSTRAINT `fk_sa_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_assessments`
--

LOCK TABLES `student_assessments` WRITE;
/*!40000 ALTER TABLE `student_assessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_booking`
--

DROP TABLE IF EXISTS `student_booking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_booking` (
  `booking_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `training_skill_id` bigint NOT NULL,
  `level_id` bigint DEFAULT NULL,
  `mapping_id` bigint NOT NULL,
  `slot_id` bigint NOT NULL,
  `booking_date` date NOT NULL,
  `status` enum('ONGOING','PASS','FAIL','COMPLETED','MALPRACTICE') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `is_present` tinyint(1) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `remarks` text DEFAULT NULL,
  PRIMARY KEY (`booking_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_student_slot_date` (`student_id`,`slot_id`,`booking_date`),
  KEY `idx_booking_student` (`student_id`),
  KEY `idx_booking_slot_date` (`slot_id`,`booking_date`),
  KEY `idx_booking_mapping` (`mapping_id`),
  KEY `idx_booking_level` (`level_id`),
  CONSTRAINT `fk_sb_mapping` FOREIGN KEY (`mapping_id`) REFERENCES `venue_mapping` (`mapping_id`),
  CONSTRAINT `fk_sb_slot` FOREIGN KEY (`slot_id`) REFERENCES `slot_timings` (`slot_id`),
  CONSTRAINT `fk_sb_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  CONSTRAINT `fk_sb_level` FOREIGN KEY (`level_id`) REFERENCES `skill_levels` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_booking`
--

LOCK TABLES `student_booking` WRITE;
/*!40000 ALTER TABLE `student_booking` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_booking` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_coding_submissions`
--

DROP TABLE IF EXISTS `student_coding_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_coding_submissions` (
  `submission_id` bigint NOT NULL AUTO_INCREMENT,
  `student_assessment_id` bigint NOT NULL,
  `coding_question_id` bigint NOT NULL,
  `programming_language` varchar(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `source_code` longtext COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `test_cases_passed` int DEFAULT '0',
  `total_test_cases` int DEFAULT '0',
  `execution_time_ms` int DEFAULT NULL,
  `memory_used_kb` int DEFAULT NULL,
  `submission_status` enum('PENDING','RUNNING','ACCEPTED','WRONG_ANSWER','TIME_LIMIT_EXCEEDED','RUNTIME_ERROR','COMPILATION_ERROR') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `marks_awarded` int DEFAULT '0',
  `submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`submission_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_submission_assessment` (`student_assessment_id`),
  KEY `idx_submission_question` (`coding_question_id`),
  KEY `idx_submission_status` (`submission_status`),
  CONSTRAINT `fk_scs_assessment` FOREIGN KEY (`student_assessment_id`) REFERENCES `student_assessments` (`student_assessment_id`),
  CONSTRAINT `fk_scs_question` FOREIGN KEY (`coding_question_id`) REFERENCES `assessment_coding_questions` (`coding_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_coding_submissions`
--

LOCK TABLES `student_coding_submissions` WRITE;
/*!40000 ALTER TABLE `student_coding_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_coding_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_mcq_answers`
--

DROP TABLE IF EXISTS `student_mcq_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_mcq_answers` (
  `student_answer_id` bigint NOT NULL AUTO_INCREMENT,
  `student_assessment_id` bigint NOT NULL,
  `mcq_question_id` bigint NOT NULL,
  `selected_option` enum('A','B','C','D') COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `marks_awarded` int DEFAULT '0',
  PRIMARY KEY (`student_answer_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_mcq_answer_assessment` (`student_assessment_id`),
  KEY `idx_mcq_answer_question` (`mcq_question_id`),
  CONSTRAINT `fk_sma_assessment` FOREIGN KEY (`student_assessment_id`) REFERENCES `student_assessments` (`student_assessment_id`),
  CONSTRAINT `fk_sma_question` FOREIGN KEY (`mcq_question_id`) REFERENCES `assessment_mcq_questions` (`mcq_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_mcq_answers`
--

LOCK TABLES `student_mcq_answers` WRITE;
/*!40000 ALTER TABLE `student_mcq_answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_mcq_answers` ENABLE KEYS */;
UNLOCK TABLES;


--
-- Table structure for table `student_skills`
--

DROP TABLE IF EXISTS `student_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_skills` (
  `student_skill_id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `skill_id` bigint NOT NULL,
  `skill_type` enum('PRIMARY','SECONDARY','SPECIFICATION') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_skill_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `student_id` (`student_id`,`skill_id`),
  KEY `idx_student_skills_student` (`student_id`),
  KEY `idx_student_skills_skill` (`skill_id`),
  CONSTRAINT `fk_ss_skill` FOREIGN KEY (`skill_id`) REFERENCES `professional_skills` (`skill_id`),
  CONSTRAINT `fk_ss_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_skills`
--

LOCK TABLES `student_skills` WRITE;
/*!40000 ALTER TABLE `student_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `student_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `reg_num` varchar(20) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `degree` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `course` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `year_of_study` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `reg_num` (`reg_num`),
  KEY `idx_students_user` (`user_id`),
  KEY `idx_students_reg` (`reg_num`),
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=60002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,1,'7376242AL126','Gowtham J','BTech','AIML',2,1,'2026-05-11 01:27:48','2026-05-11 02:36:08'),(2,2,'7376242BT192','Saswath Kumar','BTech','BT',2,1,'2026-05-11 01:27:48','2026-05-11 02:36:09');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `survey_questions_category`
--

DROP TABLE IF EXISTS `survey_questions_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `survey_questions_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `survey_question_id` bigint NOT NULL,
  `category_name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_sqc_question` (`survey_question_id`),
  CONSTRAINT `fk_sqc_question` FOREIGN KEY (`survey_question_id`) REFERENCES `end_survey_questions` (`survey_question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `survey_questions_category`
--

LOCK TABLES `survey_questions_category` WRITE;
/*!40000 ALTER TABLE `survey_questions_category` DISABLE KEYS */;
/*!40000 ALTER TABLE `survey_questions_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `training_skill_category`
--

DROP TABLE IF EXISTS `training_skill_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_skill_category` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `training_skill_category`
--

LOCK TABLES `training_skill_category` WRITE;
/*!40000 ALTER TABLE `training_skill_category` DISABLE KEYS */;
INSERT INTO `training_skill_category` VALUES (1,'SOFTWARE','2026-05-11 01:46:26'),(2,'HARDWARE','2026-05-11 01:46:27'),(3,'GENERAL','2026-05-11 01:46:28');
/*!40000 ALTER TABLE `training_skill_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `training_skills`
--

DROP TABLE IF EXISTS `training_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_skills` (
  `training_skill_id` bigint NOT NULL AUTO_INCREMENT,
  `category_id` bigint NOT NULL,
  `skill_name` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `skill_type` enum('PS','PBL') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`training_skill_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_skill_type` (`skill_type`),
  KEY `idx_training_skills_type_category` (`skill_type`,`category_id`),
  KEY `fk_training_skills_category` (`category_id`),
  KEY `idx_training_skills_category` (`category_id`),
  CONSTRAINT `fk_training_skills_category` FOREIGN KEY (`category_id`) REFERENCES `training_skill_category` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=60002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `training_skills`
--

LOCK TABLES `training_skills` WRITE;
/*!40000 ALTER TABLE `training_skills` DISABLE KEYS */;
INSERT INTO `training_skills` VALUES (1,1,'C language','PS','c_lang.png',1,'2026-05-11 00:40:18'),(2,1,'Robotics lab','PBL','robotics_lab.jpeg',1,'2026-05-11 00:40:19'),(23,1,'C++','PS','c_lang.png',1,'2026-05-11 01:14:38'),(24,1,'Java','PS','c_lang.png',1,'2026-05-11 01:14:38'),(25,1,'Python','PS','c_lang.png',1,'2026-05-11 01:14:38'),(26,1,'JavaScript','PS','c_lang.png',1,'2026-05-11 01:14:38'),(27,1,'Data Structures','PS','c_lang.png',1,'2026-05-11 01:14:38'),(28,1,'DBMS','PS','c_lang.png',1,'2026-05-11 01:14:38'),(29,1,'Operating Systems','PS','c_lang.png',1,'2026-05-11 01:14:38'),(30,1,'Computer Networks','PS','c_lang.png',1,'2026-05-11 01:14:38'),(31,3,'Aptitude','PS','c_lang.png',1,'2026-05-11 01:14:38'),(32,1,'SQL','PS','c_lang.png',1,'2026-05-11 01:14:38'),(33,1,'AI Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(34,1,'Cybersecurity Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(35,1,'IoT Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(36,1,'Cloud Computing Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(37,1,'AR VR Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(38,1,'Drone Technology Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(39,1,'Embedded Systems Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(40,1,'Blockchain Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(41,1,'Web Development Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39'),(42,1,'Game Development Lab','PBL','robotics_lab.jpeg',1,'2026-05-11 01:14:39');
/*!40000 ALTER TABLE `training_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` tinyint NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `refresh_hash` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `role_entities` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci AUTO_INCREMENT=60002;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,1,'gowthamj.al24@bitsathy.ac.in','d5d3c2123d33e6e6eb09844ad4d4027e631c81705f9bac189e5456faee51cc5d',1,'2026-05-18 07:19:18','2026-05-10 05:35:02','2026-05-18 07:19:18'),(2,1,'saswathkumarj.bt24@bitsathy.ac.in','9542faebf96dbf27b9a4afc13d831afce87cd5543de4201ca78e583adf18f847',1,'2026-05-17 15:19:19','2026-05-10 05:35:02','2026-05-17 15:19:19'),(101,1,'student1@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(102,1,'student2@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(103,1,'student3@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(104,1,'student4@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(105,1,'student5@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(106,1,'student6@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(107,1,'student7@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(108,1,'student8@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(109,1,'student9@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(110,1,'student10@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(111,1,'student11@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(112,1,'student12@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(113,1,'student13@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(114,1,'student14@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(115,1,'student15@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(116,1,'student16@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(117,1,'student17@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(118,1,'student18@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(119,1,'student19@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(120,1,'student20@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(121,1,'student21@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(122,1,'student22@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(123,1,'student23@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(124,1,'student24@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(125,1,'student25@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(126,1,'student26@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(127,1,'student27@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(128,1,'student28@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(129,1,'student29@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49'),(130,1,'student30@example.com',NULL,1,'2026-05-16 10:44:49','2026-05-16 10:44:49','2026-05-16 10:44:49');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venue_alloted_skills`
--

DROP TABLE IF EXISTS `venue_alloted_skills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venue_alloted_skills` (
  `venue_alloted_skill_id` bigint NOT NULL AUTO_INCREMENT,
  `venue_id` bigint NOT NULL,
  `training_skill_id` bigint NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`venue_alloted_skill_id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `uq_venue_skill` (`venue_id`,`training_skill_id`),
  KEY `idx_vts_venue` (`venue_id`),
  KEY `idx_vts_skill` (`training_skill_id`),
  CONSTRAINT `fk_vts_skill` FOREIGN KEY (`training_skill_id`) REFERENCES `training_skills` (`training_skill_id`),
  CONSTRAINT `fk_vts_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venue_alloted_skills`
--

LOCK TABLES `venue_alloted_skills` WRITE;
/*!40000 ALTER TABLE `venue_alloted_skills` DISABLE KEYS */;
/*!40000 ALTER TABLE `venue_alloted_skills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venue_mapping`
--

DROP TABLE IF EXISTS `venue_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venue_mapping` (
  `mapping_id` bigint NOT NULL AUTO_INCREMENT,
  `faculty_id` bigint NOT NULL,
  `venue_id` bigint NOT NULL,
  `skill_type` enum('PS','PBL') COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `slot_id` bigint NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `current_bookings` int DEFAULT '0',
  PRIMARY KEY (`mapping_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_vm_faculty` (`faculty_id`),
  KEY `idx_vm_venue` (`venue_id`),
  KEY `idx_vm_skill_type` (`skill_type`),
  KEY `idx_vm_slot` (`slot_id`),
  CONSTRAINT `fk_vm_faculty` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`faculty_id`),
  CONSTRAINT `fk_vm_slot` FOREIGN KEY (`slot_id`) REFERENCES `slot_timings` (`slot_id`),
  CONSTRAINT `fk_vm_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venue_mapping`
--

LOCK TABLES `venue_mapping` WRITE;
/*!40000 ALTER TABLE `venue_mapping` DISABLE KEYS */;
/*!40000 ALTER TABLE `venue_mapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venue_mapping_transfer_log`
--

DROP TABLE IF EXISTS `venue_mapping_transfer_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venue_mapping_transfer_log` (
  `transfer_id` bigint NOT NULL AUTO_INCREMENT,
  `from_faculty_id` bigint NOT NULL,
  `to_faculty_id` bigint NOT NULL,
  `reason` text,
  `venue_id` bigint NOT NULL,
  `slot_id` bigint NOT NULL,
  `current_status` enum('PENDING','REJECTED','ACCEPTED') COLLATE utf8mb4_0900_ai_ci DEFAULT 'PENDING',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transfer_id`) /*T![clustered_index] CLUSTERED */,
  KEY `idx_vmt_from` (`from_faculty_id`),
  KEY `idx_vmt_to` (`to_faculty_id`),
  KEY `idx_vmt_venue` (`venue_id`),
  CONSTRAINT `fk_vmt_from` FOREIGN KEY (`from_faculty_id`) REFERENCES `faculties` (`faculty_id`),
  CONSTRAINT `fk_vmt_to` FOREIGN KEY (`to_faculty_id`) REFERENCES `faculties` (`faculty_id`),
  CONSTRAINT `fk_vmt_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`venue_id`),
  CONSTRAINT `fk_vmt_slot` FOREIGN KEY (`slot_id`) REFERENCES `slot_timings` (`slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venue_mapping_transfer_log`
--

LOCK TABLES `venue_mapping_transfer_log` WRITE;
/*!40000 ALTER TABLE `venue_mapping_transfer_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `venue_mapping_transfer_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `venues`
--

DROP TABLE IF EXISTS `venues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `venues` (
  `venue_id` bigint NOT NULL AUTO_INCREMENT,
  `venue_name` varchar(100) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `location` varchar(200) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `capacity` int NOT NULL,
  `is_active` tinyint DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`venue_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `venues`
--

LOCK TABLES `venues` WRITE;
/*!40000 ALTER TABLE `venues` DISABLE KEYS */;
/*!40000 ALTER TABLE `venues` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-07 (synced with db_ref.txt)
