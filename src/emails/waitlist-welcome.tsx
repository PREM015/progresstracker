// emails/waitlist-welcome.tsx
import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';

interface WaitlistWelcomeEmailProps {
  // Define props
}

export default function WaitlistWelcomeEmail(props: WaitlistWelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc' }}>
        <Container>
          <Section>
            <Text>Welcome to the Waitlist</Text>
            {/* TODO: Implement email content */}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
