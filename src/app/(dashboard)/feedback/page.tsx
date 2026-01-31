// app/(dashboard)/feedback/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Submit and track your feedback',
};

export default function FeedbackPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Feedback</h1>
      <p className="text-gray-600">
        Submit and track your feedback
      </p>
      {/* TODO: Implement FeedbackPage */}
    </div>
  );
}
