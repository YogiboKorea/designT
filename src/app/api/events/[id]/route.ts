import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectToDatabase();

    const event = await EventPage.findById(params.id);
    if (!event) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { title, sections, imageUrl, eventType } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
    }

    await connectToDatabase();

    const updateData: any = { title, sections };
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (eventType) updateData.eventType = eventType;

    const updatedEvent = await EventPage.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updatedEvent) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedEvent }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectToDatabase();

    const deletedEvent = await EventPage.findByIdAndDelete(params.id);
    if (!deletedEvent) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
