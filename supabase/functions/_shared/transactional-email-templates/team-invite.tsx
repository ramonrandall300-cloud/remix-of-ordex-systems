import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "ORDEX Systems"

interface TeamInviteProps {
  orgName?: string
  role?: string
  inviterEmail?: string
  signupUrl?: string
}

const TeamInviteEmail = ({ orgName, role, inviterEmail, signupUrl }: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {orgName || 'a team'} on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're invited!</Heading>
        <Text style={text}>
          {inviterEmail ? `${inviterEmail} has` : 'Someone has'} invited you to join
          {' '}<strong>{orgName || 'their organization'}</strong> on {SITE_NAME}
          {role ? ` as a ${role}` : ''}.
        </Text>
        <Text style={text}>
          {SITE_NAME} is a biotech research platform for protein prediction,
          molecular docking, CRISPR design, and more.
        </Text>
        {signupUrl && (
          <Button style={button} href={signupUrl}>
            Accept Invite
          </Button>
        )}
        {!signupUrl && (
          <Text style={text}>
            Sign up at ordex-systems.com to accept the invitation.
          </Text>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          This invite expires in 7 days. If you didn't expect this, you can safely ignore it.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: (data: Record<string, any>) =>
    `You're invited to join ${data.orgName || 'a team'} on ORDEX Systems`,
  displayName: 'Team invite',
  previewData: {
    orgName: 'Acme Biotech',
    role: 'member',
    inviterEmail: 'admin@acme.com',
    signupUrl: 'https://ordex-systems.com/en/auth',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px' }
const button = {
  backgroundColor: '#26b5a0',
  color: '#0f172a',
  fontWeight: 'bold' as const,
  fontSize: '15px',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '8px 0 24px',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '0' }
