require('dotenv').config();
const nodemailer = require('nodemailer');
const { secret } = require('./secret');

// sendEmail
module.exports.sendEmail = (body, res, message) => {
  // Add essential email headers to improve deliverability
  const enhancedBody = {
    ...body,
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      Importance: 'High',
      'X-Mailer': 'EWO Mailer',
      // Prevents auto-replies from mail servers
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  const transporter = nodemailer.createTransport({
    host: secret.email_host,
    service: secret.email_service, //comment this line if you use custom server/domain
    port: secret.email_port,
    secure: true,
    auth: {
      user: secret.email_user,
      pass: secret.email_pass,
    },
    // Add DKIM if available
    ...(secret.dkim_private_key && {
      dkim: {
        domainName: secret.email_domain || secret.email_user.split('@')[1],
        keySelector: 'default',
        privateKey: secret.dkim_private_key,
      },
    }),
  });

  transporter.verify(function (err, success) {
    if (err) {
      res.status(403).send({
        message: `Error happen when verify ${err.message}`,
      });
      console.log(err.message);
    } else {
      console.log('Server is ready to take our messages');
    }
  });

  transporter.sendMail(enhancedBody, (err, data) => {
    if (err) {
      res.status(403).send({
        message: `Error happen when sending email ${err.message}`,
      });
    } else {
      res.send({
        message: message,
      });
    }
  });
};
