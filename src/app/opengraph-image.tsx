import { ImageResponse } from 'next/og';

export const alt = 'Progress Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #09090b, #18181b)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom right, #4f46e5, #7c3aed)',
            width: 120,
            height: 120,
            borderRadius: 30,
            marginBottom: 40,
            boxShadow: '0 20px 50px rgba(79, 70, 229, 0.3)',
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.05em',
            margin: 0,
          }}
        >
          Progress Tracker
        </h1>
        <p
          style={{
            fontSize: 32,
            color: '#a1a1aa',
            marginTop: 20,
          }}
        >
          Track your coding journey across every platform.
        </p>
      </div>
    ),
    { ...size }
  );
}
