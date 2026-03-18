import { NextRequest, NextResponse } from "next/server";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import blogService from "@/services/blogService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('id');
    const authorName = searchParams.get('name');

    if (!authorId && !authorName) {
      return apiResponse.validationError('Author ID or Name is required');
    }

    const filters = {
      status: 'published' as const,
      search: authorName ? authorName : undefined, // Service doesn't have direct authorId filter in getAll yet, but I can add it or use search
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    const result = await blogService.getAll(filters);
    
    // Manual filter for authorId if provided, since service search is general
    if (authorId) {
        result.posts = result.posts.filter(p => p.authorId === authorId);
    }

    return apiResponse.success(result, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
