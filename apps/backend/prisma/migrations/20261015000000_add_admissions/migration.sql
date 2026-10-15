-- CreateTable
CREATE TABLE `Admission` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `applicantName` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `guardianName` VARCHAR(191) NOT NULL,
    `guardianPhone` VARCHAR(191) NOT NULL,
    `guardianEmail` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `previousSchool` VARCHAR(191) NULL,
    `classLevelId` VARCHAR(191) NULL,
    `academicYearId` VARCHAR(191) NULL,
    `status` ENUM('ENQUIRY', 'APPLIED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED') NOT NULL DEFAULT 'ENQUIRY',
    `source` ENUM('WALK_IN', 'PHONE', 'WEBSITE', 'REFERRAL', 'ADVERTISEMENT', 'OTHER') NOT NULL DEFAULT 'WALK_IN',
    `notes` TEXT NULL,
    `followUpDate` DATE NULL,
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,
    `enrolledStudentId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Admission_schoolId_idx`(`schoolId`),
    INDEX `Admission_status_idx`(`status`),
    INDEX `Admission_classLevelId_idx`(`classLevelId`),
    INDEX `Admission_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_classLevelId_fkey` FOREIGN KEY (`classLevelId`) REFERENCES `ClassLevel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admission` ADD CONSTRAINT `Admission_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
