// src/app/api/user/onboarding/route.ts
// =============================================================================
// USER ONBOARDING ROUTES
// =============================================================================
// Description: Manage user onboarding status and progress
// Methods: GET, PUT, PATCH, OPTIONS, HEAD
// Auth Required: True
// Rate Limit: 30 requests/minute
// =============================================================================

/* eslint-disable @typescript-eslint/no-unused-vars */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { apiRateLimiter, checkLimit } from '@/lib/rateLimit';
import apiResponse from '@/lib/apiResponse';

// =============================================================================
// CONSTANTS
// =============================================================================

const RATE_LIMIT = 30;

const ONBOARDING_STEPS = [
  'welcome',
  'profile',
  'platforms',
  'goals',
  'preferences',
  'complete',
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'private, max-age=60',
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const updateOnboardingSchema = z.object({
  currentStep: z.enum(ONBOARDING_STEPS).optional(),
  completedSteps: z.array(z.enum(ONBOARDING_STEPS)).optional(),
  stepData: z.record(z.unknown()).optional(),
  skipped: z.boolean().optional(),
});

const patchOnboardingSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  completed: z.boolean().default(true),
  data: z.record(z.unknown()).optional(),
});

// =============================================================================
// TYPES
// =============================================================================

interface OnboardingState {
  isComplete: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skipped: boolean;
  progress: number;
  stepData: Record<string, unknown>;
  startedAt: Date | null;
  completedAt: Date | null;
}

// Type for JSON-safe onboarding data
interface OnboardingJsonData {
  onboarding: Prisma.JsonObject;
  onboardingCurrentStep: OnboardingStep;
  onboardingSkipped: boolean;
  onboardingUpdatedAt: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function addHeaders(
  response: NextResponse,
  requestId: string,
  rateLimitResult?: { limit: number; remaining: number }
): NextResponse {
  Object.entries({ ...SECURITY_HEADERS, ...CORS_HEADERS }).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('X-Request-ID', requestId);

  if (rateLimitResult) {
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  }

  return response;
}

async function validateSession(request: NextRequest, requestId: string) {
  const ip = getClientIp(request);
  const rateLimitKey = `user-onboarding:${ip}`;
  const rateLimitResult = await checkLimit(apiRateLimiter, RATE_LIMIT, rateLimitKey);

  if (!rateLimitResult.success) {
    return {
      error: apiResponse.rateLimited(60, requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: apiResponse.unauthorized('Authentication required', requestId),
      session: null,
      rateLimitResult,
      ip,
    };
  }

  return { error: null, session, rateLimitResult, ip };
}

/**
 * Converts a Record<string, unknown> to a Prisma-compatible JsonObject
 * by serializing and deserializing through JSON
 */
function toJsonObject(data: Record<string, unknown>): Prisma.JsonObject {
  // Serialize and parse to ensure JSON compatibility
  return JSON.parse(JSON.stringify(data)) as Prisma.JsonObject;
}

async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      dashboardLayout: true,
      showWelcomeBanner: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      bio: true,
      image: true,
      timezone: true,
      preferredLanguage: true,
      createdAt: true,
      _count: {
        select: {
          platforms: true,
          goals: true,
        },
      },
    },
  });

  // Determine completed steps based on user data
  const completedSteps: OnboardingStep[] = ['welcome']; // Always completed after signup

  // Check profile step
  if (user?.name && user?.username) {
    completedSteps.push('profile');
  }

  // Check platforms step
  if (user?._count.platforms && user._count.platforms > 0) {
    completedSteps.push('platforms');
  }

  // Check goals step
  if (user?._count.goals && user._count.goals > 0) {
    completedSteps.push('goals');
  }

  // Check preferences step
  if (user?.timezone && user?.preferredLanguage) {
    completedSteps.push('preferences');
  }

  // Check if all steps are complete
  const isComplete = completedSteps.length >= ONBOARDING_STEPS.length - 1; // -1 because 'complete' is the final step
  if (isComplete) {
    completedSteps.push('complete');
  }

  // Determine current step
  let currentStep: OnboardingStep = 'welcome';
  for (const step of ONBOARDING_STEPS) {
    if (!completedSteps.includes(step)) {
      currentStep = step;
      break;
    }
  }

  // Calculate progress
  const progress = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);

  // Get step data from settings - safely cast the JsonValue
  const dashboardLayout = settings?.dashboardLayout as Prisma.JsonObject | null;
  const stepData = (dashboardLayout?.onboarding as Record<string, unknown>) || {};

  return {
    isComplete,
    currentStep,
    completedSteps,
    skipped: dashboardLayout?.onboardingSkipped === true,
    progress,
    stepData,
    startedAt: user?.createdAt || null,
    completedAt: isComplete ? settings?.updatedAt || null : null,
  };
}

async function updateOnboardingState(
  userId: string,
  updates: {
    currentStep?: OnboardingStep;
    completedSteps?: OnboardingStep[];
    stepData?: Record<string, unknown>;
    skipped?: boolean;
  }
): Promise<OnboardingState> {
  // Get current state
  const currentState = await getOnboardingState(userId);

  // Merge step data
  const newStepData = {
    ...currentState.stepData,
    ...updates.stepData,
  };

  // Create JSON-safe onboarding data object
  const onboardingData: OnboardingJsonData = {
    onboarding: toJsonObject(newStepData),
    onboardingCurrentStep: updates.currentStep || currentState.currentStep,
    onboardingSkipped: updates.skipped ?? currentState.skipped,
    onboardingUpdatedAt: new Date().toISOString(),
  };

  // Convert the entire object to InputJsonValue
  const dashboardLayout = toJsonObject(
    onboardingData as unknown as Record<string, unknown>
  ) as Prisma.InputJsonValue;

  await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      dashboardLayout,
      showWelcomeBanner: !updates.skipped,
    },
    update: {
      dashboardLayout,
      showWelcomeBanner: !updates.skipped,
      updatedAt: new Date(),
    },
  });

  // Return updated state
  return getOnboardingState(userId);
}

// =============================================================================
// OPTIONS - CORS Preflight
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  const requestId = generateRequestId();
  const response = new NextResponse(null, { status: 204 });
  return addHeaders(response, requestId);
}

// =============================================================================
// HEAD - Check Onboarding Status
// =============================================================================

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return addHeaders(new NextResponse(null, { status: 401 }), requestId);
    }

    const state = await getOnboardingState(session.user.id);

    const response = new NextResponse(null, {
      status: 200,
      headers: {
        'X-Onboarding-Complete': String(state.isComplete),
        'X-Onboarding-Progress': String(state.progress),
        'X-Onboarding-Current-Step': state.currentStep,
      },
    });

    return addHeaders(response, requestId);
  } catch (error) {
    logger.error('HEAD onboarding failed', { requestId }, error);
    return addHeaders(new NextResponse(null, { status: 500 }), requestId);
  }
}

// =============================================================================
// GET - Get Onboarding Status
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    const state = await getOnboardingState(userId);

    // Get step requirements
    const stepRequirements = ONBOARDING_STEPS.map((step) => ({
      step,
      completed: state.completedSteps.includes(step),
      required: step !== 'complete',
      description: getStepDescription(step),
    }));

    // Get recommendations for next step
    const nextStepRecommendation = getNextStepRecommendation(state.currentStep);

    logger.debug('Onboarding status fetched', {
      userId,
      isComplete: state.isComplete,
      currentStep: state.currentStep,
      progress: state.progress,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...state,
        steps: stepRequirements,
        nextStepRecommendation,
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('GET onboarding failed', { requestId }, error);
    return addHeaders(
      apiResponse.internalError('Failed to fetch onboarding status', requestId),
      requestId
    );
  }
}

// =============================================================================
// PUT - Update Full Onboarding State
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const bodyValidation = updateOnboardingSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const state = await updateOnboardingState(userId, bodyValidation.data);

    logger.info('Onboarding state updated', {
      userId,
      currentStep: state.currentStep,
      progress: state.progress,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(state, {
      meta: { requestId },
      message: 'Onboarding state updated',
    });

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PUT onboarding failed', { requestId }, error);
    return addHeaders(apiResponse.internalError('Failed to update onboarding', requestId), requestId);
  }
}

// =============================================================================
// PATCH - Mark Step as Complete
// =============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const validation = await validateSession(request, requestId);

    if (validation.error) {
      return addHeaders(validation.error, requestId, validation.rateLimitResult);
    }

    const { session, rateLimitResult, ip } = validation;
    const userId = session!.user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return addHeaders(
        apiResponse.validationError('Invalid JSON body', undefined, requestId),
        requestId,
        rateLimitResult
      );
    }

    const bodyValidation = patchOnboardingSchema.safeParse(body);

    if (!bodyValidation.success) {
      return addHeaders(
        apiResponse.validationError('Validation failed', bodyValidation.error.errors, requestId),
        requestId,
        rateLimitResult
      );
    }

    const { step, completed, data } = bodyValidation.data;

    // Get current state
    const currentState = await getOnboardingState(userId);

    // Update completed steps
    let completedSteps = [...currentState.completedSteps];
    if (completed && !completedSteps.includes(step)) {
      completedSteps.push(step);
    } else if (!completed) {
      completedSteps = completedSteps.filter((s) => s !== step);
    }

    // Determine next step
    let nextStep: OnboardingStep = 'complete';
    for (const s of ONBOARDING_STEPS) {
      if (!completedSteps.includes(s)) {
        nextStep = s;
        break;
      }
    }

    // Update state
    const state = await updateOnboardingState(userId, {
      currentStep: nextStep,
      completedSteps,
      stepData: data ? { [step]: data } : undefined,
    });

    logger.info('Onboarding step updated', {
      userId,
      step,
      completed,
      nextStep,
      progress: state.progress,
      requestId,
      ip,
      duration: Date.now() - startTime,
    });

    const response = apiResponse.success(
      {
        ...state,
        updatedStep: step,
        message: completed
          ? `Step "${step}" marked as complete`
          : `Step "${step}" marked as incomplete`,
      },
      {
        meta: { requestId },
      }
    );

    return addHeaders(response, requestId, rateLimitResult);
  } catch (error) {
    logger.error('PATCH onboarding failed', { requestId }, error);
    return addHeaders(
      apiResponse.internalError('Failed to update onboarding step', requestId),
      requestId
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStepDescription(step: OnboardingStep): string {
  const descriptions: Record<OnboardingStep, string> = {
    welcome: 'Welcome to the platform',
    profile: 'Complete your profile with name and username',
    platforms: 'Connect at least one platform',
    goals: 'Create your first goal',
    preferences: 'Set your timezone and language',
    complete: 'Onboarding complete!',
  };
  return descriptions[step];
}

function getNextStepRecommendation(currentStep: OnboardingStep): string {
  const recommendations: Record<OnboardingStep, string> = {
    welcome: 'Start by completing your profile to personalize your experience.',
    profile: 'Connect a platform like GitHub or LeetCode to start tracking.',
    platforms: 'Create a goal to stay motivated and track your progress.',
    goals: 'Set your timezone and language preferences for accurate tracking.',
    preferences: "You're almost done! Review and complete onboarding.",
    complete: 'Explore the dashboard and start tracking your progress!',
  };
  return recommendations[currentStep];
}

// =============================================================================
// ROUTE CONFIGURATION
// =============================================================================

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';