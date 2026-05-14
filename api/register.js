const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'info@proball.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    first_name,
    last_name,
    dob,
    gender,
    parent_name,
    parent_email,
    parent_phone,
    program,
    suburb,
    hear_about,
    notes,
  } = req.body;

  // Only email is required and must look like an email address.
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!parent_email || !emailRegex.test(parent_email)) {
    return res.status(400).json({ error: 'Please enter a valid email address so we can reach you.' });
  }

  const athleteName = [first_name, last_name].filter(Boolean).join(' ') || '—';
  const subjectName = first_name || last_name || 'a new athlete';

  // Fire-and-forget: push the submission to Zapier so it can append to Excel/OneDrive.
  // A Zapier outage must not block the form, so we don't await and we swallow errors.
  if (ZAPIER_WEBHOOK_URL) {
    fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submitted_at: new Date().toISOString(),
        first_name: first_name || '',
        last_name: last_name || '',
        athlete_name: athleteName,
        dob: dob || '',
        gender: gender || '',
        parent_name: parent_name || '',
        parent_email: parent_email,
        parent_phone: parent_phone || '',
        program: program || '',
        suburb: suburb || '',
        hear_about: hear_about || '',
        notes: notes || '',
      }),
    }).catch((zapErr) => {
      console.error('Zapier webhook failed (non-fatal):', zapErr);
    });
  }

  try {
    // Email to client with all form responses
    await resend.emails.send({
      from: FROM_EMAIL,
      to: NOTIFY_EMAIL,
      replyTo: parent_email || undefined,
      subject: `New Registration: ${athleteName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: #bc0008; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">New Player Registration</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px; width: 40%;">ATHLETE NAME</td>
                <td style="padding: 10px 0; font-weight: 600;">${athleteName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">DATE OF BIRTH</td>
                <td style="padding: 10px 0;">${dob || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">GENDER</td>
                <td style="padding: 10px 0;">${gender || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">PARENT NAME</td>
                <td style="padding: 10px 0;">${parent_name || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">PARENT EMAIL</td>
                <td style="padding: 10px 0;">${parent_email ? `<a href="mailto:${parent_email}">${parent_email}</a>` : '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">PARENT PHONE</td>
                <td style="padding: 10px 0;">${parent_phone || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">PROGRAM</td>
                <td style="padding: 10px 0;">${program || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">SUBURB</td>
                <td style="padding: 10px 0;">${suburb || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">HEARD ABOUT US</td>
                <td style="padding: 10px 0;">${hear_about || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 13px;">NOTES</td>
                <td style="padding: 10px 0;">${notes || '—'}</td>
              </tr>
            </table>
            <div style="margin-top: 24px; background: #f9fafb; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #6b7280;">
              ${parent_email ? 'Reply directly to this email to contact the parent.' : `No email provided — call them on ${parent_phone || 'the number above'}.`}
            </div>
          </div>
        </div>
      `,
    });

    // Confirmation email to parent (only if they provided an email)
    // Wrapped in its own try/catch so a Resend rejection (e.g. free-tier
    // sandbox restrictions on the recipient) doesn't fail the whole submission.
    if (parent_email) {
      try {
        await resend.emails.send({
        from: FROM_EMAIL,
        to: parent_email,
        replyTo: NOTIFY_EMAIL,
        subject: `We've received ${subjectName}'s registration — ProBall`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #bc0008; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Thanks for registering!</h1>
            </div>
            <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
              <p style="font-size: 16px; color: #111827;">Hi there,</p>
              <p style="color: #374151;">We've received ${first_name ? `${first_name}'s` : 'your'} registration${program ? ` for <strong>${program}</strong>` : ''}${suburb ? ` (suburb: ${suburb})` : ''}.</p>
              <p style="color: #374151;">Our team will be in touch within <strong>48 hours</strong> to organise your first free trial session.</p>
              <div style="margin: 24px 0; background: #fef2f2; border-left: 4px solid #bc0008; padding: 12px 16px; border-radius: 0 6px 6px 0;">
                <p style="margin: 0; font-size: 14px; color: #bc0008; font-weight: 600;">Your first 4 weeks are free — flexible membership options.</p>
              </div>
              <p style="color: #374151;">In the meantime, feel free to reply to this email or contact us:</p>
              <ul style="color: #374151;">
                <li>Email: <a href="mailto:info@proball.com">info@proball.com</a></li>
                <li>Phone: <a href="tel:0406974582">0406 974 582</a></li>
              </ul>
              <p style="color: #374151;">Talk soon,<br/><strong>The ProBall Team</strong></p>
            </div>
            <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">© 2025 ProBall. Sydney's youth basketball program.</p>
          </div>
        `,
        });
      } catch (confirmErr) {
        console.error('Parent confirmation email failed (non-fatal):', confirmErr);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Admin notification failed:', err);
    const message = err && err.message ? err.message : 'Failed to send notification email.';
    return res.status(500).json({ error: message });
  }
};
