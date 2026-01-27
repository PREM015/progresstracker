import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

/**
 * Embed Route
 * 
 * Generates embeddable content for external use
 */

export const runtime = 'edge';

interface Props {
  params: { username: string };
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  const { username } = params;
  const { searchParams } = new URL(request.url);
  
  const theme = searchParams.get('theme') || 'dark';
  const showStats = searchParams.get('stats') !== 'false';

  // TODO: Fetch user data
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          width: '100%',
          height: '100%',
          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#0a0a0a',
        }}
      >
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
          @{username}
        </h2>
        {showStats && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>Problems Solved: 0</div>
            <div>Current Streak: 0</div>
          </div>
        )}
      </div>
    ),
    {
      width: 400,
      height: 200,
    }
  );
}
