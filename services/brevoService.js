import PDFDocument from 'pdfkit';

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

/**
 * Helper to generate a PDF receipt in-memory using pdfkit
 */
export const generateInvoicePDF = (order, itemDetails, shippingAddress, paymentMethod) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- Draw header ---
      // Logo text
      doc.fillColor('#db2777').fontSize(26).text('Mehr Zari', 50, 45, { align: 'left' });
      doc.fillColor('#6b7280').fontSize(10).text('Premium Women\'s Fashion', 50, 75);
      
      // Invoice title
      doc.fillColor('#1f2937').fontSize(20).text('INVOICE / SLIP', 200, 45, { align: 'right' });
      doc.fillColor('#4b5563').fontSize(9)
         .text(`Order Number: ${order.order_number}`, 200, 75, { align: 'right' })
         .text(`Date: ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}`, 200, 90, { align: 'right' })
         .text(`Payment: ${paymentMethod}`, 200, 105, { align: 'right' });

      // Draw a line
      doc.moveTo(50, 130).lineTo(550, 130).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // --- Shipping Info ---
      doc.fillColor('#1f2937').fontSize(12).text('Shipping Details', 50, 150, { underline: true });
      doc.fillColor('#4b5563').fontSize(10)
         .text(`Name: ${shippingAddress.fullName}`, 50, 175)
         .text(`Phone: +91 ${shippingAddress.phone}`, 50, 190)
         .text(`Email: ${shippingAddress.email}`, 50, 205)
         .text(`Address: ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zipCode}`, 50, 220, { width: 500 });

      // Draw a line
      doc.moveTo(50, 260).lineTo(550, 260).strokeColor('#e5e7eb').lineWidth(1).stroke();

      // --- Product Table ---
      let y = 280;
      doc.fillColor('#1f2937').fontSize(12).text('Order Summary', 50, y);
      y += 25;

      // Table Header
      doc.fillColor('#475569').fontSize(9)
         .text('Product Description', 50, y, { bold: true })
         .text('Qty', 350, y, { width: 30, align: 'right' })
         .text('Price', 400, y, { width: 60, align: 'right' })
         .text('Total', 480, y, { width: 70, align: 'right' });
      
      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      y += 25;

      // Table Rows
      doc.fillColor('#334155').fontSize(9);
      for (const item of itemDetails) {
        const nameHeight = doc.heightOfString(item.product_name, { width: 280 });
        doc.text(item.product_name, 50, y, { width: 280 })
           .text(item.qty.toString(), 350, y, { width: 30, align: 'right' })
           .text(`₹${parseFloat(item.selling_price || 0).toLocaleString('en-IN')}`, 400, y, { width: 60, align: 'right' })
           .text(`₹${(item.qty * parseFloat(item.selling_price || 0)).toLocaleString('en-IN')}`, 480, y, { width: 70, align: 'right' });
        
        y += Math.max(nameHeight, 15) + 10;
        doc.moveTo(50, y - 5).lineTo(550, y - 5).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      }

      y += 10;

      // --- Summary Calculations ---
      const totalAmount = parseFloat(order.grand_total || 0);
      const discountAmount = parseFloat(order.total_discount || 0);
      
      doc.fillColor('#4b5563').fontSize(9)
         .text('Subtotal:', 350, y, { width: 100, align: 'left' })
         .text(`₹${parseFloat(order.subtotal || 0).toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
      
      if (discountAmount > 0) {
        y += 18;
        doc.text('Discount:', 350, y, { width: 100, align: 'left' })
           .text(`-₹${discountAmount.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });
      }

      y += 18;
      doc.text('Shipping:', 350, y, { width: 100, align: 'left' })
         .text('FREE', 450, y, { width: 100, align: 'right' });

      y += 20;
      doc.moveTo(350, y - 5).lineTo(550, y - 5).strokeColor('#e2e8f0').lineWidth(1).stroke();
      
      doc.fillColor('#db2777').fontSize(12)
         .text('Grand Total:', 350, y, { bold: true })
         .text(`₹${totalAmount.toLocaleString('en-IN')}`, 450, y, { width: 100, align: 'right' });

      // --- Footer ---
      doc.fillColor('#94a3b8').fontSize(9)
         .text('Managed by weemakes.com', 50, 735, { align: 'center' });
      
      doc.fillColor('#db2777').fontSize(11).font('Helvetica-Bold')
         .text('mehrzari.in', 50, 755, { align: 'center', link: 'https://mehrzari.in', underline: true });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
};

/**
 * Send Order Receipt PDF to User and Admin
 */
export const sendOrderReceiptEmail = async (order, itemDetails, shippingAddress, paymentMethod) => {
  const apiKey = process.env.BREVO_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const senderEmail = process.env.SENDER_EMAIL || adminEmail || 'noreply@milanecom.com';
  const senderName = process.env.SENDER_NAME || 'Mehr Zari';

  if (!apiKey || apiKey === 'your_brevo_api_key_here' || !adminEmail || adminEmail === 'your_admin_email@example.com') {
    console.log('⚠️ [Brevo Email] BREVO_API_KEY or ADMIN_NOTIFICATION_EMAIL is missing/placeholder in .env. Email notification skipped.');
    return { success: false, reason: 'Credentials not configured in .env' };
  }

  try {
    // 1. Generate PDF
    const pdfBuffer = await generateInvoicePDF(order, itemDetails, shippingAddress, paymentMethod);
    const base64Pdf = pdfBuffer.toString('base64');

    // 2. Prepare recipients list
    const recipients = [
      { email: shippingAddress.email, name: shippingAddress.fullName },
      { email: adminEmail, name: 'Mehr Zari Admin' }
    ];

    // 3. Send via Brevo
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: recipients,
        subject: `🛒 Order Confirmation - Order #${order.order_number}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #db2777, #ec4899); padding: 24px; border-radius: 8px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 22px; font-weight: bold;">Mehr Zari</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Timeless Rajasthani Saree Elegance</p>
            </div>
            
            <div style="padding: 24px 8px 12px 8px; color: #1e293b;">
              <h2 style="font-size: 18px; margin-bottom: 12px; color: #db2777;">Order Placed Successfully!</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for shopping with us. We have received your order <strong>#${order.order_number}</strong> and it is being processed.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                We have generated a detailed digital PDF receipt for this transaction. You can find it attached to this email.
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #f1f5f9;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; width: 40%; color: #64748b;">Order Number:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #db2777;">#${order.order_number}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; color: #64748b;">Grand Total:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #334155;">₹${parseFloat(order.grand_total).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-align: left; color: #64748b;">Payment Method:</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; color: #334155;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-weight: 600; text-align: left; color: #64748b;">Delivery Address:</td>
                  <td style="padding: 12px 16px; color: #334155;">${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zipCode}</td>
                </tr>
              </table>
            </div>
            
            <div style="border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11px;">
              <p style="margin: 0 0 4px 0;">Managed by <a href="https://weemakes.com" style="color: #4f46e5; text-decoration: none; font-weight: bold;">weemakes.com</a></p>
              <p style="margin: 0;"><a href="https://mehrzari.com" style="color: #db2777; text-decoration: none; font-weight: bold;">mehrzari.com</a></p>
            </div>
          </div>
        `,
        attachment: [
          {
            content: base64Pdf,
            name: `Invoice_${order.order_number}.pdf`
          }
        ]
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ [Brevo Email] Order receipt sent successfully to client & admin! MessageID:', data.messageId);
      return { success: true, messageId: data.messageId };
    } else {
      console.error('❌ [Brevo Email] Brevo SMTP Error:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error('❌ [Brevo Email] Exception while sending order receipt email:', error);
    return { success: false, error: error.message };
  }
};
