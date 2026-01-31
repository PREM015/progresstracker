// emails/support-ticket-reply.tsx
import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';

interface SupportTicketReplyEmailProps {
  // Define props
}

export default function SupportTicketReplyEmail(props: SupportTicketReplyEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Section>
            <Text>New Reply on Your Ticket</Text>
            {/* TODO: Implement email content */}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
