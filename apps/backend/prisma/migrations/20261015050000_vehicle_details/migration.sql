-- CreateTable
CREATE TABLE `Driver` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `driverCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `licenseNumber` VARCHAR(191) NOT NULL,
    `licenseExpiry` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Driver_schoolId_idx`(`schoolId`),
    UNIQUE INDEX `Driver_schoolId_driverCode_key`(`schoolId`, `driverCode`),
    UNIQUE INDEX `Driver_schoolId_licenseNumber_key`(`schoolId`, `licenseNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Vehicle`
    ADD COLUMN `vehicleCode` VARCHAR(191) NULL,
    ADD COLUMN `type` ENUM('BUS', 'VAN') NOT NULL DEFAULT 'BUS',
    ADD COLUMN `driverId` VARCHAR(191) NULL,
    ADD COLUMN `routeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TransportRoute`
    ADD COLUMN `routeCode` VARCHAR(191) NULL,
    ADD COLUMN `startPoint` VARCHAR(191) NULL,
    ADD COLUMN `endPoint` VARCHAR(191) NULL,
    ADD COLUMN `pickupTime` VARCHAR(191) NULL,
    ADD COLUMN `dropTime` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Vehicle_schoolId_vehicleCode_key` ON `Vehicle`(`schoolId`, `vehicleCode`);

-- CreateIndex
CREATE INDEX `Vehicle_schoolId_routeId_idx` ON `Vehicle`(`schoolId`, `routeId`);

-- CreateIndex
CREATE INDEX `Vehicle_schoolId_driverId_idx` ON `Vehicle`(`schoolId`, `driverId`);

-- CreateIndex
CREATE UNIQUE INDEX `TransportRoute_schoolId_routeCode_key` ON `TransportRoute`(`schoolId`, `routeCode`);

-- AddForeignKey
ALTER TABLE `Driver` ADD CONSTRAINT `Driver_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `TransportRoute`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
