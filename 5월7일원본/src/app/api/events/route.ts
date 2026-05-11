import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    // Sort by newest first
    const events = await EventPage.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, sections, imageUrl, eventType } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
    }

    await connectToDatabase();

    const newEvent = await EventPage.create({
      title,
      sections,
      imageUrl,
      eventType: eventType || 'event',
    });

    return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
