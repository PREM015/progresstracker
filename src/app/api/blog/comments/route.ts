import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import apiResponse from "@/lib/apiResponse";
import { generateRequestId } from "@/lib/utils";
import blogService from "@/services/blogService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return apiResponse.validationError('Post ID is required');
    }

    const comments = await blogService.getComments(postId);

    return apiResponse.success(comments, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiResponse.unauthorized('Authentication required', requestId);
    }

    const { postId, content } = await request.json();
    if (!postId || !content) {
      return apiResponse.validationError('Post ID and content are required');
    }

    const comment = await blogService.createComment(postId, session.user.id, content);

    return apiResponse.created(comment, { meta: { requestId } });
  } catch (error) {
    return apiResponse.internalError('Operation failed', requestId);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
