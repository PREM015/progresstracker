/*
  Warnings:

  - You are about to drop the column `isSuperAdmin` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN     "verifiedIp" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isSuperAdmin";
