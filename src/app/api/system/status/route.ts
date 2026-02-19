
import { NextRequest, NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
    // In a real app, you might check a database flag or Redis key here.
    // For now, we'll return "operational" and maintenance: false.

    const status = {
        maintenance: false, // Set to true to test maintenance mode
        message: "All systems operational",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    };

    return apiResponse.success(status);
}
