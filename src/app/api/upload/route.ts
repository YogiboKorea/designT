import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Vercel Blob 의 client-upload 토큰을 발급하는 라우트.
// 클라이언트는 @vercel/blob/client 의 upload() 가 이 엔드포인트로 토큰을 요청한 뒤
// Blob 스토어에 직접(브라우저 → Blob) 업로드한다. 이렇게 하면 서버리스 함수의
// 4.5MB 페이로드 한도를 우회할 수 있다. 업로드된 Blob URL 은 /api/ftp 가 Cafe24
// FTP 로 옮긴 뒤 곧장 삭제한다.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maximumSizeInBytes: 100 * 1024 * 1024,
        addRandomSuffix: false,
      }),
      onUploadCompleted: async () => {
        // No-op: FTP 이송은 클라가 별도로 /api/ftp 를 호출해서 처리한다.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload token issuance failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
