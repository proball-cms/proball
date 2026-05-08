const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'info@proball.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

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

  // All fields are optional; require at least one contact method so we can reply
  if (!parent_email && !parent_phone) {
    return res.status(400).json({ error: 'Please provide either an email or phone number so we can reach you.' });
  }

  const athleteName = [first_name, last_name].filter(Boolean).join(' ') || '—';
  const subjectName = first_name || last_name || 'a new athlete';

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
    if (parent_email) {
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
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send emails' });
  }
};
