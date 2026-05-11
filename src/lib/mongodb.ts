import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // If undefined during build or development without it
  console.warn('MONGODB_URI is safely ignored if not connected. Please add it to .env.local to use DB functionality.');
}

const cached = (global as any).mongoose || { conn: null, promise: null };

if (!(global as any).mongoose) {
  (global as any).mongoose = cached;
}

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // dbName 은 명시하지 않음 — URI 의 path(/test) 를 그대로 사용해 기존 레퍼런스/제품 등 데이터를 그대로 본다.
    // EventPage 만 ychat 과 동일한 yogibo DB 를 봐야 하므로 EventPage.ts 안에서 useDb('yogibo') 로 분리.
    const opts = { bufferCommands: false };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
