/**
 * @file AWS SES Email Client for VizDots
 * @description Email abstraction layer using AWS SES v2 API
 * 
 * AI AGENT INSTRUCTIONS:
 * - Always use this client for sending emails (not direct SES calls)
 * - Always include ConfigurationSetName="vizdots-events"
 * - Always include EmailTags for observability
 * - Never log full email addresses in long-term logs
 */

import { SESv2Client, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-sesv2';

// ============================================================================
// TYPES
// ============================================================================

export type EmailLogicalType = 
  | 'checkin_reminder'
  | 'status_update'
  | 'support'
  | 'invite'
  | 'welcome'
  | 'other';

export interface OutgoingEmail {
  to: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  logicalType: EmailLogicalType;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMAIL_CONFIG = {
  region: process.env.AWS_SES_REGION || 'us-east-1',
  fromAddress: process.env.EMAIL_FROM || 'VizDots <no-reply@vizdots.com>',
  configurationSet: process.env.EMAIL_CONFIG_SET || 'vizdots-events',
};

// ============================================================================
// SES CLIENT
// ============================================================================

let sesClient: SESv2Client | null = null;

function getSESClient(): SESv2Client | null {
  // Check if we have the required credentials
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    console.warn('[Email] AWS SES credentials not configured - emails will be logged to console');
    return null;
  }
  
  if (!sesClient) {
    sesClient = new SESv2Client({
      region: EMAIL_CONFIG.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  
  return sesClient;
}

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send an email via AWS SES
 * Falls back to console logging if SES credentials are not configured
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendEmailResult> {
  const client = getSESClient();
  
  // Build email tags
  const emailTags = [
    { Name: 'type', Value: email.logicalType },
    { Name: 'source', Value: 'vizdots-app' },
    ...(email.tags 
      ? Object.entries(email.tags).map(([name, value]) => ({ Name: name, Value: value }))
      : []
    ),
  ];
  
  // If no SES client (dev mode), log to console
  if (!client) {
    console.log('[Email] DEV MODE - Would send email:', {
      to: email.to.map(e => e.substring(0, 3) + '***'), // Truncate for privacy
      subject: email.subject,
      logicalType: email.logicalType,
      tags: emailTags,
    });
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }
  
  try {
    // Build text body if not provided
    const textBody = email.textBody || stripHtml(email.htmlBody || '');
    
    const input: SendEmailCommandInput = {
      FromEmailAddress: EMAIL_CONFIG.fromAddress,
      Destination: {
        ToAddresses: email.to,
      },
      Content: {
        Simple: {
          Subject: { Data: email.subject },
          Body: {
            Html: email.htmlBody ? { Data: email.htmlBody } : undefined,
            Text: { Data: textBody },
          },
        },
      },
      EmailTags: emailTags,
      ConfigurationSetName: EMAIL_CONFIG.configurationSet,
    };
    
    const command = new SendEmailCommand(input);
    const response = await client.send(command);
    
    console.log('[Email] Sent successfully:', {
      messageId: response.MessageId,
      logicalType: email.logicalType,
      toCount: email.to.length,
    });
    
    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Failed to send:', {
      error: errorMessage,
      logicalType: email.logicalType,
      toCount: email.to.length,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email with retry logic
 * Retries up to 3 times with exponential backoff for transient errors
 */
export async function sendEmailWithRetry(
  email: OutgoingEmail,
  maxRetries: number = 3
): Promise<SendEmailResult> {
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendEmail(email);
    
    if (result.success) {
      return result;
    }
    
    lastError = result.error;
    
    // Check if error is retryable (throttling, temporary service issues)
    const isRetryable = lastError?.includes('Throttl') || 
                        lastError?.includes('Service') ||
                        lastError?.includes('timeout');
    
    if (!isRetryable || attempt === maxRetries) {
      break;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, attempt - 1) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return {
    success: false,
    error: lastError || 'Max retries exceeded',
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Strip HTML tags to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY);
}

/**
 * Get email configuration (for debugging)
 */
export function getEmailConfig() {
  return {
    region: EMAIL_CONFIG.region,
    fromAddress: EMAIL_CONFIG.fromAddress,
    configurationSet: EMAIL_CONFIG.configurationSet,
    isConfigured: isEmailConfigured(),
  };
}
