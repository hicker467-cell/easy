import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB, getStore } from '@/lib/db';
import User from '@/lib/models/User';

export async function POST(req) {
  try {
    const { image, studentId } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'llc1dbov';
    const apiKey = process.env.CLOUDINARY_API_KEY || '842244119657866';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'QgtG5CnL_rnGovvWtQrdsWHCySM';

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'student_avatars';

    // Generate SHA-1 Signature for Cloudinary Upload
    const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    // Upload to Cloudinary REST API
    const formData = new URLSearchParams();
    formData.append('file', image);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('folder', folder);
    formData.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Failed to upload image' }, { status: 500 });
    }

    const imageUrl = data.secure_url;

    // Update student user profile in DB if studentId provided
    if (studentId) {
      const conn = await connectDB();
      if (conn) {
        await User.findOneAndUpdate({ studentId }, { profileImage: imageUrl });
      } else {
        const user = getStore().users.find((u) => u.studentId === studentId);
        if (user) user.profileImage = imageUrl;
      }
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
