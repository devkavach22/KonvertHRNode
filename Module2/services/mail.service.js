const nodemailer = require("nodemailer");

class MailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      secure: process.env.MAIL_SECURE === "true",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendMail(to, subject, html) {
    try {
      await this.transporter.sendMail({
        from: `"Kavach Global Pvt Ltd" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error("Email send error:", error);
      return false;
    }
  }
}

module.exports = new MailService();
