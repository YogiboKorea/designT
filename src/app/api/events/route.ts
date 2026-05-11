import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const dynamic = 'force-dynamic';

const DEFAULT_MALL_ID = process.env.NEXT_PUBLIC_CAFE24_MALL_ID || process.env.CAFE24_MALLID || 'yogibo';

export async function GET() {
  try {
    await connectToDatabase();

    // ychat 과 같은 컬렉션을 보지만 mallId 로 필터해 다른 mall 데이터와 섞이지 않도록 함.
    const events = await EventPage.find({ mallId: DEFAULT_MALL_ID }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, sections, imageUrl, eventType, couponNos } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newEvent = await EventPage.create({
      mallId: DEFAULT_MALL_ID,
      title,
      sections,
      imageUrl,
      eventType: eventType || 'event',
      couponNos: Array.isArray(couponNos) ? couponNos : [],
    });

    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
