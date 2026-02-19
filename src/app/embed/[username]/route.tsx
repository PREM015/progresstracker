import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);

  const theme = searchParams.get('theme') || 'dark';
  const showStats = searchParams.get('stats') !== 'false';

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            achievements: true,
          }
        },
        goals: {
          where: { status: 'COMPLETED' }
        },
        streakHistory: {
          orderBy: { endDate: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#0a0a0a',
              fontSize: 24,
              fontFamily: 'sans-serif',
            }}
          >
            User not found
          </div>
        )
      );
    }

    const streak = user.currentStreak || 0; // Use denormalized currentStreak for better performance/accuracy
    const completedGoals = user.goals.length;
    const achievements = user._count.achievements;
    const displayName = user.name || user.username || 'User';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
            backgroundImage: theme === 'dark'
              ? 'linear-gradient(to bottom right, #27272a, #09090b)'
              : 'linear-gradient(to bottom right, #f4f4f5, #ffffff)',
            color: theme === 'dark' ? '#ffffff' : '#0a0a0a',
            fontFamily: 'sans-serif',
            padding: '24px',
            border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e4e4e7',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'auto' }}>
            {user.image && (
              <img
                src={user.image}
                width="48"
                height="48"
                style={{ borderRadius: '50%', marginRight: '16px' }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{displayName}</div>
              <div style={{ fontSize: '14px', color: theme === 'dark' ? '#a1a1aa' : '#52525b' }}>@{username}</div>
            </div>
          </div>

          {showStats && (
            <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'dark' ? '#818cf8' : '#4f46e5' }}>{streak}</div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#a1a1aa' : '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day Streak</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'dark' ? '#34d399' : '#059669' }}>{completedGoals}</div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#a1a1aa' : '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goals Met</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme === 'dark' ? '#fbbf24' : '#d97706' }}>{achievements}</div>
                <div style={{ fontSize: '12px', color: theme === 'dark' ? '#a1a1aa' : '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'flex-end', fontSize: '12px', color: theme === 'dark' ? '#52525b' : '#a1a1aa' }}>
            Progresstracker.app
          </div>
        </div>
      ),
      {
        width: 400,
        height: 200,
      }
    );

  } catch (error) {
    console.error('Embed generation error:', error);
    return new ImageResponse(
      (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#18181b',
          color: '#fff'
        }}>
          Error generating embed
        </div>
      ),
      { width: 400, height: 200 }
    );
  }
}
