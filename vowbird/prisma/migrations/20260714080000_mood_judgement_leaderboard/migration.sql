-- AlterTable
ALTER TABLE `Vow` ADD COLUMN `noJudgementZone` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `leaderboardEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Pact` ADD COLUMN `noJudgementZone` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `leaderboardEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `MoodUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vowId` VARCHAR(191) NULL,
    `pactId` VARCHAR(191) NULL,
    `partnerMatchId` VARCHAR(191) NULL,
    `mood` ENUM('STRUGGLING', 'OUT_OF_IT', 'OKAY', 'FOCUSED', 'MOTIVATED', 'PROUD') NOT NULL,
    `note` VARCHAR(280) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MoodUpdate_userId_idx`(`userId`),
    INDEX `MoodUpdate_vowId_idx`(`vowId`),
    INDEX `MoodUpdate_pactId_idx`(`pactId`),
    INDEX `MoodUpdate_partnerMatchId_idx`(`partnerMatchId`),
    INDEX `MoodUpdate_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Encouragement` (
    `id` VARCHAR(191) NOT NULL,
    `fromUserId` VARCHAR(191) NOT NULL,
    `toUserId` VARCHAR(191) NOT NULL,
    `moodUpdateId` VARCHAR(191) NOT NULL,
    `sticker` ENUM('KEEP_GOING', 'PROUD_OF_YOU', 'YOUVE_GOT_THIS', 'ONE_STEP', 'BREATHING_WITH_YOU', 'ROOTING_FOR_YOU') NOT NULL,
    `note` VARCHAR(140) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Encouragement_moodUpdateId_idx`(`moodUpdateId`),
    INDEX `Encouragement_fromUserId_idx`(`fromUserId`),
    INDEX `Encouragement_toUserId_idx`(`toUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MoodUpdate` ADD CONSTRAINT `MoodUpdate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MoodUpdate` ADD CONSTRAINT `MoodUpdate_vowId_fkey` FOREIGN KEY (`vowId`) REFERENCES `Vow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MoodUpdate` ADD CONSTRAINT `MoodUpdate_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MoodUpdate` ADD CONSTRAINT `MoodUpdate_partnerMatchId_fkey` FOREIGN KEY (`partnerMatchId`) REFERENCES `PartnerMatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encouragement` ADD CONSTRAINT `Encouragement_fromUserId_fkey` FOREIGN KEY (`fromUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encouragement` ADD CONSTRAINT `Encouragement_toUserId_fkey` FOREIGN KEY (`toUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Encouragement` ADD CONSTRAINT `Encouragement_moodUpdateId_fkey` FOREIGN KEY (`moodUpdateId`) REFERENCES `MoodUpdate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
