/*
  Warnings:

  - A unique constraint covering the columns `[userId,date,platformId]` on the table `TrackerEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TrackerEntry_userId_date_platformId_key" ON "TrackerEntry"("userId", "date", "platformId");
