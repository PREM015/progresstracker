// emails/support-ticket-created.tsx
import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';

interface SupportTicketCreatedEmailProps {
  // Define props
}

export default function SupportTicketCreatedEmail(props: SupportTicketCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Section>
            <Text>Support Ticket Created</Text>
            {/* TODO: Implement email content */}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
