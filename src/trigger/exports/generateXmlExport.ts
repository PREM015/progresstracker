import { task, logger } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";

export interface XmlExportPayload {
  exportJobId: string;
  userId: string;
  options?: Record<string, any>;
}

export const generateXmlExport = task({
  id: "generate-xml-export",
  maxDuration: 600, // 10 minutes max for XML generation
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 10000,
  },
  run: async (payload: XmlExportPayload) => {
    const { exportJobId, userId } = payload;
    
    logger.info("Starting XML Export generation", { exportJobId, userId });

    try {
      // Find export job
      const exportJob = await prisma.exportJob.findUnique({
        where: { id: exportJobId }
      });

      if (!exportJob) {
        throw new Error(`Export job ${exportJobId} not found`);
      }

      // Update status to processing
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { status: "PROCESSING", startedAt: new Date() }
      });
      
      logger.info("Fetching user data for XML", { userId });
      // Dummy logic to simulate XML generation
      
      // Complete the job successfully
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { 
          status: "COMPLETED", 
          completedAt: new Date(),
          fileUrl: `https://storage.example.com/exports/${exportJobId}.xml`,
          fileName: `export-${exportJobId}.xml`
        }
      });

      logger.info("XML Export generation completed", { exportJobId });
      return { success: true, fileUrl: `https://storage.example.com/exports/${exportJobId}.xml` };

    } catch (error) {
      logger.error("XML Export generation failed", { 
        exportJobId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      await prisma.exportJob.update({
        where: { id: exportJobId },
        data: { 
          status: "FAILED", 
          hasError: true,
          errorMessage: error instanceof Error ? error.message : String(error) 
        }
      });
      
      throw error;
    }
  }
});
