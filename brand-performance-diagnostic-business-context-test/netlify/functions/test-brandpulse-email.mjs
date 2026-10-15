
// Test-only Brand Pulse email delivery.
// No client reports or automatic emails are sent.

const REVIEWER_IDS = new Set([
  '8b7d2087-3eab-49d6-9fbc-cb9cc8352a34',
  '75337cfb-c2d4-49b8-80cf-e7bf42b2fdb4',
  '787cd460-3b81-4d7b-ae2b-d9a1a303d449'
]);

const REVIEWER_EMAILS = new Set([
  'franco@thec-lab.co.uk',
  'michael@thec-lab.co.uk',
  'paul@thec-lab.co.uk'
]);

const FROM =
  'The Creative Lab | Brand Pulse <brandpulse@mail.thec-lab.co.uk>';

function respond(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return respond(405, { error: 'Method not allowed.' });
  }

  const authHeader = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);

  if (!match) {
    return respond(401, {
      error: 'Sign in to the review dashboard first.'
    });
  }

  const supabaseUrl = Netlify.env.get('SUPABASE_URL');
  const publishableKey =
    Netlify.env.get('SUPABASE_PUBLISHABLE_KEY') ||
    'sb_publishable_mw9ROaaA9D-HFC3R9_TDGg_YFt4BjwG';

  const resendKey = Netlify.env.get('RESEND_API_KEY');

  if (!supabaseUrl || !resendKey) {
    return respond(500, {
      error: 'Email test is not configured.'
    });
  }

  try {
    const verifyResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${match[1]}`
        }
      }
    );

    if (!verifyResponse.ok) {
      return respond(401, {
        error: 'Session invalid or expired.'
      });
    }

    const user = await verifyResponse.json();
    const recipient = String(user.email || '').toLowerCase();

    if (
      !REVIEWER_IDS.has(user.id) ||
      !REVIEWER_EMAILS.has(recipient)
    ) {
      return respond(403, {
        error: 'Not authorised to run an email test.'
      });
    }

    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM,
          to: [recipient],
          subject: 'Brand Pulse — email delivery test',
          text:
            'This is a test email from The Creative Lab Brand Pulse. ' +
            'No client report has been sent.',
          html:
            '<div style="font-family:Arial,sans-serif;' +
            'max-width:560px;margin:auto;padding:28px;' +
            'background:#F5F0E8;color:#343434">' +
            '<h2 style="margin-top:0">Brand Pulse</h2>' +
            '<p>This is a test email from The Creative Lab.</p>' +
            '<p>No client report has been sent.</p>' +
            '</div>'
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return respond(502, {
        error:
          result?.message ||
          'Resend rejected the test email.'
      });
    }

    return respond(200, {
      ok: true,
      message:
        `Test email accepted for ${recipient}. Check your inbox.`,
      email_id: result.id || null
    });
  } catch (error) {
    console.error(
      'Brand Pulse test mail error:',
      error?.message
    );

    return respond(500, {
      error: 'Unable to complete the email test.'
    });
  }
}
