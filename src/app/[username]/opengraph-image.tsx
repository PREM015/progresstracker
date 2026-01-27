import { ImageResponse } from 'next/og';

/**
 * OpenGraph Image Generator
 * 
 * Generates dynamic OG images for social sharing
 */

export const runtime = 'edge';
export const alt = 'Progress Tracker Profile';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

interface Props {
  params: { username: string };
}

export default async function OGImage({ params }: Props) {
  const { username } = params;

  // TODO: Fetch user data
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>
          @{username}
        </h1>
        <p style={{ fontSize: '24px', color: '#a1a1aa' }}>
          Progress Tracker Profile
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
