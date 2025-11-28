/**
 * @file Check-in Reminder Email Template
 * @description Generates responsive HTML and text emails for VizDots check-in reminders
 */

export interface ReminderEmailData {
  recipientFirstName?: string;
  sessionCount: number;
  dashboardUrl: string;
  orgName?: string;
}

/**
 * Generate check-in reminder email content
 */
export function generateCheckinReminderEmail(data: ReminderEmailData): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const { recipientFirstName, sessionCount, dashboardUrl, orgName } = data;
  
  const greeting = recipientFirstName 
    ? `Hi ${recipientFirstName}!` 
    : 'Hi there!';
  
  const sessionText = sessionCount === 1 
    ? 'a quick check-in' 
    : `${sessionCount} quick check-ins`;
  
  const subject = sessionCount === 1
    ? 'You have a quick VizDots check-in today'
    : `You have ${sessionCount} VizDots check-ins today`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      height: 100% !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background-color: #eab308; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">
                VizDots
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                You have ${sessionText} waiting for you${orgName ? ` at ${orgName}` : ''}. 
                It only takes 2-3 minutes to share a quick "dot" about your work.
              </p>
              
              <!-- What is a dot? -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">
                  💡 What's a dot?
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b7280;">
                  A dot is a quick AI-assisted check-in. Just answer a few questions about your 
                  recent work — what you accomplished, any blockers, or how you're feeling. 
                  Your insights help your team work better together.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px 0;">
                    <a href="${dashboardUrl}" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; 
                              text-decoration: none; font-size: 16px; font-weight: 600; 
                              padding: 14px 32px; border-radius: 8px;">
                      Start Check-in →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 14px; color: #9ca3af; text-align: center;">
                This takes about 2-3 minutes. Your responses are shared with your organization.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                You're receiving this email because you're a member of 
                ${orgName || 'a VizDots organization'}.<br/>
                <a href="${dashboardUrl}" style="color: #6b7280;">Open your dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const textBody = `
${greeting}

You have ${sessionText} waiting for you${orgName ? ` at ${orgName}` : ''}.

It only takes 2-3 minutes to share a quick "dot" about your work.

WHAT'S A DOT?
A dot is a quick AI-assisted check-in. Just answer a few questions about your recent work — what you accomplished, any blockers, or how you're feeling. Your insights help your team work better together.

START YOUR CHECK-IN:
${dashboardUrl}

---
You're receiving this email because you're a member of ${orgName || 'a VizDots organization'}.
`.trim();

  return { subject, htmlBody, textBody };
}
