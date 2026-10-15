-- CreateTable
CREATE TABLE `LessonPlan` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `classLevelId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NULL,
    `syllabusUnitId` VARCHAR(191) NULL,
    `teacherId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `objectives` TEXT NULL,
    `activities` TEXT NULL,
    `resources` TEXT NULL,
    `assessment` TEXT NULL,
    `plannedDate` DATE NULL,
    `durationMinutes` INTEGER NULL,
    `status` ENUM('DRAFT', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LessonPlan_schoolId_idx`(`schoolId`),
    INDEX `LessonPlan_subjectId_classLevelId_idx`(`subjectId`, `classLevelId`),
    INDEX `LessonPlan_plannedDate_idx`(`plannedDate`),
    INDEX `LessonPlan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LearningContent` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NULL,
    `classLevelId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('LINK', 'DOCUMENT', 'VIDEO', 'IMAGE', 'NOTE') NOT NULL DEFAULT 'LINK',
    `url` TEXT NULL,
    `tags` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LearningContent_schoolId_idx`(`schoolId`),
    INDEX `LearningContent_subjectId_idx`(`subjectId`),
    INDEX `LearningContent_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_classLevelId_fkey` FOREIGN KEY (`classLevelId`) REFERENCES `ClassLevel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `Section`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_syllabusUnitId_fkey` FOREIGN KEY (`syllabusUnitId`) REFERENCES `SyllabusUnit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `TeacherProfile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LessonPlan` ADD CONSTRAINT `LessonPlan_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningContent` ADD CONSTRAINT `LearningContent_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningContent` ADD CONSTRAINT `LearningContent_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningContent` ADD CONSTRAINT `LearningContent_classLevelId_fkey` FOREIGN KEY (`classLevelId`) REFERENCES `ClassLevel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LearningContent` ADD CONSTRAINT `LearningContent_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
