/**
 * Brevo (formerly Sendinblue) Transactional Email Service
 */
export const sendCouponClaimedEmail = async ({ customerContact, couponCode = 'WELCOME10', source = 'POPUP_10OFF' }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL || adminEmail || 'noreply@milanecom.com';
  const senderName = process.env.SENDER_NAME || 'Milan E-Commerce';

  if (!apiKey || apiKey === 'your_brevo_api_key_here' || !adminEmail || adminEmail === 'your_admin_email@example.com') {
    console.log('⚠️ [Brevo Email] BREVO_API_KEY or ADMIN_NOTIFICATION_EMAIL is missing/placeholder in .env. Email notification skipped.');
    return { success: false, reason: 'Credentials not configured in .env' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: adminEmail }],
        subject: `🎟️ New Coupon Claimed: ${couponCode} by ${customerContact}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #4f46e5, #ec4899); padding: 24px; border-radius: 8px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px; font-weight: bold;">🎉 New Coupon Claimed!</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">A user just requested a discount coupon on your store.</p>
            </div>
            
            <div style="padding: 24px 8px 12px 8px; color: #1e293b;">
              <p style="font-size: 15px; margin-bottom: 20px;">Hello Admin,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">Here are the details of the customer who claimed the discount offer:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #f1f5f9;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; width: 40%; color: #64748b;">Customer Contact:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4f46e5;">${customerContact}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; color: #64748b;">Coupon Code:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-family: monospace; font-size: 15px;">${couponCode}</span></td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; color: #64748b;">Source Campaign:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">${source}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 600; text-align: left; color: #64748b;">Claimed At:</td>
                  <td style="padding: 12px 16px; color: #334155;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              </table>
              
              <div style="margin-top: 24px; padding: 12px; background-color: #f1f5f9; border-radius: 6px; text-align: center; text-decoration: none;">
                <span style="font-size: 13px; color: #64748b;">View all coupon leads directly in your <strong style="color: #4f46e5;">Admin Dashboard</strong>.</span>
              </div>
            </div>
            
            <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">Automated Notification Service • Milan E-Commerce Backend</p>
            </div>
          </div>
        `
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ [Brevo Email] Notification sent successfully! MessageID:', data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      console.error('❌ [Brevo Email] Brevo API Error:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ [Brevo Email] Exception while sending email:', error);
    return { success: false, error: error.message };
  }
};
