'use client';

/**
 * 루트 레이아웃 수준에서 발생하는 에러를 처리하는 글로벌 에러 바운더리.
 * root layout 자체가 깨질 수 있으므로 html/body를 직접 렌더링하고,
 * 외부 provider/스타일 의존을 최소화한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            gap: '16px',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', fontSize: '14px' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
