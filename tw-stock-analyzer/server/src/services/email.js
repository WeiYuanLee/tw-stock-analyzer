import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter (configure for production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'testpassword'
  }
});

export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"台股分析系統" <noreply@twstock.com>',
    to: email,
    subject: '【台股分析系統】Email 驗證',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">台股分析系統 - Email 驗證</h2>
        <p>您好，感謝您註冊台股分析系統！</p>
        <p>請點擊以下連結進行 Email 驗證：</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">驗證 Email</a>
        <p>或複製以下連結到瀏覽器：</p>
        <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
        <p style="color: #9ca3af; font-size: 12px;">此連結將於 24 小時後失效</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    // For development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"台股分析系統" <noreply@twstock.com>',
    to: email,
    subject: '【台股分析系統】密碼重設',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">台股分析系統 - 密碼重設</h2>
        <p>您好，我們收到您的密碼重設請求。</p>
        <p>請點擊以下連結重設密碼：</p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">重設密碼</a>
        <p>或複製以下連結到瀏覽器：</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <p style="color: #9ca3af; font-size: 12px;">此連結將於 1 小時後失效，請盡快完成重設。</p>
        <p style="color: #9ca3af; font-size: 12px;">如果您沒有請求重設密碼，請忽略此郵件。</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}
