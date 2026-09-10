-- ==============================================================================
-- ساختار جدول‌های MySQL برای هاست سی‌پنل (MySQL Database Schema for cPanel)
-- Ashk 24 Enterprise Application Database
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `company_profile` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `brandName` varchar(255) NOT NULL,
  `nationalCode` varchar(32) DEFAULT NULL,
  `phoneNumber` varchar(32) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `sector` varchar(64) DEFAULT 'digital_goods',
  `defaultTone` varchar(64) DEFAULT 'persuasive',
  `aboutUsSummary` text DEFAULT NULL,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media_platforms` (
  `id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `persianName` varchar(255) NOT NULL,
  `domain` varchar(128) NOT NULL,
  `category` varchar(64) NOT NULL,
  `monthlyVisits` varchar(128) DEFAULT NULL,
  `requiresOtp` tinyint(1) DEFAULT 0,
  `supportsImage` tinyint(1) DEFAULT 1,
  `formType` varchar(64) DEFAULT 'classified',
  `trustScore` int DEFAULT 90,
  `sessionStatus` varchar(32) DEFAULT 'none',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `productName` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `priceToman` bigint DEFAULT 0,
  `sector` varchar(64) DEFAULT 'digital_goods',
  `tone` varchar(64) DEFAULT 'persuasive',
  `status` varchar(32) DEFAULT 'active',
  `createdDate` varchar(32) DEFAULT NULL,
  `nextRenewalDate` varchar(32) DEFAULT NULL,
  `renewalCount` int DEFAULT 1,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `publication_jobs` (
  `id` varchar(64) NOT NULL,
  `campaignId` varchar(64) NOT NULL,
  `platformId` varchar(64) NOT NULL,
  `platformName` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL,
  `currentStep` varchar(255) DEFAULT NULL,
  `progressPercent` int DEFAULT 0,
  `otpRequired` tinyint(1) DEFAULT 0,
  `usedEngine` varchar(64) DEFAULT 'online-ai',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `username` varchar(64) NOT NULL UNIQUE,
  `fullName` varchar(255) NOT NULL,
  `role` varchar(32) DEFAULT 'operator',
  `passwordHash` varchar(255) NOT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- درج کاربر پیش‌فرض مدیر و اپراتور
INSERT IGNORE INTO `users` (`id`, `username`, `fullName`, `role`, `passwordHash`, `isActive`) VALUES
('usr_admin_01', 'admin', 'مدیر کل سامانه (اشک ۲۴)', 'admin', 'ashk24', 1),
('usr_op_02', 'operator', 'اپراتور بازاریابی و آگهی‌گذاری', 'operator', 'ashk24', 1);

-- ==============================================================================
-- ماژول مانیتورینگ و ارزیابی عملیاتی در محیط واقعی: Production Test Harness
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `test_harness_runs` (
  `runId` varchar(64) NOT NULL,
  `mode` varchar(32) NOT NULL DEFAULT 'SAFE_TEST',
  `overallStatus` varchar(32) NOT NULL DEFAULT 'RUNNING',
  `totalTests` int DEFAULT 0,
  `passedTests` int DEFAULT 0,
  `failedTests` int DEFAULT 0,
  `blockedTests` int DEFAULT 0,
  `skippedTests` int DEFAULT 0,
  `durationMs` int DEFAULT 0,
  `summary` text DEFAULT NULL,
  `startedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `completedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`runId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `test_harness_steps` (
  `id` bigint AUTO_INCREMENT,
  `runId` varchar(64) NOT NULL,
  `category` varchar(64) NOT NULL,
  `stepName` varchar(255) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `httpStatus` int DEFAULT 200,
  `status` varchar(32) NOT NULL DEFAULT 'PASS',
  `jobId` varchar(64) DEFAULT NULL,
  `platform` varchar(128) DEFAULT NULL,
  `durationMs` int DEFAULT 0,
  `stateTransition` varchar(255) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `evidence` longtext DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_run_id` (`runId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

