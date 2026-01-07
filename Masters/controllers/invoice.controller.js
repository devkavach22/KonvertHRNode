const odooService = require("../services/odoo.service");
const mailService = require("../services/mail.service");
const crypto = require("crypto");
module.exports = {
  async createSubscription(req, res) {
    console.log(".......Subscription Creation Process Started ........");
    try {
      const {
        user_id,
        product_id,
        // plan_id removed - will be fetched automatically from product
        price_unit,
        transection_number,
      } = req.body;

      // Automatically set quantity to 1
      const quantity = 1;

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

      if (!price_unit || price_unit <= 0) {
        return res.status(400).json({
          success: false,
          error: "price_unit must be greater than 0",
        });
      }

      if (!transection_number) {
        return res.status(400).json({
          success: false,
          error: "transection_number is required",
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

      console.log("🔍 Step 3: Checking partner details...");
      const partnerDetails = await odooService.searchRead(
        "res.partner",
        [["id", "=", partner_id]],
        ["id", "name", "parent_id", "customer_rank", "is_blocked"]
      );

      if (!partnerDetails.length) {
        return res.status(404).json({
          success: false,
          error: "Partner not found.",
        });
      }

      console.log("📋 Partner Details:", partnerDetails[0]);

      const partner = partnerDetails[0];
      const validationErrors = [];

      if (partner.parent_id && partner.parent_id !== false) {
        validationErrors.push("Partner has a parent (must be independent)");
      }
      if (!partner.customer_rank || partner.customer_rank <= 0) {
        validationErrors.push(
          `Customer rank is ${partner.customer_rank} (must be > 0)`
        );
      }
      if (partner.is_blocked === true) {
        validationErrors.push("Partner is blocked");
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Partner does not meet subscription requirements",
          validation_errors: validationErrors,
          partner_details: {
            id: partner.id,
            name: partner.name,
            parent_id: partner.parent_id,
            customer_rank: partner.customer_rank,
            is_blocked: partner.is_blocked,
          },
        });
      }

      console.log("✅ Partner validated:", partner.name);

      console.log("🔍 Step 4: Fetching product with subscription plan...");

      // ✅ FIXED: Directly fetch product.product with subscription_plan_id
      const productVariant = await odooService.searchRead(
        "product.product",
        [["id", "=", product_id]],
        ["id", "name", "product_tmpl_id", "subscription_plan_id"]
      );

      if (!productVariant.length) {
        return res.status(404).json({
          success: false,
          error: "Product not found with ID: " + product_id,
        });
      }

      console.log("📦 Product found:", productVariant[0]);

      const product_template_id = productVariant[0].product_tmpl_id?.[0];
      const subscription_plan_id = productVariant[0].subscription_plan_id?.[0];

      if (!subscription_plan_id) {
        return res.status(400).json({
          success: false,
          error: "Product does not have a subscription plan assigned. Please use products from the getProducts API.",
          product_details: {
            id: product_id,
            name: productVariant[0].name,
            template_id: product_template_id,
            subscription_plan_id: productVariant[0].subscription_plan_id,
          },
        });
      }

      console.log("✅ Subscription Plan ID found:", subscription_plan_id);
      console.log("✅ Product validated:", productVariant[0].name);

      console.log("🔍 Step 5: Validating recurring plan...");

      const recurringPlan = await odooService.searchRead(
        "sale.subscription.plan",
        [["id", "=", subscription_plan_id]],
        ["id", "name"]
      );

      if (!recurringPlan.length) {
        return res.status(404).json({
          success: false,
          error: "Recurring plan not found with ID: " + subscription_plan_id,
        });
      }
      console.log("✅ Recurring Plan validated:", recurringPlan[0].name);

      console.log("🔍 Step 6: Fetching pricelist...");
      const partnerPricelist = await odooService.searchRead(
        "res.partner",
        [["id", "=", partner_id]],
        ["property_product_pricelist"]
      );

      const pricelist_id = partnerPricelist[0]?.property_product_pricelist?.[0];
      console.log("✅ Pricelist ID:", pricelist_id || "Using default");

      const todayDate = new Date().toISOString().split("T")[0];

      console.log("📝 Step 7: Creating subscription sale order...");
      const saleOrderData = {
        partner_id: partner_id,
        plan_id: subscription_plan_id,
        company_id: adminCompanyId,
        date_order: todayDate,
        pricelist_id: pricelist_id || false,
        order_line: [
          [
            0,
            0,
            {
              product_id: product_id,
              name: productVariant[0].name || "Subscription Product",
              product_uom_qty: quantity,
              price_unit: price_unit,
              recurring_invoice: true,
            },
          ],
        ],
      };

      const sale_order_id = await odooService.create(
        "sale.order",
        saleOrderData
      );

      if (!sale_order_id) {
        return res.status(500).json({
          success: false,
          error: "Failed to create subscription. Please try again.",
        });
      }
      console.log("✅ Subscription created with ID:", sale_order_id);

      console.log("✔️ Step 8: Confirming subscription...");
      try {
        await odooService.callMethod("sale.order", "action_confirm", [
          sale_order_id,
        ]);
        console.log("✅ Subscription confirmed");
      } catch (confirmError) {
        console.error("Subscription confirmation error:", confirmError);
        return res.status(500).json({
          success: false,
          error: "Failed to confirm subscription.",
          details: confirmError.message,
          sale_order_id,
        });
      }

      console.log("🔍 Step 9: Fetching subscription details...");
      const subscriptionDetails = await odooService.execute(
        "sale.order",
        "read",
        [
          [sale_order_id],
          [
            "name",
            "amount_total",
            "partner_id",
            "plan_id",
            "subscription_state",
          ],
        ]
      );

      if (!subscriptionDetails.length) {
        return res.status(500).json({
          success: false,
          error: "Subscription created but details not found.",
          sale_order_id,
        });
      }

      const subscription = subscriptionDetails[0];

      console.log("💳 Step 10: Creating invoice and processing payment...");
      let invoice_id = null;
      let payment_id = null;
      let secretKey = null;
      let emailSent = false;
      let clientPlanId = null;

      try {
        console.log("📄 Step 10.1: Creating invoice...");
        const invoiceData = {
          move_type: "out_invoice",
          partner_id: partner_id,
          invoice_date: todayDate,
          invoice_date_due: todayDate,
          invoice_line_ids: [[0, 0, { product_id, quantity: 1, price_unit }]],
          ref: subscription.name,
          transection_number: transection_number || "",
        };

        invoice_id = await odooService.create("account.move", invoiceData);
        console.log("✅ Invoice created with ID:", invoice_id);

        console.log("✔️ Step 10.2: Confirming invoice...");
        await odooService.callMethod("account.move", "action_post", [
          invoice_id,
        ]);
        console.log("✅ Invoice confirmed");

        const invoiceDetails = await odooService.execute(
          "account.move",
          "read",
          [[invoice_id], ["amount_residual", "amount_total", "name"]]
        );
        const invoice = invoiceDetails[0];

        console.log("🔍 Step 10.3: Finding payment journal...");
        const journals = await odooService.execute(
          "account.journal",
          "search_read",
          [
            [
              ["type", "=", "bank"],
              ["company_id", "=", adminCompanyId],
            ],
            ["id", "name"],
          ]
        );

        if (!journals.length) {
          throw new Error("No bank journal found");
        }
        const journal_id = journals[0].id;

        const paymentMethods = await odooService.execute(
          "account.payment.method.line",
          "search_read",
          [
            [
              ["journal_id", "=", journal_id],
              ["payment_type", "=", "inbound"],
            ],
            ["id"],
          ]
        );

        if (!paymentMethods.length) {
          throw new Error("No payment method found");
        }
        const payment_method_line_id = paymentMethods[0].id;

        console.log("💰 Step 10.4: Creating payment...");
        const paymentAmount =
          invoice.amount_residual || invoice.amount_total || price_unit;

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
            },
          }
        );

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

        payment_id = paymentResult?.res_id;
        console.log("✅ Payment created with ID:", payment_id);

        try {
          await odooService.execute("account.payment", "write", [
            [payment_id],
            { payment_reference: transection_number },
          ]);
          console.log("✅ Payment reference updated with transection_number");
        } catch (writeError) {
          console.error("Payment reference update error:", writeError);
        }

        secretKey = crypto.randomBytes(16).toString("hex").toUpperCase();

        console.log("📧 Step 10.5: Sending confirmation email...");
        const partnerEmail = await odooService.execute("res.partner", "read", [
          [partner_id],
          ["email", "name"],
        ]);

        const email = partnerEmail[0]?.email;
        const customerName = partnerEmail[0]?.name || "Customer";

        if (email) {
          const subject =
            "Subscription Activated - Kavach Global Konnects Pvt Ltd";
          const loginUrl = "https://konverthrms.onrender.com/KHR-plan-activation";

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr><td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); height: 8px;"></td></tr>
          <tr><td style="padding: 50px 60px;">
              <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 600; color: #1a1a1a;">Subscription Activated! ✓</h1>
              <p style="margin: 0 0 30px 0; font-size: 14px; color: #4CAF50; font-weight: 600;">Payment Successful</p>
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hi ${customerName},</p>
              <p style="margin: 0 0 25px 0; font-size: 16px; color: #333333;">Your subscription <strong>${subscription.name}</strong> has been activated and payment of <strong>₹${paymentAmount.toFixed(2)}</strong> has been processed successfully.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 25px 0;">
                <tr><td style="padding: 25px;">
                    <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #666;">SUBSCRIPTION DETAILS</p>
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr><td style="font-size: 15px; color: #666;">Subscription:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${subscription.name}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Plan:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${recurringPlan[0].name}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Product:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${productVariant[0].name}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Invoice:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${invoice.name}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Transaction Number:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${transection_number}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Amount:</td><td style="font-size: 15px; color: #4CAF50; font-weight: 700; text-align: right;">₹${paymentAmount.toFixed(2)}</td></tr>
                      <tr><td style="font-size: 15px; color: #666;">Payment Date:</td><td style="font-size: 15px; color: #1a1a1a; font-weight: 600; text-align: right;">${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
                    </table>
                  </td></tr>
              </table>
              
              <p style="margin: 30px 0 15px 0; font-size: 16px; color: #333333;">Your secure access key:</p>
              <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); border-left: 4px solid #ffc107; padding: 25px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #856404; font-weight: 600;">🔐 SECRET KEY</p>
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #856404; letter-spacing: 3px; font-family: 'Courier New', monospace;">${secretKey}</p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-left: 4px solid #2196F3; border-radius: 6px; margin: 25px 0;">
                <tr><td style="padding: 25px;">
                    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1565c0;">🚀 Access Your Account</p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr><td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">🔓 Login Now</a>
                        </td></tr>
                    </table>
                  </td></tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #f44336; border-radius: 6px; margin: 25px 0;">
                <tr><td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #c62828;"><strong>⚠️ Important:</strong> Keep your secret key safe and confidential. You will need it to log in.</p>
                  </td></tr>
              </table>
              
              <p style="margin: 40px 0 0 0; font-size: 16px; color: #333333;"><strong>Best regards,<br>Kavach Global Konnects Pvt Ltd</strong></p>
              
              <div style="border-top: 1px solid #e0e0e0; margin: 40px 0 30px 0;"></div>
              <p style="margin: 0; font-size: 13px; color: #999999; text-align: center;">
                This is an automated message. For support, contact <a href="mailto:support@kavachglobal.com" style="color: #4CAF50; text-decoration: none;">support@kavachglobal.com</a>
              </p>
            </td></tr>
          <tr><td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); height: 8px;"></td></tr>
        </table>
      </td></tr>
  </table>
</body>
</html>`;

          emailSent = await mailService.sendMail(email, subject, htmlContent);
          console.log("✅ Email sent:", emailSent);
        }

        console.log("📋 Step 10.6: Creating client plan details...");
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
        console.log("✅ Client plan details stored:", clientPlanId);
      } catch (paymentError) {
        console.error("❌ Payment/Email error:", paymentError);
      }

      return res.status(201).json({
        success: true,
        message:
          "Subscription created, invoice generated, and payment processed successfully",
        data: {
          subscription_id: sale_order_id,
          subscription_name: subscription.name,
          partner_id: partner_id,
          partner_name: partner.name,
          plan_id: subscription_plan_id,
          plan_name: recurringPlan[0].name,
          product_id: product_id,
          product_template_id: product_template_id,
          product_name: productVariant[0].name,
          quantity: quantity,
          amount_total: subscription.amount_total,
          subscription_state: subscription.subscription_state,
          start_date: todayDate,
          invoice_id: invoice_id,
          payment_id: payment_id,
          transection_number: transection_number,
          secret_key: secretKey,
          client_plan_id: clientPlanId,
          email_sent: emailSent,
        },
      });
    } catch (error) {
      console.error("❌ Error in subscription creation process:", error);

      if (error.message && error.message.includes("XMLRPC")) {
        return res.status(503).json({
          success: false,
          error: "Unable to connect to Odoo server. Please try again later.",
        });
      }

      return res.status(500).json({
        success: false,
        error: "An unexpected error occurred during subscription creation.",
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

      const axios = require("axios");
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

      const sessionId = loginResponse.headers["set-cookie"];
      const pdfResponse = await axios.get(
        `${process.env.ODOO_URL}/report/pdf/account.report_invoice/${invoice_id}`,
        {
          headers: {
            Cookie: sessionId,
          },
          responseType: "arraybuffer",
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
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
};
