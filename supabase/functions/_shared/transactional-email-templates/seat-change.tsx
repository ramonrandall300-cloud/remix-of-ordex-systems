import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "ORDEX Systems"

interface SeatChangeProps {
  orgName?: string
  previousCount?: number
  newCount?: number
  changedBy?: string
  action?: string // 'added' or 'removed'
}

const SeatChangeEmail = ({ orgName, previousCount, newCount, changedBy, action }: SeatChangeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Seats {action || 'updated'} for {orgName || 'your organization'} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          Seats {action || 'updated'}
        </Heading>
        <Text style={text}>
          {changedBy || 'An admin'} has {action === 'added' ? 'added' : 'removed'} seats
          {orgName ? ` for ${orgName}` : ''} on {SITE_NAME}.
        </Text>
        <Text style={detail}>
          <strong>Previous seats:</strong> {previousCount ?? '—'}
        </Text>
        <Text style={detail}>
          <strong>New seats:</strong> {newCount ?? '—'}
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          This change affects the billing for your organization. If you did not expect
          this change, please contact your organization admin.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SeatChangeEmail,
  subject: (data: Record<string, any>) =>
    `Seats ${data.action || 'updated'} — ${data.orgName || 'your organization'}`,
  displayName: 'Seat change notification',
  previewData: {
    orgName: 'Acme Biotech',
    previousCount: 4,
    newCount: 6,
    changedBy: 'admin@acme.com',
    action: 'added',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const detail = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 6px' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
