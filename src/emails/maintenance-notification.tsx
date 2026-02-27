// emails/maintenance-notification.tsx
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

export interface MaintenanceNotificationEmailProps {
  userName?: string;
  maintenanceTitle: string;
  maintenanceDescription: string;
  startTime: string;
  endTime: string;
  affectedServices: string[];
  isEmergency?: boolean;
}

export default function MaintenanceNotificationEmail(props: MaintenanceNotificationEmailProps) {
  const {
    userName = 'User',
    maintenanceTitle,
    maintenanceDescription,
    startTime,
    endTime,
    affectedServices,
    isEmergency = false
  } = props;

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px' }}>
            <Heading style={{ color: isEmergency ? '#dc2626' : '#f59e0b', fontSize: '24px', marginBottom: '20px' }}>
              {isEmergency ? '🚨' : '🔧'} {maintenanceTitle}
            </Heading>
            
            <Text style={{ fontSize: '16px', color: '#374151', lineHeight: '24px', marginBottom: '20px' }}>
              Hi {userName},
            </Text>
            
            <Text style={{ fontSize: '16px', color: '#374151', lineHeight: '24px', marginBottom: '20px' }}>
              {maintenanceDescription}
            </Text>

            <Section style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '6px', marginBottom: '20px' }}>
              <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>
                <strong>Start Time:</strong> {startTime}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>
                <strong>End Time:</strong> {endTime}
              </Text>
              <Text style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                <strong>Affected Services:</strong>
              </Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {affectedServices.map((service, index) => (
                  <li key={index} style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                    {service}
                  </li>
                ))}
              </ul>
            </Section>

            <Text style={{ fontSize: '14px', color: '#6b7280', lineHeight: '20px' }}>
              We apologize for any inconvenience this may cause and appreciate your patience.
            </Text>

            <Hr style={{ margin: '30px 0', borderColor: '#e5e7eb' }} />

            <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>
              ProgressTracker Team
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}