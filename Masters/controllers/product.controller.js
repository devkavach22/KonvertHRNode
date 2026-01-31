const odooService = require("../services/odoo.service");
module.exports = {
  async createProduct(req, res) {
    try {
      let { company_id } = req.body;
      if (!company_id && req.userId) {
        const userRecord = await odooService.searchRead(
          "res.users",
          [["id", "=", req.userId]],
          ["company_id"],
          1
        );

        if (!userRecord.length || !userRecord[0].company_id) {
          return res.status(400).json({
            status: "error",
            message: "User does not have a default company assigned.",
          });
        }

        company_id = userRecord[0].company_id[0];
      }

      const {
        name,
        type,
        credit,
        list_price,
        standard_price,
        default_code,
        description,
        attributes,
        optional_product_ids,
        vendor_info,
        service_to_purchase,
        is_plan,
        ideal_for,
        fees,
        duration_periods_no,
        duration,
        is_highlight,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Product Name is required",
        });
      }
      if (!type) {
        return res.status(400).json({
          status: "error",
          message: "Product Type is required",
        });
      }
      const productTypeMap = {
        consu: "consu",
        service: "service",
        combo: "combo",
      };
      if (!productTypeMap[type]) {
        return res.status(400).json({
          status: "error",
          message: "Invalid Product Type",
        });
      }
      const productData = {
        name,
        type: productTypeMap[type],
        credit: credit || "",
        list_price: list_price ? parseFloat(list_price) : 0,
        standard_price: standard_price ? parseFloat(standard_price) : 0,
        company_id: company_id ? parseInt(company_id) : false,
        default_code: default_code || "",
        description: description || "",
        is_plan: is_plan === true,
        ideal_for: ideal_for || "",
        fees: fees ? parseFloat(fees) : 0,
        duration_periods_no: duration_periods_no
          ? parseInt(duration_periods_no)
          : 0,
        duration: duration || "months",
        is_highlight: is_highlight === true,
      };
      if (optional_product_ids && Array.isArray(optional_product_ids)) {
        productData.optional_product_ids = [[6, 0, optional_product_ids]];
      }
      const productId = await odooService.create(
        "product.template",
        productData
      );
      if (vendor_info && Array.isArray(vendor_info)) {
        for (let vendor of vendor_info) {
          if (!vendor.partner_id || !vendor.price || !vendor.min_qty) {
            return res.status(400).json({
              status: "error",
              message: "Vendor info must include partner_id, price, min_qty",
            });
          }

          const supplierPayload = {
            product_tmpl_id: productId,
            partner_id: vendor.partner_id,
            price: parseFloat(vendor.price),
            min_qty: parseFloat(vendor.min_qty),
            company_id: company_id ? parseInt(company_id) : false,
          };

          await odooService.create("product.supplierinfo", supplierPayload);
        }
      }
      if (service_to_purchase === true) {
        await odooService.write("product.template", [productId], {
          service_to_purchase: true,
        });
      }
      if (attributes && Array.isArray(attributes)) {
        for (const item of attributes) {
          if (
            !item.attribute_id ||
            !item.value_ids ||
            !Array.isArray(item.value_ids)
          ) {
            continue;
          }

          const numericIds = [];
          const stringNames = [];

          for (const val of item.value_ids) {
            if (typeof val === "number") {
              numericIds.push(val);
            } else if (typeof val === "string") {
              stringNames.push(val);
            }
          }
          const allowedValues = await odooService.searchRead(
            "product.attribute.value",
            [["attribute_id", "=", item.attribute_id]],
            ["id", "name"]
          );
          const validIds = allowedValues.map((v) => v.id);
          const valueNameToIdMap = {};
          allowedValues.forEach((v) => {
            valueNameToIdMap[v.name.toLowerCase()] = v.id;
          });

          const invalidNumericIds = numericIds.filter(
            (id) => !validIds.includes(id)
          );
          if (invalidNumericIds.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Invalid value_ids ${invalidNumericIds.join(
                ", "
              )} for attribute_id ${item.attribute_id}`,
            });
          }

          const convertedIds = [];
          const notFoundNames = [];

          for (const name of stringNames) {
            const normalizedName = name.toLowerCase();
            if (valueNameToIdMap[normalizedName]) {
              convertedIds.push(valueNameToIdMap[normalizedName]);
            } else {
              notFoundNames.push(name);
            }
          }

          if (notFoundNames.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Attribute value names not found: ${notFoundNames.join(
                ", "
              )} for attribute_id ${item.attribute_id
                }. Available: ${allowedValues.map((v) => v.name).join(", ")}`,
            });
          }

          const allValueIds = [...numericIds, ...convertedIds];

          if (allValueIds.length === 0) {
            continue;
          }

          const attributePayload = {
            product_tmpl_id: productId,
            attribute_id: item.attribute_id,
            value_ids: [[6, 0, allValueIds]],
          };

          await odooService.create(
            "product.template.attribute.line",
            attributePayload
          );
        }
      }
      return res.status(200).json({
        status: "success",
        message: "Product created successfully",
        id: productId,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to create Product",
        error: error.message,
      });
    }
  },
  async getProducts(req, res) {
    try {
      console.log("Product API called .......");

      let products = await odooService.searchRead(
        "product.product",
        [
          ["type", "=", "service"],
          ["is_plan", "=", true],
          ["recurring_invoice", "=", true],
        ],
        [
          "id",
          "name",
          "type",
          "list_price",
          "default_code",
          "description",
          "ideal_for",
          "fees",
          "duration_periods_no",
          "duration",
          "is_highlight",
          "subscription_plan_id", // ✅ ADDED
        ]
      );

      products = products.map((p) => ({
        ...p,
        description: p.description
          ? p.description.replace(/<[^>]*>/g, "")
          : "",
        subscription_plan_id: p.subscription_plan_id
          ? {
            id: p.subscription_plan_id[0],
            name: p.subscription_plan_id[1],
          }
          : null,
      }));

      products.sort((a, b) => {
        const priceA = a.list_price || 0;
        const priceB = b.list_price || 0;
        return priceA - priceB;
      });

      return res.status(200).json({
        status: "success",
        count: products.length,
        data: products,
      });

    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch products",
        error: error.message,
      });
    }
  },

  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await odooService.searchRead(
        "product.template",
        [["id", "=", parseInt(id)]],
        [
          "id",
          "name",
          "type",
          "list_price",
          "default_code",
          "company_id",
          "description",
        ]
      );

      if (!product.length) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: product[0],
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch product",
        error: error.message,
      });
    }
  },
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { attributes, vendor_info, service_to_purchase, ...rest } =
        req.body;

      if (Object.keys(rest).length > 0) {
        await odooService.write("product.template", [parseInt(id)], rest);
      }

      if (service_to_purchase !== undefined) {
        await odooService.write("product.template", [parseInt(id)], {
          service_to_purchase: service_to_purchase === true,
        });
      }

      if (attributes && Array.isArray(attributes)) {
        for (const item of attributes) {
          if (!item.attribute_id || !item.value_ids) continue;

          const allowedValues = await odooService.searchRead(
            "product.attribute.value",
            [["attribute_id", "=", item.attribute_id]],
            ["id"]
          );

          const validIds = allowedValues.map((v) => v.id);
          const invalidValues = item.value_ids.filter(
            (val) => !validIds.includes(val)
          );

          if (invalidValues.length > 0) {
            return res.status(400).json({
              status: "error",
              message: `Invalid value_ids ${invalidValues} for attribute_id ${item.attribute_id}`,
            });
          }

          const existingLines = await odooService.searchRead(
            "product.template.attribute.line",
            [
              ["product_tmpl_id", "=", id],
              ["attribute_id", "=", item.attribute_id],
            ],
            ["id"]
          );

          if (existingLines.length > 0) {
            await odooService.write(
              "product.template.attribute.line",
              [existingLines[0].id],
              { value_ids: [[6, 0, item.value_ids]] }
            );
          } else {
            await odooService.create("product.template.attribute.line", {
              product_tmpl_id: id,
              attribute_id: item.attribute_id,
              value_ids: [[6, 0, item.value_ids]],
            });
          }
        }
      }

      if (vendor_info && Array.isArray(vendor_info)) {
        for (let vendor of vendor_info) {
          if (!vendor.partner_id || !vendor.price || !vendor.min_qty) continue;

          const existing = await odooService.searchRead(
            "product.supplierinfo",
            [
              ["product_tmpl_id", "=", id],
              ["partner_id", "=", vendor.partner_id],
            ],
            ["id"]
          );

          const supplierPayload = {
            product_tmpl_id: id,
            partner_id: vendor.partner_id,
            price: parseFloat(vendor.price),
            min_qty: parseFloat(vendor.min_qty),
            company_id: vendor.company_id || false,
          };

          if (existing.length > 0) {
            await odooService.write(
              "product.supplierinfo",
              [existing[0].id],
              supplierPayload
            );
          } else {
            await odooService.create("product.supplierinfo", supplierPayload);
          }
        }
      }

      return res.status(200).json({
        status: "success",
        message: "Product updated successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to update product",
        error: error.message,
      });
    }
  },
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      await odooService.unlink("product.template", [parseInt(id)]);

      return res.status(200).json({
        status: "success",
        message: "Product deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to delete product",
        error: error.message,
      });
    }
  },
  //   async getCustomerSubscriptions(req, res) {
  //     try {
  //       console.log("Customer Subscriptions API called .......");

  //       const { user_id } = req.query;

  //       if (!user_id) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "user_id is required",
  //         });
  //       }

  //       /* --------------------------------------------------
  // STEP 1: user → customer (partner_id)
  // -------------------------------------------------- */
  //       const users = await odooService.searchRead(
  //         "res.users",
  //         [["id", "=", Number(user_id)]],
  //         ["id", "partner_id"]
  //       );

  //       if (!users.length || !users[0].partner_id) {
  //         return res.status(404).json({
  //           status: "error",
  //           message: "Customer not linked with this user",
  //         });
  //       }

  //       const customerId = users[0].partner_id[0];

  //       /* --------------------------------------------------
  // STEP 2: Fetch subscription orders WITH invoice_ids
  // -------------------------------------------------- */
  //       const orders = await odooService.searchRead(
  //         "sale.order",
  //         [
  //           ["is_subscription", "=", true],
  //           ["partner_id", "=", customerId],
  //         ],
  //         [
  //           "id",
  //           "name",
  //           "date_order",
  //           "subscription_state",
  //           "next_invoice_date",
  //           "amount_total",
  //           "currency_id",
  //           "plan_id",
  //           "invoice_ids", // ⭐ IMPORTANT
  //         ]
  //       );

  //       if (!orders.length) {
  //         return res.status(200).json({
  //           status: "success",
  //           count: 0,
  //           data: [],
  //         });
  //       }

  //       /* --------------------------------------------------
  // STEP 3: Fetch invoice details
  // -------------------------------------------------- */
  //       const invoiceIds = orders.flatMap((o) => o.invoice_ids);

  //       let invoices = [];
  //       if (invoiceIds.length) {
  //         invoices = await odooService.searchRead(
  //           "account.move",
  //           [
  //             ["id", "in", invoiceIds],
  //             ["move_type", "=", "out_invoice"],
  //           ],
  //           ["id", "name", "invoice_date", "amount_total", "state"]
  //         );
  //       }

  //       /* --------------------------------------------------
  // STEP 4: Final response
  // -------------------------------------------------- */
  //       const data = orders.map((order) => {
  //         const orderInvoices = invoices
  //           .filter((inv) => order.invoice_ids.includes(inv.id))
  //           .map((inv) => ({
  //             invoice_id: inv.id, // ✅ THIS IS WHAT YOU WANT
  //             invoice_number: inv.name,
  //             invoice_date: inv.invoice_date,
  //             amount: inv.amount_total,
  //             state: inv.state,
  //             download_url: `/api/invoice/download/${inv.id}`,
  //           }));

  //         return {
  //           subscription_id: order.id,
  //           order_number: order.name,
  //           order_date: order.date_order, // ✅ HERE

  //           plan_id: order.plan_id?.[0],
  //           plan_name: order.plan_id?.[1],
  //           status: order.subscription_state,
  //           next_invoice_date: order.next_invoice_date,
  //           total_amount: order.amount_total,
  //           currency: order.currency_id?.[1],

  //           // 🔥 invoices linked via invoice_ids
  //           invoices: orderInvoices,
  //         };
  //       });

  //       return res.status(200).json({
  //         status: "success",
  //         count: data.length,
  //         data,
  //       });
  //     } catch (error) {
  //       console.error("❌ Error:", error);
  //       return res.status(500).json({
  //         status: "error",
  //         message: "Failed to fetch subscriptions",
  //         error: error.message,
  //       });
  //     }
  //   },
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

  async getCustomerSubscriptions(req, res) {
    try {
      console.log("Customer Subscriptions API called .......");
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          status: "error",
          message: "user_id is required",
        });
      }

      /* --------------------------------------------------
         STEP 1: user → customer (partner_id)
      -------------------------------------------------- */
      const users = await odooService.searchRead(
        "res.users",
        [["id", "=", Number(user_id)]],
        ["id", "partner_id"]
      );

      if (!users.length || !users[0].partner_id) {
        return res.status(404).json({
          status: "error",
          message: "Customer not linked with this user",
        });
      }

      const customerId = users[0].partner_id[0];

      /* --------------------------------------------------
         STEP 2: Fetch subscription orders WITH invoice_ids
      -------------------------------------------------- */
      const orders = await odooService.searchRead(
        "sale.order",
        [
          ["is_subscription", "=", true],
          ["partner_id", "=", customerId],
        ],
        [
          "id",
          "name",
          "date_order",
          "subscription_state",
          "next_invoice_date",
          "amount_total",
          "currency_id",
          "plan_id",
          "invoice_ids",
        ]
      );

      if (!orders.length) {
        return res.status(200).json({
          status: "success",
          count: 0,
          data: [],
        });
      }

      /* --------------------------------------------------
         STEP 3: Fetch invoice details
      -------------------------------------------------- */
      const invoiceIds = orders.flatMap((o) => o.invoice_ids);
      let invoices = [];

      if (invoiceIds.length) {
        invoices = await odooService.searchRead(
          "account.move",
          [
            ["id", "in", invoiceIds],
            ["move_type", "=", "out_invoice"],
          ],
          ["id", "name", "invoice_date", "amount_total", "state"]
        );
      }

      /* --------------------------------------------------
         🔥 HELPER FUNCTION: Convert UTC to IST (UTC+5:30)
      -------------------------------------------------- */
      const convertToIST = (utcDateStr) => {
        if (!utcDateStr) return null;

        // Ensure the date string is treated as UTC by adding 'Z' if not present
        let dateStr = utcDateStr;
        if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
          dateStr = utcDateStr.replace(' ', 'T') + 'Z';
        }

        // Parse as UTC
        const utcDate = new Date(dateStr);

        // Add 5 hours 30 minutes for IST
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(utcDate.getTime() + istOffset);

        // Format as YYYY-MM-DD HH:mm:ss
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        const hours = String(istDate.getUTCHours()).padStart(2, '0');
        const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      /* --------------------------------------------------
         STEP 4: Final response with IST dates
      -------------------------------------------------- */
      const data = orders.map((order) => {
        const orderInvoices = invoices
          .filter((inv) => order.invoice_ids.includes(inv.id))
          .map((inv) => ({
            invoice_id: inv.id,
            invoice_number: inv.name,
            invoice_date: convertToIST(inv.invoice_date), // ✅ Converted to IST
            amount: inv.amount_total,
            state: inv.state,
            download_url: `/api/invoice/download/${inv.id}`,
          }));

        return {
          subscription_id: order.id,
          order_number: order.name,
          order_date: convertToIST(order.date_order), // ✅ Converted to IST
          plan_id: order.plan_id?.[0],
          plan_name: order.plan_id?.[1],
          status: order.subscription_state,
          next_invoice_date: convertToIST(order.next_invoice_date), // ✅ Converted to IST
          total_amount: order.amount_total,
          currency: order.currency_id?.[1],
          invoices: orderInvoices,
        };
      });

      return res.status(200).json({
        status: "success",
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("❌ Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch subscriptions",
        error: error.message,
      });
    }
  }
};
