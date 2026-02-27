// ============================================================================
// FILE: emails/export-ready.tsx
// PURPOSE: Email sent when data export is complete
// ============================================================================

// REFERENCE FILES TO LOOK AT:
// -----------------------------------------------------------------------------
// 1. emails/report-generated.tsx - Report ready email
// 2. emails/weekly-report.tsx - Report email pattern
// 3. emails/components/EmailLayout.tsx - Email layout
// 4. emails/components/Button.tsx - Download button
// 5. services/exportService.ts - Export service
// 6. lib/email.ts - Email sending
// 7. types/export.ts - Export types
// 8. prisma/schema.prisma - ExportJob model
// -----------------------------------------------------------------------------

import { Text, Section } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from './components/EmailLayout';
import { Button } from './components/Button';
import { Card } from './components/Card';

export interface ExportReadyProps {
    userName: string;
    exportName: string;
    exportFormat: string;
    fileSize: string;
    downloadLink: string;
    expiresAt: Date | string;
    recordCount?: number;
}

export const ExportReadyEmail: React.FC<ExportReadyProps> = ({
    userName = 'there',
    exportName = 'Progress Data Export',
    exportFormat = 'CSV',
    fileSize = '2.5 MB',
    downloadLink,
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    recordCount,
}) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';

    const formatDate = (date: Date | string) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <EmailLayout preview="Your data export is ready!">
            <Section style={successBanner}>
                <Text style={{ fontSize: '48px', margin: '0 0 8px' }}>📦</Text>
                <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    Export Complete!
                </Text>
            </Section>

            <Text style={paragraph}>Hi {userName},</Text>

            <Text style={paragraph}>
                Great news! Your data export is ready to download. We&apos;ve packaged all your requested
                data and it&apos;s waiting for you.
            </Text>

            <Card variant="success" title="📊 Export Details">
                <Text style={{ margin: 0, fontSize: '14px' }}>
                    <strong>Export Name:</strong> {exportName}
                    <br />
                    <strong>Format:</strong> {exportFormat.toUpperCase()}
                    <br />
                    <strong>File Size:</strong> {fileSize}
                    <br />
                    {recordCount && (
                        <>
                            <strong>Records:</strong> {recordCount.toLocaleString()}
                            <br />
                        </>
                    )}
                    <strong>Generated:</strong> {formatDate(new Date())}
                </Text>
            </Card>

            <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
                <Button href={downloadLink} variant="primary">
                    📥 Download Export
                </Button>
            </Section>

            <Card variant="warning" title="⏰ Important: Download Soon">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    This download link will expire on:
                    <br />
                    <strong style={{ fontSize: '16px', display: 'block', marginTop: '8px' }}>
                        {formatDate(expiresAt)}
                    </strong>
                    <br />
                    Make sure to download your export before it expires!
                </Text>
            </Card>

            <Text style={paragraph}>
                <strong>What&apos;s included in your export?</strong>
            </Text>
            <Text style={paragraph}>
                Your export contains all the data you requested, including:
                <br />
                • Progress tracking data
                <br />
                • Goals and achievements
                <br />
                • Platform integrations
                <br />
                • Activity history
                <br />• Custom reports and analytics
            </Text>

            <Card variant="info" title="Need Another Export?">
                <Text style={{ margin: 0, fontSize: '14px', textAlign: 'center' as const }}>
                    You can generate a new export anytime from your account settings.
                    <br />
                    <br />
                    <Button href={`${baseUrl}/settings/data-export`} variant="secondary">
                        Generate New Export
                    </Button>
                </Text>
            </Card>

            <Text style={smallText}>
                Having trouble downloading? Contact us at support@progresstracker.app
            </Text>
        </EmailLayout>
    );
};

const successBanner = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    borderRadius: '12px',
    padding: '32px 20px',
    textAlign: 'center' as const,
    marginBottom: '24px',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#374151',
    margin: '0 0 16px',
};

const smallText = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

export default ExportReadyEmail;
