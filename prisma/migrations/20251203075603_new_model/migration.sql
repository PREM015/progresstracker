/*
  Warnings:

  - You are about to drop the column `name` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `emailReminders` on the `NotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `weeklySummary` on the `NotificationPreferences` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `TrackerEntry` table. All the data in the column will be lost.
  - You are about to drop the column `problems` on the `TrackerEntry` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `UserPlatform` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[title]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,date,platformId]` on the table `TrackerEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Goal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `NotificationPreferences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Platform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TrackerEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserPlatform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserSettings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Achievement_name_key";

-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "name",
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "icon" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "NotificationPreferences" DROP COLUMN "emailReminders",
DROP COLUMN "weeklySummary",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dailyReminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "goalReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "newFeatures" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncFailures" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weeklyReport" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Platform" ADD COLUMN     "apiEndpoint" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "authType" SET DEFAULT 'none';

-- AlterTable
ALTER TABLE "SyncLog" ADD COLUMN     "duration" INTEGER;

-- AlterTable
ALTER TABLE "TrackerEntry" DROP COLUMN "platform",
DROP COLUMN "problems",
ADD COLUMN     "applicationsSubmitted" INTEGER DEFAULT 0,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "coursesCompleted" INTEGER DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "mood" TEXT,
ADD COLUMN     "platformId" TEXT,
ADD COLUMN     "problemsSolved" INTEGER DEFAULT 0,
ADD COLUMN     "projectsCompleted" INTEGER DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "username" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "UserPlatform" DROP COLUMN "token",
ADD COLUMN     "credentials" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncStatus" TEXT DEFAULT 'pending',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "publicProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "theme" SET DEFAULT 'system';

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_title_key" ON "Achievement"("title");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_userId_status_idx" ON "Goal"("userId", "status");

-- CreateIndex
CREATE INDEX "Platform_category_idx" ON "Platform"("category");

-- CreateIndex
CREATE INDEX "Platform_slug_idx" ON "Platform"("slug");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "SyncLog_platformId_idx" ON "SyncLog"("platformId");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE INDEX "TrackerEntry_date_idx" ON "TrackerEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TrackerEntry_userId_date_platformId_key" ON "TrackerEntry"("userId", "date", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE INDEX "UserPlatform_userId_idx" ON "UserPlatform"("userId");

-- CreateIndex
CREATE INDEX "UserPlatform_platformId_idx" ON "UserPlatform"("platformId");
