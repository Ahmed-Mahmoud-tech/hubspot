const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@clearroot.cloud',
    pass: '0100831450@App',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

console.log('🔍 Testing SMTP connection to mail.privateemail.com:465...');
console.log('This test simulates what Railway will experience...\n');

transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ SMTP Connection FAILED:');
    console.error(error.message);
    console.error('\nThis means Railway will also fail to connect.');
    console.error('Solution: Use Resend, Brevo, or Mailgun for Railway deployment.');
  } else {
    console.log('✅ SMTP Connection SUCCESSFUL!');
    console.log('Your email configuration should work on Railway.');
    
    // Try sending a test email
    transporter.sendMail({
      from: 'ClearRoot <contact@clearroot.cloud>',
      to: 'contact@clearroot.cloud',
      subject: 'Test Email from Local',
      text: 'If you receive this, SMTP is working!',
    })
    .then(() => {
      console.log('✅ Test email sent successfully!');
    })
    .catch((err) => {
      console.error('❌ Failed to send test email:', err.message);
    });
  }
});
