const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Use App Password, not regular password
    }
  });
};

// Send OTP via Email
const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Glamhub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Glamhub Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e91e63; }
            .otp-box { background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 10px; text-align: center; margin: 30px 0; }
            .message { color: #333; font-size: 16px; line-height: 1.6; text-align: center; }
            .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
            .warning { color: #ff5722; font-size: 14px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Glamhub</div>
            </div>
            <p class="message">Hi ${userName},</p>
            <p class="message">Your verification code is:</p>
            <div class="otp-box">${otp}</div>
            <p class="message">This code will expire in <strong>10 minutes</strong>.</p>
            <p class="warning">⚠️ Don't share this code with anyone!</p>
            <div class="footer">
              <p>This is an automated message from Glamhub.</p>
              <p>If you didn't request this code, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send Welcome Email
const sendWelcomeEmail = async (email, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Glamhub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Glamhub! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e91e63; }
            .message { color: #333; font-size: 16px; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Glamhub</div>
            </div>
            <p class="message">Hi ${userName},</p>
            <p class="message">Welcome to Glamhub! We're excited to have you on board.</p>
            <p class="message">Book your dream bridal look in minutes with our amazing artists!</p>
            <center><a href="${process.env.FRONTEND_URL}" class="button">Start Exploring</a></center>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Welcome email error:', error);
    return { success: false, error: error.message };
  }
};

// Send Artist Registration Notification to Admin
const sendArtistRegistrationNotification = async (adminEmail, artistData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Glamhub" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'New Artist Registration - Approval Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e91e63; }
            .message { color: #333; font-size: 16px; line-height: 1.6; }
            .info-box { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .button { display: inline-block; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Glamhub</div>
            </div>
            <p class="message">Hello Admin,</p>
            <p class="message">A new artist has registered and is awaiting your approval.</p>
            <div class="info-box">
              <div class="info-row"><span class="label">Name:</span> ${artistData.firstName} ${artistData.lastName}</div>
              <div class="info-row"><span class="label">Username:</span> ${artistData.username}</div>
              <div class="info-row"><span class="label">Email:</span> ${artistData.email || 'Not provided'}</div>
              <div class="info-row"><span class="label">Phone:</span> ${artistData.phone || 'Not provided'}</div>
              <div class="info-row"><span class="label">City:</span> ${artistData.city || 'Not provided'}</div>
              <div class="info-row"><span class="label">Registration Date:</span> ${new Date(artistData.createdAt).toLocaleDateString()}</div>
            </div>
            <p class="message">Please review the artist's profile and approve or reject their registration.</p>
            <center><a href="${process.env.FRONTEND_URL || process.env.ADMIN_URL || '#'}/admin/artists" class="button">Review Artist</a></center>
            <div class="footer">
              <p>This is an automated notification from Glamhub Admin Panel.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Artist registration notification email error:', error);
    return { success: false, error: error.message };
  }
};

// Send Artist Approval Status Email
const sendArtistApprovalStatusEmail = async (artistEmail, artistName, status, rejectionReason = '') => {
  try {
    const transporter = createTransporter();

    const isApproved = status === 'approved';
    const subject = isApproved 
      ? 'Your Artist Account Has Been Approved! 🎉' 
      : 'Artist Account Review Update';

    const mailOptions = {
      from: `"Glamhub" <${process.env.EMAIL_USER}>`,
      to: artistEmail,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #e91e63; }
            .message { color: #333; font-size: 16px; line-height: 1.6; }
            .status-box { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .approved { background-color: #e8f5e9; color: #2e7d32; }
            .rejected { background-color: #ffebee; color: #c62828; }
            .button { display: inline-block; background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ Glamhub</div>
            </div>
            <p class="message">Hi ${artistName},</p>
            ${isApproved 
              ? `<div class="status-box approved">
                  <h2>🎉 Congratulations!</h2>
                  <p>Your artist account has been approved by our admin team.</p>
                  <p>You can now start accepting bookings and showcasing your services!</p>
                </div>
                <center><a href="${process.env.FRONTEND_URL}" class="button">Go to Dashboard</a></center>`
              : `<div class="status-box rejected">
                  <h2>Account Review Update</h2>
                  <p>Unfortunately, your artist account registration has been rejected.</p>
                  ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
                  <p>If you believe this is an error, please contact our support team.</p>
                </div>`
            }
            <div class="footer">
              <p>This is an automated message from Glamhub.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Artist approval status email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  sendOTPEmail, 
  sendWelcomeEmail, 
  sendArtistRegistrationNotification,
  sendArtistApprovalStatusEmail
};

