/*
  Warnings:

  - Made the column `playerOId` on table `Game` required. This step will fail if there are existing NULL values in that column.
  - Made the column `playerXId` on table `Game` required. This step will fail if there are existing NULL values in that column.

*/
-- First delete any games with null player IDs
DELETE FROM `Game` WHERE `playerXId` IS NULL OR `playerOId` IS NULL;

-- Drop existing foreign key constraints
ALTER TABLE `Game` DROP FOREIGN KEY `Game_playerXId_fkey`;
ALTER TABLE `Game` DROP FOREIGN KEY `Game_playerOId_fkey`;

-- Make the columns required
ALTER TABLE `Game` MODIFY `playerXId` VARCHAR(191) NOT NULL;
ALTER TABLE `Game` MODIFY `playerOId` VARCHAR(191) NOT NULL;

-- Add back the foreign key constraints with RESTRICT
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerXId_fkey` FOREIGN KEY (`playerXId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Game` ADD CONSTRAINT `Game_playerOId_fkey` FOREIGN KEY (`playerOId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
