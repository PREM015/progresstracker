import { ImageResponse } from 'next/og';

export const alt = 'Progress Tracker';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
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
            background: 'linear-gradient(to right, #4f46e5, #7c3aed)',
            width: 100,
            height: 100,
            borderRadius: 25,
            marginBottom: 30,
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M2 12h20" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 70,
            fontWeight: 800,
            color: 'white',
            margin: 0,
          }}
        >
          Progress Tracker
        </h1>
        <p
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 15,
          }}
        >
          Your Coding Journey, All in One Place.
        </p>
      </div>
    ),
    { ...size }
  );
}
