-- AlterTable
ALTER TABLE `PartnerMatch` ADD COLUMN `vibesPublic` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `vibeLeaderboardEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Pact` ADD COLUMN `vibeLeaderboardEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `PartnerMatch_vibesPublic_idx` ON `PartnerMatch`(`vibesPublic`);
