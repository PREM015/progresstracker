import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// Mock verification connection
async function verifyPlatformConnection(platformId: string) {
    return true; 
}

export const platformVerification = task({
  id: "platform-verification",
  run: async (payload: { userId: string; platformIds: string[] }) => {
    for (const platformId of payload.platformIds) {
      // Verify platform connection
      const isValid = await verifyPlatformConnection(platformId);
      
      if (!isValid) {
        await prisma.userPlatform.updateMany({
          where: { id: platformId },
          data: { connectionStatus: 'ERROR', syncStatus: 'ERROR' }
        });
      }
    }
    
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: 'Verification Complete',
        html: '<p>Platform verification has completed.</p>'
      });
    }
  },
});
