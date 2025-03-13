/*
  Warnings:

  - Added the required column `playerId` to the `Move` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Game` ADD COLUMN `playerOId` VARCHAR(191) NULL,
    ADD COLUMN `playerOReady` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `playerXId` VARCHAR(191) NULL,
    ADD COLUMN `playerXReady` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Move` ADD COLUMN `playerId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerXId_fkey` FOREIGN KEY (`playerXId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerOId_fkey` FOREIGN KEY (`playerOId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Move` ADD CONSTRAINT `Move_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
