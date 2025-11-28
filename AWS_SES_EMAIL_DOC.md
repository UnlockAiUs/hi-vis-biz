VIZDOTS + AWS SES – AGENT KB
============================

GOAL
----
Provide AI agents enough SES context + API details to:

- Send transactional/notification emails via SES.
- Programmatically manage SES resources (identities, config sets, event destinations, MAIL FROM, receiving rules).
- Integrate SES with MCP-style tools.
- Avoid deliverability / reputation mistakes.

Agents: treat this file as a compact reference, not a human tutorial.

----------------------------------------------------------------------
0. PROJECT-SPECIFIC STATE (VIZDOTS)
----------------------------------------------------------------------

ACCOUNT / REGION
- AWS account: VizDots (single prod account).
- SES Region: us-east-1 (N. Virginia).
- All SES operations must use us-east-1.

IDENTITY & AUTH
- Verified domain: vizdots.com
- DKIM: Easy DKIM enabled for vizdots.com
- SPF TXT (root):
    v=spf1 include:amazonses.com ~all
- DMARC TXT (_dmarc.vizdots.com):
    v=DMARC1; p=none; rua=mailto:dmarc_rua@onsecureserver.net;
- Custom MAIL FROM:
    MAIL FROM domain: mail.vizdots.com
    DNS:
      MX  mail.vizdots.com -> 10 feedback-smtp.us-east-1.amazonses.com
      TXT mail.vizdots.com -> "v=spf1 include:amazonses.com ~all"

SENDING PRINCIPAL
- IAM user: ses-sender-vizdots
- Programmatic access only.
- Policy: minimally allows
    ses:SendEmail
    ses:SendRawEmail
  (plus STS or other IAM plumbing as configured outside this doc).

CONFIGURATION SET & EVENTS
- Configuration set name: vizdots-events
- Event destinations:
    - Hard bounces  -> SNS: ses-bounces
    - Complaints    -> SNS: ses-complaints
- SES **does not support global default config sets** in all contexts.
  Agents MUST explicitly set:
    ConfigurationSetName: "vizdots-events"
  on every SendEmail / SendRawEmail call.

SNS TOPICS
- ses-bounces: SNS topic for bounce events.
- ses-complaints: SNS topic for complaint events.
- No subscriptions created yet (future: SQS, Lambda, HTTP endpoint, etc.).

STANDARD FROM ADDRESS
- Primary From: no-reply@vizdots.com
- Display-friendly example:
    "VizDots <no-reply@vizdots.com>"

ENV VARS TO EXPECT
- AWS_SES_REGION=us-east-1
- AWS_SES_ACCESS_KEY_ID=xxxxxxxxx
- AWS_SES_SECRET_ACCESS_KEY=xxxxxxxx
- EMAIL_FROM="VizDots <no-reply@vizdots.com>"
- EMAIL_CONFIG_SET="vizdots-events"   # strongly recommended

----------------------------------------------------------------------
1. HIGH-LEVEL SES MODEL
----------------------------------------------------------------------

SES capabilities (v2 API for sending/management, classic for some receiving):

- Identities (domains/emails)
- Authentication: SPF + DKIM + DMARC + custom MAIL FROM
- Sending:
    - Simple / Raw / Templated messages
    - Configuration sets + tags
- Receiving:
    - Receipt rule sets + rules (S3, SNS, SQS, Lambda actions, etc.)
- Deliverability / reputation:
    - Bounces / complaints / rejects / suppression

All of the above are **regional** (per Region).

----------------------------------------------------------------------
2. CORE SENDING API (SESV2)
----------------------------------------------------------------------

Use SES API v2 via SDK (e.g., @aws-sdk/client-sesv2 in Node/TS).

Key operations (SESV2):

- SendEmail
- SendBulkEmail
- CreateEmailTemplate / UpdateEmailTemplate / DeleteEmailTemplate
- GetEmailTemplate / ListEmailTemplates
- GetAccount
- GetSendQuota / GetSendStatistics

Minimal JS/TS client (example only):

    import { Sesv2Client } from "@aws-sdk/client-sesv2";

    const sesClient = new Sesv2Client({
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
      },
    });

2.1 SIMPLE SEND PATTERN (PROJECT-CONSTRAINTS)

All SES sends from agents must:

- Use FromEmailAddress = no-reply@vizdots.com
- Use Region = us-east-1
- Include ConfigurationSetName = "vizdots-events"
- Include EmailTags for observability.

Pseudo-shape (NOT production code):

    {
      FromEmailAddress: "no-reply@vizdots.com",
      Destination: {
        ToAddresses: [to],
        CcAddresses: [],
        BccAddresses: [],
      },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: htmlBody },
            Text: { Data: textBody ?? fallbackPlaintext },
          },
        },
      },
      EmailTags: [
        { Name: "type", Value: logicalType },       // e.g. "checkin_reminder"
        { Name: "source", Value: "vizdots-app" },
        // optionally org/user IDs
      ],
      ConfigurationSetName: "vizdots-events",
    }

2.2 TEMPLATED SEND PATTERN

Uses stored SES templates:

    {
      FromEmailAddress: "no-reply@vizdots.com",
      Destination: { ToAddresses: [to] },
      Content: {
        Template: {
          TemplateName: "CheckinReminder",
          TemplateData: JSON.stringify({
            firstName,
            dashboardUrl,
            ...
          }),
        },
      },
      EmailTags: [...],
      ConfigurationSetName: "vizdots-events",
    }

Agents may also manage templates with:
- CreateEmailTemplate / UpdateEmailTemplate / DeleteEmailTemplate
- ListEmailTemplates / GetEmailTemplate

2.3 RAW SEND PATTERN (ADVANCED / ATTACHMENTS)

For full MIME control (custom headers, attachments, etc.) use:

- SendEmail with Content.Raw
  OR
- SendRawEmail (classic SES) if needed.

Agents should prefer Simple/Template unless MIME-level control is required.

----------------------------------------------------------------------
3. PROGRAMMATIC SES RESOURCE MANAGEMENT (CHEAT SHEET)
----------------------------------------------------------------------

AGENT GOAL: be able to create/update/inspect SES entities via APIs (SDK/CLI/IaC).
DNS changes (TXT/CNAME/MX) are **not** handled by agents.

3.1 IDENTITIES (API v2)

Create / manage verified identities:

- CreateEmailIdentity
    - Input: EmailIdentity (domain or email), plus optional config.
    - For domain: SES returns verification/DKIM info; DNS must be updated externally.
- GetEmailIdentity
- ListEmailIdentities
- DeleteEmailIdentity

DKIM-related:

- PutEmailIdentityDkimSigningAttributes
    - Enable/disable/rotate Easy DKIM or BYO DKIM.

Custom MAIL FROM domain:

- PutEmailIdentityMailFromAttributes
    - Parameters:
        - EmailIdentity: "vizdots.com"
        - MailFromDomain: "mail.vizdots.com"
        - BehaviorOnMxFailure: USE_DEFAULT_VALUE | REJECT_MESSAGE
    - Used to programmatically enable/disable custom MAIL FROM for an identity.
- GetEmailIdentityMailFromAttributes
    - Inspect current MAIL FROM config.

Default configuration set for identity:

- PutEmailIdentityConfigurationSetAttributes
    - Associates a **default** configuration set with an identity.
    - Fields:
        - EmailIdentity: "vizdots.com"
        - ConfigurationSetName: "vizdots-events" | null (to clear)
    - Even when a default is set, agents can override per-send via SendEmail.ConfigurationSetName.

3.2 CONFIGURATION SETS (API v2)

Configuration sets control event publishing, IP pools, etc.

Core operations:

- CreateConfigurationSet
- GetConfigurationSet
- ListConfigurationSets
- DeleteConfigurationSet
- PutConfigurationSetSendingOptions
    - Enable/disable sending via this config set.
- PutConfigurationSetTrackingOptions (if open/click tracking/pixels used).
- PutConfigurationSetReputationOptions
- PutConfigurationSetDeliveryOptions (dedicated IPs, pools, etc.)

Event destinations (SNS, Kinesis Firehose, CloudWatch, EventBridge):

- CreateConfigurationSetEventDestination
- UpdateConfigurationSetEventDestination
- DeleteConfigurationSetEventDestination
- GetConfigurationSetEventDestinations

Event destination core fields:

- ConfigurationSetName
- EventDestinationName
- MatchingEventTypes: e.g. ["BOUNCE","COMPLAINT","DELIVERY","SEND",...]
- Destination type block:
    - SnsDestination: { TopicArn }
    - KinesisFirehoseDestination, CloudWatchDestination, EventBridgeDestination, etc.

For VizDots:

- Existing objects were created via console:
    - Configuration set: vizdots-events
    - Two SNS event destinations (bounces/complaints) already wired.
- Agents usually just:
    - Ensure SendEmail calls include ConfigurationSetName="vizdots-events"
    - Optionally introspect or extend (e.g., add DELIVERY events + Kinesis later).

3.3 SNS TOPICS (BOUNCE/COMPLAINT HANDLING)

Agents can fully manage SNS topics & subscriptions using SNS APIs:

- CreateTopic / DeleteTopic
- ListTopics
- Subscribe / Unsubscribe
    - Endpoints: SQS queue, Lambda, HTTPS, email, etc.
- Publish (usually SNS publishes from SES; project code consumes messages).

Typical SES→SNS→SQS/Lambda pattern for future automation:

- SES config set → SNS topic (bounces/complaints).
- SNS topic:
    - Subscription to SQS queue or Lambda.
- Worker:
    - Reads events and marks addresses as suppressed in app DB.

3.4 INBOUND EMAIL: RULE SETS & RULES (CLASSIC SES API)

Receiving is still via classic SES API (not SESv2):

- Rule set container:
    - CreateReceiptRuleSet
    - DescribeReceiptRuleSet
    - DeleteReceiptRuleSet
    - SetActiveReceiptRuleSet
    - ListReceiptRuleSets

- Rules inside set:
    - CreateReceiptRule
    - DescribeReceiptRule
    - UpdateReceiptRule
    - DeleteReceiptRule
    - ListReceiptRules

ReceiptRule key attributes:

- RuleName
- Recipients: list of addresses/domains
- Actions:
    - S3Action (store raw message in S3)
    - SNSAction (publish event)
    - LambdaAction (invoke function)
    - StopAction, BounceAction, AddHeaderAction, SQSAction, etc.
- Enabled (bool)
- ScanEnabled (spam/virus scanning)
- TlsPolicy

Typical programmatic pattern for “receive → S3 + Lambda”:

1. CreateReceiptRuleSet (if none).
2. CreateReceiptRule in that set:
    - Recipients: ["incoming@vizdots.com"] or ["inbound.vizdots.com"]
    - Actions:
        - S3Action: { BucketName, ObjectKeyPrefix, KmsKeyArn? }
        - SNS/LambdaAction for processing pipeline (optional).
3. SetActiveReceiptRuleSet.

Agents must still rely on human-setup of:
- Domain MX record pointing to SES inbound endpoint for the Region.
- S3 bucket and permissions (AllowSESPuts policy).

3.5 OTHER USEFUL MANAGEMENT OPS

- Account-level:
    - GetAccount
    - GetSendQuota / GetSendStatistics

- Suppression:
    - ListSuppressedDestinations
    - PutSuppressedDestination
    - DeleteSuppressedDestination

- Tags (resource-level):
    - TagResource / UntagResource / ListTagsForResource

----------------------------------------------------------------------
4. IAM + SECURITY PATTERN
----------------------------------------------------------------------

AGENT PRINCIPLES

- SES access is via IAM user/role with minimal privileges.
- For VizDots app workers:

    Allow:
      - ses:SendEmail
      - ses:SendRawEmail (if raw/attachments needed)
      - ses:GetSendQuota, ses:GetSendStatistics (optional)

- For automation / admin agents that manage SES resources:

    Add resource-level admin actions as needed:
      - ses:CreateEmailIdentity, ses:DeleteEmailIdentity, ses:GetEmailIdentity, ses:ListEmailIdentities
      - ses:CreateConfigurationSet, ses:DeleteConfigurationSet, ses:GetConfigurationSet, ses:ListConfigurationSets
      - ses:CreateConfigurationSetEventDestination, ses:DeleteConfigurationSetEventDestination, ...
      - ses:PutEmailIdentityMailFromAttributes, ses:PutEmailIdentityConfigurationSetAttributes
      - ses:CreateReceiptRuleSet, ses:CreateReceiptRule, etc. (classic SES API)

- Do NOT hard-code credentials in code; use env vars / secret manager.

----------------------------------------------------------------------
5. PATTERNS FOR AGENT IMPLEMENTATIONS
----------------------------------------------------------------------

5.1 EMAIL ABSTRACTION LAYER (RECOMMENDED)

Expose a simple internal interface; wrap SES completely:

    type OutgoingEmail = {
      to: string[];
      subject: string;
      htmlBody?: string;
      textBody?: string;
      logicalType: "checkin_reminder" | "status_update" | "support" | ...;
      tags?: Record<string,string>;
    };

    sendEmail(email: OutgoingEmail) -> { messageId }

Implementation responsibilities:

- Normalize From to EMAIL_FROM.
- Always attach ConfigurationSetName="vizdots-events".
- Map logicalType and tags into EmailTags.
- Handle retries/backoff on throttling or transient errors.
- Return SES MessageId for logging.

5.2 ASYNC SENDING

Recommended:

- Place OutgoingEmail into a job queue.
- Worker pulls jobs and calls SES SendEmail.
- On success:
    - Persist (userId, emailType, date, messageId, tags).
- On failure:
    - Retry with backoff for transient errors (5xx, throttling).
    - For permanent errors (e.g., invalid address) mark address invalid.

5.3 BOUNCE/COMPLAINT HANDLING

Future automation pipeline (agents can help build):

- Subscribe an SQS queue or Lambda to:
    - ses-bounces
    - ses-complaints
- Handler:
    - Parse SES notification (JSON envelope).
    - Extract bounced/complaining recipient(s).
    - Mark these addresses as “suppressed” / “do_not_email” in app DB.
    - Optional: sync with SES suppression list via PutSuppressedDestination.

5.4 INBOUND HANDLING

Once inbound is set up (MX + rule set):

- SES stores raw MIME in S3 and/or invokes Lambda.
- Lambda (or worker) should:
    - Fetch message from S3.
    - Parse MIME (From, To, Subject, text/html bodies, attachments).
    - Map into an internal InboundMessage object.
    - Trigger appropriate business logic (e.g., create support ticket).

5.5 MCP TOOL DESIGN

Do NOT expose arbitrary SESv2 operations as tools.
Define high-level tools around business actions, e.g.:

- send_notification_email
- send_checkin_reminder
- send_support_update
- get_email_stats_for_user / org

Example MCP tool input schema (conceptual):

    {
      "name": "send_notification_email",
      "description": "Send a transactional email via SES through the VizDots email abstraction.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "to": { "type": "string" },
          "subject": { "type": "string" },
          "htmlBody": { "type": "string" },
          "textBody": { "type": "string" },
          "logicalType": {
            "type": "string",
            "enum": ["checkin_reminder","status_update","support","other"]
          },
          "extraTags": {
            "type": "object",
            "additionalProperties": { "type": "string" }
          }
        },
        "required": ["to","subject"]
      }
    }

Tool implementation:

- Validates input.
- Calls internal sendEmail abstraction.
- Returns:
    - messageId
    - applied tags
    - timestamp
    - any error.

----------------------------------------------------------------------
6. QUOTAS, COSTS, AND SAFETY GUARDS
----------------------------------------------------------------------

QUOTAS

- Account has per-24h send quota and max send rate (emails/sec).
- Use GetSendQuota / GetSendStatistics to introspect.
- Handle throttling by:
    - Backoff + retry.
    - Queue smoothing.

COST CONSIDERATIONS

- Charged primarily per 1,000 emails sent (HTML size + attachments affect data billed).
- Receiving:
    - S3 storage + PUT requests for inbound emails.
    - Lambda / SNS / SQS usage where applicable.
- Agents should:
    - Avoid unnecessary high-volume test runs.
    - Prefer small content in test environments.

SAFETY / DELIVERABILITY

- Always send from verified identity.
- Keep SPF/DKIM/DMARC aligned (already configured).
- Avoid sudden large spikes relative to quota when possible.
- Monitor bounce/complaint rates via:
    - SNS → logs/alerts.
    - CloudWatch metrics & SES reputation dashboard.

----------------------------------------------------------------------
7. QUICK IMPLEMENTATION CHECKLIST FOR AGENTS
----------------------------------------------------------------------

When implementing or updating email-related code:

[ ] Use @aws-sdk/client-sesv2 (or equivalent modern SDK).
[ ] Configure client with:
      region = AWS_SES_REGION (us-east-1)
      credentials from env/secret manager.
[ ] Always send from EMAIL_FROM (no-reply@vizdots.com).
[ ] Always set ConfigurationSetName="vizdots-events".
[ ] Attach meaningful EmailTags (type, orgId, userId if available).
[ ] Log SES MessageId with app-level email log entry.
[ ] Implement retries/backoff on SES errors.
[ ] For future: consume ses-bounces and ses-complaints from SNS and mark addresses as suppressed.

----------------------------------------------------------------------
END OF DOCUMENT
----------------------------------------------------------------------
