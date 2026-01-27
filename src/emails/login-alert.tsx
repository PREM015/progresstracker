import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Button } from './components/Button';

/**
 * Email Template: LoginAlert
 * 
 * @created 2026-01-26
 */

interface LoginAlertEmailProps {
  userName?: string;
  // TODO: Add more props
}

export function LoginAlertEmail({
  userName = 'User',
}: LoginAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>LoginAlert - Progress Tracker</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ margin: '0 auto', padding: '20px 0 48px' }}>
          <Header />
          
          <Section style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '8px' }}>
            <Heading style={{ fontSize: '24px', marginBottom: '16px' }}>
              LoginAlert
            </Heading>
            
            <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
              Hello {userName},
            </Text>
            
            <Text style={{ fontSize: '16px', lineHeight: '24px' }}>
              {/* TODO: Add email content */}
              This is the loginalert email template.
            </Text>
            
            <Button href="https://progresstracker.app">
              Go to Dashboard
            </Button>
          </Section>
          
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

export default LoginAlertEmail;
