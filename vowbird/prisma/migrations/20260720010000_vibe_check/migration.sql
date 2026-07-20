-- CreateTable
CREATE TABLE `VibeCheck` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `pactId` VARCHAR(191) NULL,
    `partnerMatchId` VARCHAR(191) NULL,
    `vibe` ENUM('DRIVING', 'AT_THE_GYM', 'STUDYING', 'WORKING', 'COOKING', 'OUT', 'DRINKS', 'RESTING', 'LOCKED_IN', 'CUSTOM') NOT NULL,
    `note` VARCHAR(280) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VibeCheck_userId_idx`(`userId`),
    INDEX `VibeCheck_pactId_idx`(`pactId`),
    INDEX `VibeCheck_partnerMatchId_idx`(`partnerMatchId`),
    INDEX `VibeCheck_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VibeCheck` ADD CONSTRAINT `VibeCheck_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VibeCheck` ADD CONSTRAINT `VibeCheck_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VibeCheck` ADD CONSTRAINT `VibeCheck_partnerMatchId_fkey` FOREIGN KEY (`partnerMatchId`) REFERENCES `PartnerMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
