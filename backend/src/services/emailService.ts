import dotenv from 'dotenv';
dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_AusrQFcF_E5gfZ55ocLrLdpgNBSEjF33L';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const DISABLE_EMAIL_SERVICE = process.env.DISABLE_EMAIL_SERVICE !== 'false'; // defaults to true (disabled) unless explicitly set to 'false'
const IS_SANDBOX_MODE = process.env.IS_SANDBOX_MODE !== 'false'; // defaults to true (sandbox mode) unless explicitly set to 'false'
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'AnyTeam Attendance <onboarding@resend.dev>';

/**
 * Sends a check-in confirmation email to the member using the Resend platform API.
 * 
 * @param memberEmail The email address of the checking-in member.
 * @param memberName The name of the checking-in member.
 */
export async function sendCheckInEmail(memberEmail: string, memberName: string): Promise<any> {
  if (!memberEmail) {
    console.error('[EmailService] Recipient email is missing. Cannot send check-in email.');
    return;
  }

  if (DISABLE_EMAIL_SERVICE) {
    console.log(`[EmailService] [TEMPORARILY DISABLED] Simulated sending check-in email to ${memberName} (${memberEmail}).`);
    return { id: 'mock-checkin-disabled', message: 'Email sending is temporarily disabled.' };
  }

  let finalRecipient = memberEmail;
  let subjectPrefix = '';
  let testNoticeHtml = '';

  // Resend sandbox key only allows sending to the owner: sojanonelson54@gmail.com
  if (IS_SANDBOX_MODE && memberEmail.toLowerCase() !== 'sojanonelson54@gmail.com') {
    finalRecipient = 'sojanonelson54@gmail.com';
    subjectPrefix = `[Test for ${memberName}] `;
    testNoticeHtml = `
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
        <strong>Sandbox Test Mode Notice:</strong> This email was originally intended for <strong>${memberName}</strong> (${memberEmail}). Since the system is currently using a Resend sandbox account (onboarding@resend.dev), the message has been routed to the verified owner account (sojanonelson54@gmail.com).
      </div>
    `;
  }

  console.log(`[EmailService] Attempting to send check-in confirmation email to ${memberName} <${finalRecipient}> (original: <${memberEmail}>)...`);

  try {
    const payload = {
      from: SENDER_EMAIL,
      to: finalRecipient,
      subject: `${subjectPrefix}${memberName}, Check-In Successful!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Check-In Successful</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f3f4f6;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #ffffff;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
              overflow: hidden;
              border: 1px solid #e5e7eb;
            }
            .header {
              background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
              padding: 30px 20px;
              text-align: center;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
              letter-spacing: -0.5px;
            }
            .content {
              padding: 40px 30px;
              color: #374151;
              line-height: 1.6;
            }
            .content p {
              margin-top: 0;
              margin-bottom: 20px;
              font-size: 16px;
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .btn {
              background-color: #4f46e5;
              color: #ffffff !important;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 16px;
              display: inline-block;
              transition: background-color 0.2s;
              box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
            }
            .btn:hover {
              background-color: #4338ca;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #f3f4f6;
              font-size: 12px;
              color: #9ca3af;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Check-In Confirmed</h1>
            </div>
            <div class="content">
              ${testNoticeHtml}
              <p>Hi <strong>${memberName}</strong>,</p>
              <p>Your attendance check-in has been successfully recorded for today.</p>
              <p>Keep up the great work! You can view your detailed logs and download your certificates directly from your attendance portal.</p>
              <div class="button-container">
                <a href="${FRONTEND_URL}/?view=member&tab=report" class="btn">view your attendance report</a>
              </div>
              <p style="margin-bottom: 0;">Best regards,<br><strong>AnyTeam Admin Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} AnyTeam Attendance System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[EmailService] Check-in email sent successfully to ${memberName} (${memberEmail})`, data);
      return data;
    } else {
      console.error('[EmailService] Resend API returned an error:', data);
      throw new Error(data.message || 'Failed to send email via Resend');
    }
  } catch (error: any) {
    console.error('[EmailService] Failed to send email:', error);
    throw error;
  }
}

/**
 * Sends a test confirmation email to the administrator to verify that the Resend API is working.
 */
export async function sendTestEmail(adminEmail: string, adminUsername: string): Promise<any> {
  if (!adminEmail) {
    throw new Error('Recipient admin email is missing');
  }

  if (DISABLE_EMAIL_SERVICE) {
    console.log(`[EmailService] [TEMPORARILY DISABLED] Simulated sending test email to administrator ${adminUsername} (${adminEmail}).`);
    return { id: 'mock-test-disabled', message: 'Email sending is temporarily disabled.' };
  }

  let finalRecipient = adminEmail;
  let subjectPrefix = '';
  let testNoticeHtml = '';

  if (IS_SANDBOX_MODE && adminEmail.toLowerCase() !== 'sojanonelson54@gmail.com') {
    finalRecipient = 'sojanonelson54@gmail.com';
    subjectPrefix = `[Test for Admin: ${adminUsername}] `;
    testNoticeHtml = `
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
        <strong>Sandbox Test Mode Notice:</strong> This test email was originally intended for administrator <strong>${adminUsername}</strong> (${adminEmail}). Since the system is currently using a Resend sandbox account, the message has been routed to the verified owner account (sojanonelson54@gmail.com).
      </div>
    `;
  }

  console.log(`[EmailService] Attempting to send test email to administrator ${adminUsername} <${finalRecipient}> (original: <${adminEmail}>)...`);

  try {
    const payload = {
      from: SENDER_EMAIL,
      to: finalRecipient,
      subject: `${subjectPrefix}Test Email Service - ${adminUsername}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>AnyTeam Email Service Test</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background-color: #f3f4f6; 
              margin: 0; 
              padding: 40px 20px; 
            }
            .card { 
              background: #ffffff; 
              padding: 40px; 
              border-radius: 12px; 
              max-width: 500px; 
              margin: 0 auto; 
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); 
              border: 1px solid #e5e7eb;
              color: #374151;
            }
            h2 { 
              color: #4f46e5; 
              margin-top: 0; 
              font-size: 22px; 
              font-weight: 600;
            }
            .badge { 
              background: #d1fae5; 
              color: #065f46; 
              padding: 8px 16px; 
              border-radius: 6px; 
              font-weight: bold; 
              font-size: 14px;
              display: inline-block; 
              margin: 15px 0; 
            }
            p {
              line-height: 1.6;
              font-size: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            ${testNoticeHtml}
            <h2>AnyTeam Email Service Test Successful</h2>
            <p>Hello <strong>${adminUsername}</strong>,</p>
            <p>This is a test email sent from the AnyTeam Attendance backend to verify that the Resend Email Integration is fully functional.</p>
            <div class="badge">Integration Status: Active</div>
            <p>Everything is configured correctly. Check-in notifications will be sent to team members automatically as they scan dynamic QR codes.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin-top: 30px; margin-bottom: 20px;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">AnyTeam Attendance System - Resend Integration</p>
          </div>
        </body>
        </html>
      `
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[EmailService] Test email sent successfully to ${adminUsername} (${adminEmail})`, data);
      return data;
    } else {
      console.error('[EmailService] Resend API returned an error for test email:', data);
      throw new Error(data.message || 'Failed to send test email via Resend');
    }
  } catch (error: any) {
    console.error('[EmailService] Failed to send test email:', error);
    throw error;
  }
}
