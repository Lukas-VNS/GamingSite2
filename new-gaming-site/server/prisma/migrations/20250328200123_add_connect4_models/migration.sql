-- CreateTable
CREATE TABLE `Connect4Game` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `board` JSON NOT NULL,
    `nextPlayer` VARCHAR(191) NOT NULL,
    `gameStatus` VARCHAR(191) NOT NULL,
    `winner` VARCHAR(191) NULL,
    `playerRedId` VARCHAR(191) NOT NULL,
    `playerYellowId` VARCHAR(191) NOT NULL,
    `playerRedReady` BOOLEAN NOT NULL DEFAULT false,
    `playerYellowReady` BOOLEAN NOT NULL DEFAULT false,
    `playerRedTimeRemaining` INTEGER NOT NULL DEFAULT 60,
    `playerYellowTimeRemaining` INTEGER NOT NULL DEFAULT 60,
    `lastMoveTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Connect4Player` (
    `id` VARCHAR(191) NOT NULL,
    `socketId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `isReady` BOOLEAN NOT NULL DEFAULT false,
    `timeRemaining` INTEGER NOT NULL DEFAULT 60,
    `gameId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Connect4Player_socketId_key`(`socketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Connect4Move` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `column` INTEGER NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `gameId` INTEGER NOT NULL,
    `playedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `playerId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Connect4Game` ADD CONSTRAINT `Connect4Game_playerRedId_fkey` FOREIGN KEY (`playerRedId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Connect4Game` ADD CONSTRAINT `Connect4Game_playerYellowId_fkey` FOREIGN KEY (`playerYellowId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Connect4Player` ADD CONSTRAINT `Connect4Player_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Connect4Game`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Connect4Move` ADD CONSTRAINT `Connect4Move_gameId_fkey` FOREIGN KEY (`gameId`) REFERENCES `Connect4Game`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Connect4Move` ADD CONSTRAINT `Connect4Move_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
