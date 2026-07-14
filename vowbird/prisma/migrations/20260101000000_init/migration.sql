-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `profileMode` ENUM('VEILED', 'OPEN') NOT NULL DEFAULT 'VEILED',
    `anonymousAlias` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/New_York',
    `preferredCheckInTime` VARCHAR(191) NOT NULL DEFAULT '09:00',
    `plan` ENUM('FREE', 'PLUS') NOT NULL DEFAULT 'FREE',
    `subscriptionStatus` VARCHAR(191) NULL,
    `subscriptionProvider` VARCHAR(191) NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_isSuspended_idx`(`isSuspended`),
    INDEX `User_profileMode_idx`(`profileMode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vow` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `category` ENUM('FITNESS', 'STUDY', 'CAREER', 'FAITH', 'MONEY', 'WELLNESS', 'CREATIVE', 'BUSINESS', 'READING', 'CUSTOM') NOT NULL,
    `frequencyType` ENUM('DAILY', 'WEEKLY') NOT NULL,
    `targetCountPerWeek` INTEGER NOT NULL DEFAULT 1,
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `visibility` ENUM('PRIVATE', 'PARTNER', 'GROUP_PUBLIC') NOT NULL DEFAULT 'PRIVATE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Vow_userId_idx`(`userId`),
    INDEX `Vow_status_idx`(`status`),
    INDEX `Vow_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pact` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('FITNESS', 'STUDY', 'CAREER', 'FAITH', 'MONEY', 'WELLNESS', 'CREATIVE', 'BUSINESS', 'READING', 'CUSTOM') NOT NULL,
    `privacy` ENUM('PUBLIC', 'INVITE_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `profileModeAllowed` ENUM('VEILED_ONLY', 'OPEN_ONLY', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `frequencyType` ENUM('DAILY', 'WEEKLY') NOT NULL DEFAULT 'DAILY',
    `targetCountPerWeek` INTEGER NOT NULL DEFAULT 7,
    `checkInStartTime` VARCHAR(191) NOT NULL DEFAULT '06:00',
    `checkInEndTime` VARCHAR(191) NOT NULL DEFAULT '23:59',
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `inviteCode` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pact_slug_key`(`slug`),
    UNIQUE INDEX `Pact_inviteCode_key`(`inviteCode`),
    INDEX `Pact_ownerId_idx`(`ownerId`),
    INDEX `Pact_privacy_idx`(`privacy`),
    INDEX `Pact_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PactMember` (
    `id` VARCHAR(191) NOT NULL,
    `pactId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MODERATOR', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `displayModeInPact` ENUM('VEILED', 'OPEN') NOT NULL DEFAULT 'VEILED',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,

    INDEX `PactMember_userId_idx`(`userId`),
    UNIQUE INDEX `PactMember_pactId_userId_key`(`pactId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vowId` VARCHAR(191) NOT NULL,
    `category` ENUM('FITNESS', 'STUDY', 'CAREER', 'FAITH', 'MONEY', 'WELLNESS', 'CREATIVE', 'BUSINESS', 'READING', 'CUSTOM') NOT NULL,
    `frequencyType` ENUM('DAILY', 'WEEKLY') NOT NULL,
    `timezone` VARCHAR(191) NOT NULL,
    `preferredCheckInTime` VARCHAR(191) NOT NULL,
    `profileModePreference` ENUM('VEILED', 'OPEN', 'EITHER') NOT NULL DEFAULT 'EITHER',
    `tonePreference` VARCHAR(191) NOT NULL,
    `status` ENUM('WAITING', 'MATCHED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerRequest_userId_idx`(`userId`),
    INDEX `PartnerRequest_status_idx`(`status`),
    INDEX `PartnerRequest_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerMatch` (
    `id` VARCHAR(191) NOT NULL,
    `vowId` VARCHAR(191) NOT NULL,
    `userAId` VARCHAR(191) NOT NULL,
    `userBId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'ENDED', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `matchMode` ENUM('VEILED', 'OPEN') NOT NULL DEFAULT 'VEILED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    INDEX `PartnerMatch_userAId_idx`(`userAId`),
    INDEX `PartnerMatch_userBId_idx`(`userBId`),
    INDEX `PartnerMatch_vowId_idx`(`vowId`),
    INDEX `PartnerMatch_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vowId` VARCHAR(191) NULL,
    `pactId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `proofImageUrl` VARCHAR(191) NULL,
    `checkInDate` DATE NOT NULL,
    `status` ENUM('COMPLETED', 'MISSED') NOT NULL DEFAULT 'COMPLETED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CheckIn_userId_idx`(`userId`),
    INDEX `CheckIn_checkInDate_idx`(`checkInDate`),
    UNIQUE INDEX `CheckIn_userId_vowId_checkInDate_key`(`userId`, `vowId`, `checkInDate`),
    UNIQUE INDEX `CheckIn_userId_pactId_checkInDate_key`(`userId`, `pactId`, `checkInDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Letter` (
    `id` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NULL,
    `vowId` VARCHAR(191) NULL,
    `pactId` VARCHAR(191) NULL,
    `partnerMatchId` VARCHAR(191) NULL,
    `type` ENUM('PARTNER_LETTER', 'FUTURE_SELF', 'GROUP_REFLECTION') NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'SCHEDULED', 'UNLOCKED') NOT NULL DEFAULT 'DRAFT',
    `unlockAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Letter_senderId_idx`(`senderId`),
    INDEX `Letter_recipientId_idx`(`recipientId`),
    INDEX `Letter_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomPost` (
    `id` VARCHAR(191) NOT NULL,
    `pactId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `hiddenAt` DATETIME(3) NULL,

    INDEX `RoomPost_pactId_idx`(`pactId`),
    INDEX `RoomPost_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reaction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `checkInId` VARCHAR(191) NULL,
    `letterId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `type` ENUM('FIRE', 'CLAP', 'HEART', 'LOCKED_IN', 'PROUD', 'KEEP_GOING') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Reaction_userId_idx`(`userId`),
    INDEX `Reaction_checkInId_idx`(`checkInId`),
    INDEX `Reaction_letterId_idx`(`letterId`),
    INDEX `Reaction_postId_idx`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `reportedUserId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `checkInId` VARCHAR(191) NULL,
    `letterId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `status` ENUM('OPEN', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_status_idx`(`status`),
    INDEX `Report_reportedUserId_idx`(`reportedUserId`),
    INDEX `Report_reporterId_idx`(`reporterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Block` (
    `id` VARCHAR(191) NOT NULL,
    `blockerId` VARCHAR(191) NOT NULL,
    `blockedUserId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Block_blockerId_idx`(`blockerId`),
    INDEX `Block_blockedUserId_idx`(`blockedUserId`),
    UNIQUE INDEX `Block_blockerId_blockedUserId_key`(`blockerId`, `blockedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `checkInReminder` BOOLEAN NOT NULL DEFAULT true,
    `partnerCheckedIn` BOOLEAN NOT NULL DEFAULT true,
    `partnerLetter` BOOLEAN NOT NULL DEFAULT true,
    `missedCheckIn` BOOLEAN NOT NULL DEFAULT true,
    `pactEndingSoon` BOOLEAN NOT NULL DEFAULT true,
    `weeklyReflection` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID', 'WEB') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PushToken_userId_idx`(`userId`),
    UNIQUE INDEX `PushToken_userId_token_key`(`userId`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UploadedFile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UploadedFile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Vow` ADD CONSTRAINT `Vow_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pact` ADD CONSTRAINT `Pact_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PactMember` ADD CONSTRAINT `PactMember_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PactMember` ADD CONSTRAINT `PactMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerRequest` ADD CONSTRAINT `PartnerRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerRequest` ADD CONSTRAINT `PartnerRequest_vowId_fkey` FOREIGN KEY (`vowId`) REFERENCES `Vow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerMatch` ADD CONSTRAINT `PartnerMatch_vowId_fkey` FOREIGN KEY (`vowId`) REFERENCES `Vow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerMatch` ADD CONSTRAINT `PartnerMatch_userAId_fkey` FOREIGN KEY (`userAId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerMatch` ADD CONSTRAINT `PartnerMatch_userBId_fkey` FOREIGN KEY (`userBId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_vowId_fkey` FOREIGN KEY (`vowId`) REFERENCES `Vow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_vowId_fkey` FOREIGN KEY (`vowId`) REFERENCES `Vow`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Letter` ADD CONSTRAINT `Letter_partnerMatchId_fkey` FOREIGN KEY (`partnerMatchId`) REFERENCES `PartnerMatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPost` ADD CONSTRAINT `RoomPost_pactId_fkey` FOREIGN KEY (`pactId`) REFERENCES `Pact`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomPost` ADD CONSTRAINT `RoomPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_checkInId_fkey` FOREIGN KEY (`checkInId`) REFERENCES `CheckIn`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_letterId_fkey` FOREIGN KEY (`letterId`) REFERENCES `Letter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `RoomPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `RoomPost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_checkInId_fkey` FOREIGN KEY (`checkInId`) REFERENCES `CheckIn`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_letterId_fkey` FOREIGN KEY (`letterId`) REFERENCES `Letter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Block` ADD CONSTRAINT `Block_blockerId_fkey` FOREIGN KEY (`blockerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Block` ADD CONSTRAINT `Block_blockedUserId_fkey` FOREIGN KEY (`blockedUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PushToken` ADD CONSTRAINT `PushToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UploadedFile` ADD CONSTRAINT `UploadedFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

