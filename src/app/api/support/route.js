import { NextResponse } from 'next/server';
import { connectDB, getStore } from '@/lib/db';
import SupportTicket from '@/lib/models/SupportTicket';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    const conn = await connectDB();
    if (conn) {
      const query = studentId ? { studentId } : {};
      const tickets = await SupportTicket.find(query).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, tickets });
    } else {
      let tickets = getStore().supportTickets || [];
      if (studentId) tickets = tickets.filter((t) => t.studentId === studentId);
      return NextResponse.json({ success: true, tickets });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, ticketId, studentId, studentName, subject, issueText, adminNotes } = body;

    const conn = await connectDB();

    if (action === 'create') {
      if (!subject || !issueText) {
        return NextResponse.json({ error: 'Subject and issue description are required' }, { status: 400 });
      }

      if (conn) {
        const ticket = await SupportTicket.create({
          studentId,
          studentName,
          subject,
          issueText,
          status: 'pending'
        });
        return NextResponse.json({ success: true, ticket });
      } else {
        if (!getStore().supportTickets) getStore().supportTickets = [];
        const newTicket = {
          id: `ticket_${Date.now()}`,
          studentId,
          studentName,
          subject,
          issueText,
          status: 'pending',
          adminNotes: '',
          createdAt: new Date().toISOString()
        };
        getStore().supportTickets.unshift(newTicket);
        return NextResponse.json({ success: true, ticket: newTicket });
      }
    }

    if (action === 'resolve') {
      if (conn) {
        const ticket = await SupportTicket.findByIdAndUpdate(
          ticketId,
          { status: 'resolved', adminNotes: adminNotes || 'Issue reviewed and resolved by admin' },
          { new: true }
        );
        return NextResponse.json({ success: true, ticket });
      } else {
        const tickets = getStore().supportTickets || [];
        const t = tickets.find((x) => x.id === ticketId || x._id === ticketId);
        if (t) {
          t.status = 'resolved';
          t.adminNotes = adminNotes || 'Issue reviewed and resolved by admin';
        }
        return NextResponse.json({ success: true, ticket: t });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
