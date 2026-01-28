-- CreateIndex
CREATE INDEX "AuditLog_userId_action_createdAt_idx" ON "AuditLog"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "Goal_platformId_idx" ON "Goal"("platformId");

-- CreateIndex
CREATE INDEX "Invoice_stripePaymentIntentId_idx" ON "Invoice"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_stripePaymentIntentId_idx" ON "PaymentEvent"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_stripeInvoiceId_idx" ON "PaymentEvent"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentEvent_stripeChargeId_idx" ON "PaymentEvent"("stripeChargeId");

-- CreateIndex
CREATE INDEX "SyncLog_userPlatformId_idx" ON "SyncLog"("userPlatformId");

-- CreateIndex
CREATE INDEX "TrackerEntry_customPlatformId_idx" ON "TrackerEntry"("customPlatformId");

-- CreateIndex
CREATE INDEX "TrackerEntry_syncLogId_idx" ON "TrackerEntry"("syncLogId");

-- CreateIndex
CREATE INDEX "User_referredBy_idx" ON "User"("referredBy");

-- CreateIndex
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");

-- AddForeignKey
ALTER TABLE "TrackerEntry" ADD CONSTRAINT "TrackerEntry_customPlatformId_fkey" FOREIGN KEY ("customPlatformId") REFERENCES "CustomPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackerEntry" ADD CONSTRAINT "TrackerEntry_syncLogId_fkey" FOREIGN KEY ("syncLogId") REFERENCES "SyncLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_userPlatformId_fkey" FOREIGN KEY ("userPlatformId") REFERENCES "UserPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;
