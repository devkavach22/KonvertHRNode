const odooService = require("../services/odoo.service");
const mailService = require("../services/mail.service");
const crypto = require("crypto");

module.exports = {
async createInvoiceAndPay(req, res) {
  console.log(".......Invoice & Payment Process Started ........");
  try {
    const { user_id, product_id, transection_number, price_unit } = req.body;
    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "user_id is required",
      });
    }

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: "product_id is required",
      });
    }

    if (!transection_number) {
      return res.status(400).json({
        success: false,
        error: "transection_number is required",
      });
    }

    if (!price_unit || price_unit <= 0) {
      return res.status(400).json({
        success: false,
        error: "price_unit must be greater than 0",
      });
    }

    console.log("🔍 Step 1: Fetching admin user's default company...");
    const adminUser = await odooService.searchRead(
      "res.users",
      [["login", "=", process.env.ODOO_ADMIN]],
      ["id", "company_id"]
    );

    if (!adminUser.length) {
      return res.status(500).json({
        success: false,
        error: "Admin user configuration error. Please contact support.",
      });
    }

    const adminCompanyId = adminUser[0].company_id?.[0];

    if (!adminCompanyId) {
      return res.status(500).json({
        success: false,
        error: "Admin company not found. Please contact support.",
      });
    }

    console.log("✅ Admin Company ID found:", adminCompanyId);
    console.log("🔍 Step 2: Fetching partner_id from user_id...");
    const userRecord = await odooService.searchRead(
      "res.users",
      [["id", "=", user_id]],
      ["id", "partner_id"]
    );

    if (!userRecord.length) {
      return res.status(404).json({
        success: false,
        error: "User not found. Please check user_id.",
      });
    }

    const partner_id = userRecord[0].partner_id?.[0];

    if (!partner_id) {
      return res.status(404).json({
        success: false,
        error: "Partner not linked to this user. Please contact support.",
      });
    }

    console.log("✅ Partner ID found:", partner_id);

    console.log("🔍 Step 3: Validating product_id...");
    const productExists = await odooService.searchRead(
      "product.product",
      [["id", "=", product_id]],
      ["id", "name"]
    );

    if (!productExists.length) {
      return res.status(404).json({
        success: false,
        error: "Product not found. Please check product_id.",
      });
    }

    console.log("✅ Product validated:", productExists[0].name);

    const todayDate = new Date().toISOString().split("T")[0];

    console.log("📄 Step 4: Creating invoice...");
    const invoiceData = {
      move_type: "out_invoice",
      partner_id,
      invoice_date: todayDate,
      invoice_date_due: todayDate,
      invoice_line_ids: [[0, 0, { product_id, quantity: 1, price_unit }]],
      transection_number: transection_number || "",
    };

    const invoice_id = await odooService.create("account.move", invoiceData);

    if (!invoice_id) {
      return res.status(500).json({
        success: false,
        error: "Failed to create invoice. Please try again.",
      });
    }

    console.log("✅ Invoice created with ID:", invoice_id);

    console.log("✔️ Step 5: Confirming invoice...");
    try {
      await odooService.callMethod("account.move", "action_post", [
        invoice_id,
      ]);
      console.log("✅ Invoice confirmed");
    } catch (confirmError) {
      console.error("Invoice confirmation error:", confirmError);
      return res.status(500).json({
        success: false,
        error: "Failed to confirm invoice.",
        details: confirmError.message,
        invoice_id,
      });
    }

    console.log("💳 Step 6: Triggering payment action...");
    try {
      await odooService.callMethod(
        "account.move",
        "action_register_payment",
        [invoice_id]
      );
      console.log("✅ Payment method called");
    } catch (paymentTriggerError) {
      console.error("Payment trigger error:", paymentTriggerError);
    }

    console.log("🔍 Step 7: Fetching invoice details...");
    const invoiceDetails = await odooService.execute("account.move", "read", [
      [invoice_id],
      [
        "amount_residual",
        "amount_total",
        "partner_id",
        "name",
        "company_id",
        "invoice_line_ids",
      ],
    ]);

    if (!invoiceDetails.length) {
      return res.status(500).json({
        success: false,
        error: "Invoice created but details not found.",
        invoice_id,
      });
    }

    const invoice = invoiceDetails[0];

    console.log("🔍 Step 8: Finding journal_id from admin's company...");
    const journals = await odooService.execute(
      "account.journal",
      "search_read",
      [
        [
          ["type", "=", "bank"],
          ["company_id", "=", adminCompanyId],
        ],
        ["id", "name", "type", "company_id"],
      ]
    );

    if (!journals.length) {
      return res.status(500).json({
        success: false,
        error:
          "No bank journal configured for this company. Please contact support.",
        invoice_id,
      });
    }

    const journal_id = journals[0].id;
    console.log(
      "✅ Journal ID found:",
      journal_id,
      "| Company:",
      journals[0].company_id
    );

    console.log(
      "🔍 Step 9: Finding payment_method_line_id from admin's company journal..."
    );
    const paymentMethods = await odooService.execute(
      "account.payment.method.line",
      "search_read",
      [
        [
          ["journal_id", "=", journal_id],
          ["payment_type", "=", "inbound"],
        ],
        ["id", "name", "payment_type", "journal_id"],
      ]
    );

    if (!paymentMethods.length) {
      return res.status(500).json({
        success: false,
        error:
          "No inbound payment method configured. Please contact support.",
        invoice_id,
        journal_id,
      });
    }

    const payment_method_line_id = paymentMethods[0].id;
    console.log("✅ Payment Method Line ID found:", payment_method_line_id);

    console.log("💰 Step 10: Creating payment...");
    const paymentAmount =
      invoice.amount_residual || invoice.amount_total || price_unit;
    console.log("💵 Payment amount to be paid:", paymentAmount);

    // ✅ FIXED: Wrap active_model parameters inside context object
    const paymentRegisterId = await odooService.create(
      "account.payment.register",
      {
        amount: paymentAmount,
        journal_id,
        payment_method_line_id,
        payment_date: todayDate,
        communication: transection_number,
      },
      {
        context: {
          active_model: "account.move",
          active_ids: [invoice_id],
          active_id: invoice_id,
        }
      }
    );

    if (!paymentRegisterId) {
      return res.status(500).json({
        success: false,
        error: "Failed to register payment.",
        invoice_id,
      });
    }

    console.log("✅ Payment register created:", paymentRegisterId);

    const paymentResult = await odooService.callMethod(
      "account.payment.register",
      "action_create_payments",
      [paymentRegisterId],
      {
        active_model: "account.move",
        active_ids: [invoice_id],
        active_id: invoice_id,
      }
    );

    if (!paymentResult || !paymentResult.res_id) {
      return res.status(500).json({
        success: false,
        error: "Payment creation failed.",
        invoice_id,
      });
    }

    try {
      await odooService.execute("account.payment", "write", [
        [paymentResult.res_id],
        { payment_reference: transection_number },
      ]);
      console.log("✅ Payment created successfully");
    } catch (writeError) {
      console.error("Payment reference update error:", writeError);
    }

    console.log("📧 Step 11: Fetching partner email...");
    const partner = await odooService.execute("res.partner", "read", [
      [partner_id],
      ["email", "name"],
    ]);

    const email = partner[0]?.email;
    const customerName = partner[0]?.name || "Customer";

    const secretKey = crypto.randomBytes(16).toString("hex").toUpperCase();

    let emailSent = false;
    if (email) {
      try {
        console.log("📧 Sending confirmation email...");
        const subject =
          "Payment Confirmation - Kavach Global Konnects Pvt Ltd";
        const loginUrl = "http://localhost:3001/KHR-plan-activation";

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Green Header Bar -->
          <tr><td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); height: 8px;"></td></tr>
          
          <tr>
            <td style="padding: 50px 60px;">
              <!-- Title -->
              <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 600; color: #1a1a1a;">Payment Confirmed! ✓</h1>
              <p style="margin: 0 0 30px 0; font-size: 14px; color: #4CAF50; font-weight: 600;">Transaction Successful</p>
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hi ${customerName},</p>
              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Thank you for your payment! We're pleased to confirm that your payment for invoice <strong>${
                  invoice.name
                }</strong> has been successfully processed.
              </p>
              
              <!-- Payment Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;">Payment Details</p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="font-size: 15px; color: #666; padding: 8px 0;">Invoice Number:</td>
                        <td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right; padding: 8px 0;">${
                          invoice.name
                        }</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #666; padding: 8px 0;">Transaction Number:</td>
                        <td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right; padding: 8px 0;">${transection_number}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #666; padding: 8px 0;">Amount Paid:</td>
                        <td style="font-size: 15px; color: #4CAF50; font-weight: 700; text-align: right; padding: 8px 0;">₹${paymentAmount.toFixed(
                          2
                        )}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #666; padding: 8px 0;">Payment Date:</td>
                        <td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right; padding: 8px 0;">${new Date().toLocaleDateString(
                          "en-IN",
                          { year: "numeric", month: "long", day: "numeric" }
                        )}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #666; padding: 8px 0;">Payment ID:</td>
                        <td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right; padding: 8px 0;">#${
                          paymentResult.res_id
                        }</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Secret Key Section -->
              <p style="margin: 30px 0 15px 0; font-size: 16px; line-height: 1.6; color: #333333;">Your secure verification key:</p>
              <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); border-left: 4px solid #ffc107; padding: 25px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #856404; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">🔐 Secret Key</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #856404; letter-spacing: 3px; font-family: 'Courier New', monospace; word-break: break-all;">${secretKey}</p>
              </div>
              
              <!-- Login Instructions Section -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 4px solid #2196F3; border-radius: 6px; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1565c0;">🚀 Next Steps - Access Your Account</p>
                    <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; color: #1976d2;">
                      To access your account and view your services, please follow these simple steps:
                    </p>
                    <ol style="margin: 0 0 15px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #1976d2;">
                      <li style="margin-bottom: 8px;">Click the login button below</li>
                      <li style="margin-bottom: 8px;">Enter your secret key on the login page</li>
                      <li style="margin-bottom: 0;">Start using your services immediately</li>
                    </ol>
                    
                    <!-- Login Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 15px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);">
                            🔓 Login to Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 15px 0 0 0; font-size: 13px; line-height: 1.6; color: #1565c0; text-align: center;">
                      Or copy and paste this URL in your browser:<br>
                      <a href="${loginUrl}" style="color: #1976d2; text-decoration: underline; word-break: break-all;">${loginUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #f44336; border-radius: 6px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #c62828;">
                      <strong>⚠️ Important:</strong> Please keep your secret key safe and confidential. You will need it to log in to your account. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Support Section -->
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                If you have any questions about this payment or face any issues logging in, please don't hesitate to contact our support team.
              </p>
              
              <!-- Signature -->
              <p style="margin: 40px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>Best regards,<br>Kavach Global Konnects Pvt Ltd</strong>
              </p>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e0e0e0; margin: 40px 0 30px 0;"></div>
              
              <!-- Footer Note -->
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #999999; text-align: center;">
                This is an automated message, please do not reply to this email.<br>
                For support, contact us at <a href="mailto:support@kavachglobal.com" style="color: #4CAF50; text-decoration: none;">support@kavachglobal.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Green Footer Bar -->
          <tr><td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); height: 8px;"></td></tr>
        </table>
        
        <!-- Copyright Footer -->
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #999999;">
                © ${new Date().getFullYear()} Kavach Global Konnects Pvt Ltd. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                <a href="#" style="color: #4CAF50; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                <a href="#" style="color: #4CAF50; text-decoration: none; margin: 0 10px;">Terms of Service</a> | 
                <a href="#" style="color: #4CAF50; text-decoration: none; margin: 0 10px;">Contact Us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

        emailSent = await mailService.sendMail(email, subject, htmlContent);
        console.log("✅ Email sent status:", emailSent);
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError);
      }
    } else {
      console.log(
        "⚠️ No email found for partner, skipping email notification"
      );
    }

    let clientPlanId = null;
    try {
      console.log("📋 Step 12: Creating client plan details...");
      const clientPlanData = {
        partner_id: partner_id,
        product_id: product_id,
        secret_key: secretKey,
        start_date: todayDate,
      };

      clientPlanId = await odooService.create(
        "client.plan.details",
        clientPlanData
      );
      console.log(
        "✅ Client plan details stored successfully:",
        clientPlanId
      );
    } catch (planError) {
      console.error("❌ Error storing client plan details:", planError);
    }

    return res.status(201).json({
      success: true,
      message:
        "Invoice created, confirmed, and payment processed successfully",
      data: {
        invoice_id,
        invoice_name: invoice.name,
        partner_id,
        admin_company_id: adminCompanyId,
        amount_paid: paymentAmount,
        payment_id: paymentResult.res_id,
        transection_number,
        journal_id,
        payment_method_line_id,
        payment_date: todayDate,
        secret_key: secretKey,
        client_plan_id: clientPlanId,
        email_sent: emailSent,
      },
    });
  } catch (error) {
    console.error("❌ Error in invoice & payment process:", error);

    if (error.message && error.message.includes("XMLRPC")) {
      return res.status(503).json({
        success: false,
        error: "Unable to connect to Odoo server. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      error:
        "An unexpected error occurred during invoice and payment processing.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
},


async downloadInvoicePDF(req, res) {
  try {
    const { invoice_id } = req.body;
    if (!invoice_id) {
      return res.status(400).json({
        success: false,
        error: "invoice_id is required",
      });
    }

    console.log("📄 Generating PDF for invoice ID:", invoice_id);

    const invoiceExists = await odooService.searchRead(
      "account.move",
      [["id", "=", invoice_id]],
      ["id", "name", "state"]
    );

    if (!invoiceExists || invoiceExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
    }

    const invoice = invoiceExists[0];
    if (invoice.state !== "posted") {
      return res.status(400).json({
        success: false,
        error: "Invoice must be confirmed/posted to generate PDF",
        current_state: invoice.state,
      });
    }

    const axios = require('axios');
        const loginResponse = await axios.post(
      `${process.env.ODOO_URL}/web/session/authenticate`,
      {
        jsonrpc: "2.0",
        params: {
          db: process.env.ODOO_DB,
          login: process.env.ODOO_ADMIN,
          password: process.env.ODOO_ADMIN_PASSWORD,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const sessionId = loginResponse.headers['set-cookie'];
    const pdfResponse = await axios.get(
      `${process.env.ODOO_URL}/report/pdf/account.report_invoice/${invoice_id}`,
      {
        headers: {
          Cookie: sessionId,
        },
        responseType: 'arraybuffer',
      }
    );

    const pdfBuffer = Buffer.from(pdfResponse.data);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Invoice_${invoice.name.replace(/\//g, "_")}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    console.log("✅ PDF generated successfully");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ Error generating invoice PDF:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate invoice PDF",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}
};
