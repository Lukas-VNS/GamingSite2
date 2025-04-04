-- CreateTable
CREATE TABLE `Queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `gameType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `player1Id` VARCHAR(191) NOT NULL,
    `player2Id` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Queue` ADD CONSTRAINT `Queue_player1Id_fkey` FOREIGN KEY (`player1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Queue` ADD CONSTRAINT `Queue_player2Id_fkey` FOREIGN KEY (`player2Id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
