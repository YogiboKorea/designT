import { NextResponse } from 'next/server';
import ftp from 'basic-ftp';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    const body = await req.json();
    const { imageBase64, filename } = body;

    if (!imageBase64 || !filename) {
      return NextResponse.json({ success: false, message: 'Image data and filename are required' }, { status: 400 });
    }

    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Connect to FTP
    await client.access({
      host: process.env.FTP_HOST || 'yogibo.ftp.cafe24.com',
      port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASS || '',
      secure: false,
    });

    // Create a temporary stream from the buffer to upload
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);

    // Vercel(Linux) 환경에서 ensureDir(/) 명령어가 Cafe24 가상 루트 구조와 충돌해 550 에러를 낼 수 있습니다.
    // 폴더가 이미 있으므로 cd, mkd 없이 절대 경로로 다이렉트 업로드합니다.
    await client.uploadFrom(stream, `/web/img/design/${filename}`);

    const imageUrl = `https://yogibo.openhost.cafe24.com/web/img/design/${filename}`;

    return NextResponse.json({ success: true, imageUrl }, { status: 200 });

  } catch (error: any) {
    console.error('FTP Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    client.close();
  }
}
