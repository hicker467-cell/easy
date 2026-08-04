import mongoose from 'mongoose';

const SupportTicketSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    subject: { type: String, required: true },
    issueText: { type: String, required: true },
    status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
    adminNotes: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
