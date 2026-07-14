-- AlterEnum
ALTER TABLE `PartnerRequest` MODIFY `status` ENUM('WAITING', 'PENDING', 'MATCHED', 'CANCELLED', 'DECLINED') NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE `PartnerRequest` ADD COLUMN `targetUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `PartnerRequest_targetUserId_idx` ON `PartnerRequest`(`targetUserId`);

-- AddForeignKey
ALTER TABLE `PartnerRequest` ADD CONSTRAINT `PartnerRequest_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
