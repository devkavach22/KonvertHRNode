const odooService = require("../services/odoo.service");
const mailService = require("../services/mail.service");
const redisClient = require("../services/redisClient");
const moment = require("moment-timezone");
const otpStore = new Map();

const { getClientFromRequest, fetchOdooRecords } = require("../services/plan.helper");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const ATTENDANCE_FIELDS = [
  "id",
  "employee_id",
  "check_in",
  "checkin_lat",
  "checkin_lon",
  "check_out",
  "checkout_lat",
  "checkout_lon",
  "system_version",
  "user_agent",
  "application_name",
  "device_id",
  "hardware",
  "code_name",
  "product",
  "first_install_time",
  "last_update_time",
  "location",
  "email",
  "ip_address",
  "android_id",
  "brand",
  "device",
  "version",
  "worked_hours",
  "base_os",
];
const formatDateTimeForOdoo = (isoDateTime) => {
  if (!isoDateTime) return false;
  return isoDateTime
    .replace("T", " ")
    .split(".")[0]
    .split("+")[0]
    .split("Z")[0];
};
class ApiController {
  generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }
  async auth(req, res) {
    try {
      const { user_name } = req.body;

      if (!user_name || user_name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "user_name is required and cannot be empty",
        });
      }

      const existingUsers = await odooService.searchRead(
        "api.auth.token",
        [["user_name", "=", user_name.trim()]],
        ["id", "user_name", "token"],
        1
      );

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 2);
      const expiryDateString = expiryDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      let response;

      if (!existingUsers || existingUsers.length === 0) {
        const newToken = this.generateToken();

        try {
          const userId = await odooService.create("api.auth.token", {
            user_name: user_name.trim(),
            expiry: expiryDateString,
            token: newToken,
          });

          response = {
            status: "success",
            token: newToken,
            user_name: user_name.trim(),
            expires_at: expiryDateString,
          };
        } catch (createError) {
          console.error("User creation failed:", createError);
          return res.status(500).json({
            status: "error",
            message: "Failed to create user token",
          });
        }
      } else {
        const user = existingUsers[0];
        const isValid = await odooService.execute(
          "api.auth.token",
          "is_valid",
          [user.id]
        );

        if (!isValid) {
          const newToken = this.generateToken();
          await odooService.write("api.auth.token", [user.id], {
            expiry: expiryDateString,
            token: newToken,
          });

          response = {
            status: "success",
            token: newToken,
            user_name: user.user_name,
            expires_at: expiryDateString,
            message: "New token generated (previous expired)",
          };
        } else {
          response = {
            status: "success",
            token: user.token,
            user_name: user.user_name,
            message: "Existing valid token returned",
          };
        }
      }

      console.log("Auth response:", response);
      return res.status(200).json(response);
    } catch (error) {
      console.error("Auth error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error during authentication",
        ...(process.env.NODE_ENV === "development" && { error: error.message }),
      });
    }
  }
  async createLead(req, res) {
    try {
      const {
        email,
        contact_name,
        gst_number,
        mobile_number,
        subject,
        is_from_kavach_services,
        is_from_konvert_hr,
        company_name,
      } = req.body;

      if (!email || !contact_name || !subject) {
        return res.status(400).json({
          status: "error",
          message: "Email, contact name and subject are required",
        });
      }
      if (!is_from_kavach_services) {
        if (!gst_number) {
          return res.status(400).json({
            status: "error",
            message: "GST number is required when not from Kavach Services",
          });
        }

        const gstRegex =
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

        if (!gstRegex.test(gst_number)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid GST number format",
          });
        }
      }
      let contactId;
      const existingContacts = await odooService.searchRead(
        "res.partner",
        [
          ["email", "=", email],
          ["name", "=", contact_name],
        ],
        ["id"],
        1
      );

      if (!existingContacts || existingContacts.length === 0) {
        contactId = await odooService.create("res.partner", {
          email,
          name: contact_name,
        });
      } else {
        contactId = existingContacts[0].id;
      }

      const searchDomain = [
        ["name", "=", subject],
        ["email_from", "=", email],
        ["partner_id", "=", contactId],
        ["phone", "=", mobile_number],
      ];
      if (!is_from_kavach_services) {
        searchDomain.push(["gst_number", "=", gst_number]);
      }
      const existingLeads = await odooService.searchRead(
        "crm.lead",
        searchDomain,
        ["id"],
        1
      );

      if (existingLeads && existingLeads.length > 0) {
        return res.status(409).json({
          status: "info",
          message: "Lead already exists",
        });
      }
      let tagIds = [];

      if (is_from_kavach_services) {
        const kavachTag = await odooService.searchRead(
          "crm.tag",
          [["name", "=", "Kavach Services"]],
          ["id"],
          1
        );
        if (kavachTag.length) tagIds.push(kavachTag[0].id);
      }

      if (is_from_konvert_hr) {
        const konvertHrTag = await odooService.searchRead(
          "crm.tag",
          [["name", "=", "Konvert HR"]],
          ["id"],
          1
        );
        if (konvertHrTag.length) tagIds.push(konvertHrTag[0].id);
      }

      const tagCommand = tagIds.length > 0 ? [[6, 0, tagIds]] : [];

      const leadVals = {
        email_from: email,
        partner_id: contactId,
        phone: mobile_number,
        name: subject,
        company_name: company_name,
        tag_ids: tagCommand,
      };

      if (gst_number) {
        leadVals.gst_number = gst_number;
      }

      await odooService.create("crm.lead", leadVals);

      return res.status(200).json({
        status: "OK",
        message: "Lead created successfully",
        assigned_tags: tagIds,
      });
    } catch (error) {
      console.error("Create lead error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create lead",
      });
    }
  }

  async createTag(req, res) {
    try {
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Tag name is required",
        });
      }

      const tagData = { name, color: color || 0 };
      const tagId = await odooService.create("crm.tag", tagData);

      return res.status(200).json({
        status: "success",
        message: "Tag created successfully",
        id: tagId,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to create tag",
        error: error.message,
      });
    }
  }

  async getTags(req, res) {
    try {
      const tags = await odooService.searchRead(
        "crm.tag",
        [],
        ["id", "name", "color"]
      );

      return res.status(200).json({
        status: "success",
        count: tags.length,
        data: tags,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch tags",
        error: error.message,
      });
    }
  }

  async getTagById(req, res) {
    try {
      const { id } = req.params;
      const tag = await odooService.searchRead(
        "crm.tag",
        [["id", "=", parseInt(id)]],
        ["id", "name", "color"]
      );

      if (!tag.length) {
        return res.status(404).json({
          status: "error",
          message: "Tag not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: tag[0],
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch tag",
        error: error.message,
      });
    }
  }

  async updateTag(req, res) {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      const payload = {};
      if (name !== undefined) payload.name = name;
      if (color !== undefined) payload.color = color;

      const success = await odooService.write(
        "crm.tag",
        [parseInt(id)],
        payload
      );

      return res.status(200).json({
        status: "success",
        message: "Tag updated successfully",
        updated: success,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to update tag",
        error: error.message,
      });
    }
  }

  async deleteTag(req, res) {
    try {
      const { id } = req.params;

      await odooService.unlink("crm.tag", [parseInt(id)]);

      return res.status(200).json({
        status: "success",
        message: "Tag deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to delete tag",
        error: error.message,
      });
    }
  }
  async getCountries(req, res) {
    try {
      const countries = await odooService.searchRead(
        "res.country",
        [],
        ["id", "name"]
      );

      const data = countries.map((country) => ({
        id: country.id,
        name: country.name,
      }));

      return res.status(200).json({
        status: "success",
        count: data.length,
        data: data,
      });
    } catch (error) {
      console.error("Get countries error:", error);
      return res.status(200).json({
        status: "error",
        message: "Failed to fetch countries",
      });
    }
  }
  async checkGstNumber(req, res) {
    try {
      const { gst_number } = req.body;

      if (!gst_number) {
        return res.status(400).json({
          status: "error",
          message: "gst_number is required",
        });
      }

      // --- GST NUMBER FORMAT VALIDATION ---
      if (!/^[A-Z0-9]+$/.test(gst_number)) {
        return res.status(400).json({
          status: "error",
          message: "GST number should contain only uppercase letters and numeric characters",
        });
      }

      let result = await odooService.execute(
        "res.partner",
        "autocomplete_by_vat",
        [gst_number, 104],
        { timeout: 15 }
      );

      if (!result || result.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Not Valid Gst Number",
        });
      }

      const stateCode = gst_number.slice(0, 2);
      const stateRecords = await odooService.execute(
        "res.country.state",
        "search_read",
        [[["l10n_in_tin", "=", stateCode]]],
        { fields: ["name", "id"], limit: 1 }
      );

      if (stateRecords && stateRecords.length > 0) {
        // Add state info to the first result object
        result[0].state = stateRecords[0].name;
        result[0].state_id = stateRecords[0].id;
      }

      return res.status(200).json({
        status: "ok",
        message: "Valid GST Number",
        company_details: result,
      });
    } catch (error) {
      console.error("Check GST error:", error);
      return res.status(400).json({
        status: "error",
        message: "Failed to validate GST number",
      });
    }
  }
  //   async createUser(req, res) {
  //     console.log("Register Called ");
  //     try {
  //       const {
  //         name,
  //         client_image,
  //         company_name,
  //         gst_number,
  //         mobile,
  //         email,
  //         designation,
  //         street,
  //         street2,
  //         pincode,
  //         state_id,
  //         country_id,
  //         city,
  //         password,
  //         first_name,
  //         company_address,
  //         last_name,
  //       } = req.body;

  //       // --- 1. PASSWORD VALIDATION ---
  //       if (!password || password.length < 8) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "Password must be at least 8 characters long",
  //         });
  //       }

  //       if (!/[A-Z]/.test(password)) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "Password must contain at least one uppercase letter",
  //         });
  //       }

  //       // --- 2. UNIQUE EMAIL CHECK ---
  //       const existingUsers = await odooService.searchRead(
  //         "res.users",
  //         [["login", "=", email]],
  //         ["id"]
  //       );

  //       if (existingUsers && existingUsers.length > 0) {
  //         return res.status(409).json({
  //           status: "error",
  //           message: "Already Registered Email",
  //         });
  //       }

  //       // --- 3. UNIQUE GST (VAT) CHECK ---
  //       const existingGST = await odooService.searchRead(
  //         "res.partner",
  //         [["vat", "=", gst_number]],
  //         ["id"]
  //       );

  //       if (existingGST && existingGST.length > 0) {
  //         return res.status(409).json({
  //           status: "error",
  //           message: "GST Number already registered with another account",
  //         });
  //       }

  //       // --- 4. GST VALIDATION (Autocomplete Check) ---
  //       const gstValidation = await odooService.execute(
  //         "res.partner",
  //         "autocomplete_by_vat",
  //         [gst_number, parseInt(country_id)],
  //         { timeout: 15 }
  //       );

  //       if (!gstValidation || gstValidation.length === 0) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "Invalid GST number",
  //         });
  //       }

  //       // --- 5. IMAGE CLEANING ---
  //       let cleanImage = null;
  //       if (client_image) {
  //         cleanImage = client_image.replace(/^data:image\/\w+;base64,/, "");
  //       }

  //       // --- 6. FETCH SUPERADMIN COMPANY ---
  //       const superadminUser = await odooService.searchRead(
  //         "res.users",
  //         [["id", "=", 2]],
  //         ["company_id"]
  //       );

  //       if (!superadminUser || superadminUser.length === 0) {
  //         throw new Error("Superadmin user not found");
  //       }

  //       const superadminCompanyId = superadminUser[0].company_id[0];

  //       // --- 7. PREPARE USER VALUES ---
  //       const userVals = {
  //         name: company_name,
  //         company_name: company_name,
  //         email: email,
  //         login: email,
  //         vat: gst_number,
  //         function: designation,
  //         street: street,
  //         street2: street2,
  //         city: city,
  //         zip: pincode,
  //         state_id: parseInt(state_id),
  //         country_id: parseInt(country_id),
  //         password: password,
  //         company_ids: [[6, 0, [superadminCompanyId]]],
  //         company_id: superadminCompanyId,
  //         l10n_in_gst_treatment: "regular",
  //         first_name: first_name,
  //         last_name: last_name,
  //         mobile: mobile,
  //         company_address: company_address,
  //         image_1920: cleanImage,
  //       };

  //       // --- 8. CREATE USER AND UPDATE PARTNER ---
  //       let userId;
  //       try {
  //         userId = await odooService.create("res.users", userVals);
  //       } catch (createError) {
  //         // Check if it's a duplicate login error
  //         if (createError.message && createError.message.includes('same login')) {
  //           return res.status(409).json({
  //             status: "error",
  //             message: "Already Registered Email",
  //           });
  //         }
  //         // Check if it's a duplicate GST error
  //         if (createError.message && createError.message.includes('vat')) {
  //           return res.status(409).json({
  //             status: "error",
  //             message: "GST Number already registered with another account",
  //           });
  //         }
  //         // Re-throw other errors
  //         throw createError;
  //       }

  //       const userData = await odooService.searchRead(
  //         "res.users",
  //         [["id", "=", userId]],
  //         ["partner_id", "employee_ids"]
  //       );

  //       const companyPartnerId = userData[0].partner_id[0];
  //       await odooService.write("res.partner", [companyPartnerId], {
  //         company_type: "company",
  //         name: company_name,
  //         is_from_konvert_hr_portal: true,
  //         customer_rank: 1,
  //       });

  //       // --- UPDATED: UPDATE EMPLOYEE PASSWORD AND ADDRESS_ID ---
  //       if (userData[0].employee_ids && userData[0].employee_ids.length > 0) {
  //         const employeeId = userData[0].employee_ids[0];
  //         try {
  //           await odooService.write("hr.employee", [employeeId], {
  //             employee_password: password,
  //             address_id: companyPartnerId, // ADDED: Assign user's partner_id to employee's address_id
  //           });
  //           console.log(`Employee password and address_id set for employee ID: ${employeeId}`);
  //           console.log(`Partner ID ${companyPartnerId} assigned to employee address_id`);
  //         } catch (empError) {
  //           console.error("Error setting employee data:", empError);
  //         }
  //       }

  //       // Create Child Contact
  //       const childContactVals = {
  //         parent_id: companyPartnerId,
  //         type: "contact",
  //         name: `${first_name} ${last_name}`,
  //         email: email,
  //         phone: mobile,
  //         phone_res: mobile,
  //         mobile: mobile,
  //       };
  //       await odooService.create("res.partner", childContactVals);

  //       // --- 9. SEND WELCOME MAIL ---
  //       await mailService.sendMail(
  //         email,
  //         "Welcome to Kavach Global",
  //         `<!DOCTYPE html>
  // <html>
  // <head>
  //   <meta charset="utf-8">
  //   <meta name="viewport" content="width=device-width, initial-scale=1.0">
  // </head>
  // <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  //   <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
  //     <tr>
  //       <td align="center">
  //         <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  //           <tr>
  //             <td style="background-color: #5f5cc4; height: 8px;"></td>
  //           </tr>

  //           <tr>
  //             <td style="padding: 50px 60px;">
  //               <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 600; color: #1a1a1a;">Welcome to Kavach Global!</h1>

  //               <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hello ${name},</p>

  //               <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
  //                 Thank you for registering with Kavach Global Private Limited. We are thrilled to have you on board!
  //               </p>

  //               <div style="background-color: #f0f7ff; border-left: 4px solid #5f5cc4; padding: 20px; margin: 30px 0;">
  //                 <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
  //                   Your Account is Ready
  //                 </p>
  //                 <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
  //                   You can now access all features and services available on our platform. Feel free to explore and reach out if you need any assistance.
  //                 </p>
  //               </div>

  //               <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
  //                 If you have any questions or need support, please do not hesitate to contact us. We are here to help!
  //               </p>

  //               <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
  //                 We look forward to serving you.
  //               </p>

  //               <p style="margin: 40px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
  //                 <strong>Best regards,<br>Kavach Global Private Limited</strong>
  //               </p>
  //             </td>
  //           </tr>

  //           <tr>
  //             <td style="background-color: #5f5cc4; height: 8px;"></td>
  //           </tr>
  //         </table>

  //         <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
  //           <tr>
  //             <td style="padding: 0 60px; text-align: center;">
  //               <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.6;">
  //                 This email was sent to ${email}. If you did not create an account, please contact our support team immediately.
  //               </p>
  //             </td>
  //           </tr>
  //         </table>
  //       </td>
  //     </tr>
  //   </table>
  // </body>
  // </html>`
  //       );

  //       return res.status(200).json({
  //         status: "OK",
  //         message: "User Is Registered, Email Sent",
  //         id: userId,
  //       });
  //     } catch (error) {
  //       console.error("Create user error:", error);
  //       return res.status(500).json({
  //         status: "error",
  //         message: "Failed to create user",
  //       });
  //     }
  //   }
  async createUser(req, res) {
    console.log("Register Called ");
    try {
      const {
        name,
        client_image,
        company_name,
        gst_number,
        mobile,
        email,
        designation,
        street,
        street2,
        pincode,
        state_id,
        country_id,
        city,
        password,
        first_name,
        company_address,
        last_name,
      } = req.body;

      // --- 1. PASSWORD VALIDATION ---
      if (!password || password.length < 8) {
        return res.status(400).json({
          status: "error",
          message: "Password must be at least 8 characters long",
        });
      }

      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({
          status: "error",
          message: "Password must contain at least one uppercase letter",
        });
      }

      // --- 1.5. GST NUMBER FORMAT VALIDATION ---
      if (gst_number && !/^[A-Z0-9]+$/.test(gst_number)) {
        return res.status(400).json({
          status: "error",
          message: "GST number should contain only uppercase letters and numeric characters",
        });
      }

      // --- 2. UNIQUE EMAIL CHECK ---
      const existingUsers = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id"]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Already Registered Email",
        });
      }

      // --- 3. UNIQUE GST (VAT) CHECK ---
      const existingGST = await odooService.searchRead(
        "res.partner",
        [["vat", "=", gst_number]],
        ["id"]
      );

      if (existingGST && existingGST.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "GST Number already registered with another account",
        });
      }

      // --- 4. GST VALIDATION (Autocomplete Check) ---
      const gstValidation = await odooService.execute(
        "res.partner",
        "autocomplete_by_vat",
        [gst_number, parseInt(country_id)],
        { timeout: 15 }
      );

      if (!gstValidation || gstValidation.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Invalid GST number",
        });
      }

      // --- 5. IMAGE CLEANING ---
      let cleanImage = null;
      if (client_image) {
        cleanImage = client_image.replace(/^data:image\/\w+;base64,/, "");
      }

      // --- 6. FETCH SUPERADMIN COMPANY ---
      const superadminUser = await odooService.searchRead(
        "res.users",
        [["id", "=", 2]],
        ["company_id"]
      );

      if (!superadminUser || superadminUser.length === 0) {
        throw new Error("Superadmin user not found");
      }

      const superadminCompanyId = superadminUser[0].company_id[0];

      // --- 7. PREPARE USER VALUES ---
      const userVals = {
        name: company_name,
        company_name: company_name,
        email: email,
        login: email,
        vat: gst_number,
        function: designation,
        street: street,
        street2: street2,
        city: city,
        zip: pincode,
        state_id: parseInt(state_id),
        country_id: parseInt(country_id),
        password: password,
        company_ids: [[6, 0, [superadminCompanyId]]],
        company_id: superadminCompanyId,
        l10n_in_gst_treatment: "regular",
        first_name: first_name,
        last_name: last_name,
        mobile: mobile,
        company_address: company_address,
        image_1920: cleanImage,
      };

      // --- 8. CREATE USER AND UPDATE PARTNER ---
      let userId;
      try {
        userId = await odooService.create("res.users", userVals);
      } catch (createError) {
        // Check if it's a duplicate login error
        if (createError.message && createError.message.includes('same login')) {
          return res.status(409).json({
            status: "error",
            message: "Already Registered Email",
          });
        }
        // Check if it's a duplicate GST error
        if (createError.message && createError.message.includes('vat')) {
          return res.status(409).json({
            status: "error",
            message: "GST Number already registered with another account",
          });
        }
        // Re-throw other errors
        throw createError;
      }

      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", userId]],
        ["partner_id", "employee_ids"]
      );

      const companyPartnerId = userData[0].partner_id[0];
      await odooService.write("res.partner", [companyPartnerId], {
        company_type: "company",
        name: company_name,
        is_from_konvert_hr_portal: true,
        customer_rank: 1,
      });

      // --- UPDATED: UPDATE EMPLOYEE PASSWORD AND ADDRESS_ID ---
      if (userData[0].employee_ids && userData[0].employee_ids.length > 0) {
        const employeeId = userData[0].employee_ids[0];
        try {
          await odooService.write("hr.employee", [employeeId], {
            employee_password: password,
            address_id: companyPartnerId, // ADDED: Assign user's partner_id to employee's address_id
          });
          console.log(`Employee password and address_id set for employee ID: ${employeeId}`);
          console.log(`Partner ID ${companyPartnerId} assigned to employee address_id`);
        } catch (empError) {
          console.error("Error setting employee data:", empError);
        }
      }

      // Create Child Contact
      const childContactVals = {
        parent_id: companyPartnerId,
        type: "contact",
        name: `${first_name} ${last_name}`,
        email: email,
        phone: mobile,
        phone_res: mobile,
        mobile: mobile,
        function: designation,
      };
      await odooService.create("res.partner", childContactVals);

      // --- 9. SEND WELCOME MAIL ---
      await mailService.sendMail(
        email,
        "Welcome to Kavach Global",
        `<!DOCTYPE html>
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
          <tr>
            <td style="background-color: #5f5cc4; height: 8px;"></td>
          </tr>
          
          <tr>
            <td style="padding: 50px 60px;">
              <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 600; color: #1a1a1a;">Welcome to Kavach Global!</h1>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hello ${name},</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Thank you for registering with Kavach Global Private Limited. We are thrilled to have you on board!
              </p>
              
              <div style="background-color: #f0f7ff; border-left: 4px solid #5f5cc4; padding: 20px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                  Your Account is Ready
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
                  You can now access all features and services available on our platform. Feel free to explore and reach out if you need any assistance.
                </p>
              </div>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                If you have any questions or need support, please do not hesitate to contact us. We are here to help!
              </p>
              
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                We look forward to serving you.
              </p>
              
              <p style="margin: 40px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>Best regards,<br>Kavach Global Private Limited</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #5f5cc4; height: 8px;"></td>
          </tr>
        </table>
        
        <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
          <tr>
            <td style="padding: 0 60px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.6;">
                This email was sent to ${email}. If you did not create an account, please contact our support team immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
      );

      return res.status(200).json({
        status: "OK",
        message: "User Is Registered, Email Sent",
        id: userId,
      });
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create user",
      });
    }
  }
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ status: "error", message: "Email and Password are required" });
      }

      const userRecord = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id", "login", "name", "first_name", "last_name", "partner_id", "unique_user_id", "is_client_employee_user", "is_client_employee_admin"]
      );

      if (!userRecord || userRecord.length === 0) {
        return res.status(404).json({ status: "error", message: "User not found. Please signup." });
      }

      let user = userRecord[0];
      const userPartnerId = user.partner_id?.[0];

      const commonClient = odooService.createClient("/xmlrpc/2/common");

      let uid;
      try {
        uid = await new Promise((resolve, reject) => {
          commonClient.methodCall("authenticate", [odooService.db, email, password, {}], (err, authUid) => {
            if (err || !authUid) reject(new Error("Incorrect password"));
            else resolve(authUid);
          });
        });
      } catch (authError) {
        return res.status(401).json({ status: "error", message: "Incorrect password" });
      }

      if (!uid) return;

      let planCheckPartnerId = userPartnerId;
      let employeeId = null;
      let adminUserIdFromEmployee = null;

      if (user.is_client_employee_user) {
        const employeeRecord = await odooService.searchRead(
          "hr.employee",
          [["user_id", "=", user.id]],
          ["id", "address_id"],
          1
        );

        if (employeeRecord && employeeRecord.length > 0) {
          employeeId = employeeRecord[0].id;
          if (employeeRecord[0].address_id && employeeRecord[0].address_id[0]) {
            planCheckPartnerId = employeeRecord[0].address_id[0];

            const adminUser = await odooService.searchRead(
              "res.users",
              [["partner_id", "=", planCheckPartnerId], ["is_client_employee_admin", "=", true]],
              ["id"],
              1
            );
            if (adminUser && adminUser.length > 0) adminUserIdFromEmployee = adminUser[0].id;
          }
        }
      }

      // Check if user has ever bought any plan (active or expired)
      const anyPlan = await odooService.searchRead(
        "client.plan.details",
        [["partner_id", "=", planCheckPartnerId]],
        ["id"],
        1
      );

      if (!anyPlan || anyPlan.length === 0) {
        return res.status(403).json({
          status: "error",
          message: "Sorry, you didn't buy any plan. Please purchase a plan to continue.",
          plan_status: "NOT_PURCHASED"
        });
      }

      // Check for active plan
      const plan = await odooService.searchRead(
        "client.plan.details",
        [
          ["partner_id", "=", planCheckPartnerId],
          ["is_expier", "=", true]
        ],
        ["id", "product_id", "start_date", "end_date"],
        1
      );

      let planData = (plan && plan.length > 0) ? plan[0] : null;

      if (planData && userPartnerId === planCheckPartnerId && !user.is_client_employee_admin) {
        await odooService.write("res.users", [user.id], { is_client_employee_admin: true });
        user.is_client_employee_admin = true;
      }

      const isAdminUser = user.is_client_employee_admin === true;
      const isEmployeeUser = user.is_client_employee_user === true;
      const full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      const token = jwt.sign({ userId: uid, email }, process.env.JWT_SECRET, { expiresIn: "7d" });


      if (isAdminUser) {
        if (!planData) {
          return res.status(403).json({
            status: "error",
            message: "Your plan has expired. Please renew.",
            plan_status: "EXPIRED"
          });
        }
        return res.status(200).json({
          status: "success",
          message: "Logged in as Admin. Plan is active.",
          unique_user_id: user.unique_user_id,
          user_id: uid,
          email,
          full_name,
          user_role: "REGISTER_ADMIN",
          plan_status: "ACTIVE",
          plan_id: planData.id,
          product_id: planData.product_id,
          plan_start_date: planData.start_date,
          plan_end_date: planData.end_date,
        });
      }
      else if (isEmployeeUser) {
        if (!planData) {
          return res.status(403).json({
            status: "error",
            message: "Sorry, you can't login because your plan is expired.",
            plan_status: "EXPIRED"
          });
        }
        return res.status(200).json({
          status: "success",
          message: "Logged in as Employee. Plan is Active",
          user_id: uid,
          email,
          full_name,
          user_role: "EMPLOYEE_RELATED_OWN_USER",
          plan_status: "ACTIVE",
          is_client_employee_user: true,
          employee_id: employeeId,
          admin_user_id: adminUserIdFromEmployee,
          // plan_id: planData?.id || null,
          // product_id: planData?.product_id || null,
          // plan_start_date: planData?.start_date || null,
          // plan_end_date: planData?.end_date || null,
        });
      }
      else {
        return res.status(403).json({ status: "error", message: "You are not authorized. Please signup first." });
      }

    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  }
  async loginMarketingPage(req, res) {
    try {
      console.log("🔥 Login API called");
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and Password are required",
        });
      }

      // Validate email format
      const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!validEmailRegex.test(email)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid email format",
        });
      }

      // Search for user in Odoo
      const userRecord = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        [
          "id",
          "login",
          "name",
          "first_name",
          "last_name",
        ]
      );

      if (!userRecord || userRecord.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found. Please signup.",
        });
      }

      const user = userRecord[0];
      const full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim();

      // Authenticate with Odoo
      const commonClient = odooService.createClient("/xmlrpc/2/common");
      const uid = await new Promise((resolve, reject) => {
        commonClient.methodCall(
          "authenticate",
          [odooService.db, email, password, {}],
          (err, uid) => {
            if (err || !uid) reject(new Error("Incorrect password"));
            else resolve(uid);
          }
        );
      }).catch((err) => {
        return res.status(401).json({
          status: "error",
          message: err.message || "Authentication failed",
        });
      });

      if (!uid) return;

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: uid,
          email,
          name: user.name,
          odoo_username: email,
          odoo_password: password,
          odoo_db: odooService.db,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Return success response
      return res.status(200).json({
        status: "success",
        message: "Login successful",
        user_id: uid,
        email,
        name: user.name,
        full_name,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to login",
      });
    }
  }
  async getStates(req, res) {
    try {
      const states = await odooService.searchRead(
        "res.country.state",
        [],
        ["id", "name", "country_id"]
      );

      const data = states.map((state) => ({
        id: state.id,
        name: state.name,
        country: state.country_id[0],
        country_name: state.country_id[1],
      }));

      return res.status(200).json({
        status: "success",
        count: data.length,
        data: data,
      });
    } catch (error) {
      console.error("Get states error:", error);
      return res.status(200).json({
        status: "error",
        message: "Failed to fetch states",
      });
    }
  }

  async createJobPosition(req, res) {
    try {
      const {
        name,
        department_id,
        no_of_recruitment,
        skill_ids,
        industry_id,
        contract_type_id,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Job Position name is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const existingJob = await odooService.searchRead(
        "hr.job",
        [
          ["name", "=", name],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existingJob.length) {
        return res.status(409).json({
          status: "error",
          message: "Job Position with this name already exists",
        });
      }
      let valid_department_id = false;

      if (department_id) {
        const department = await odooService.searchRead(
          "hr.department",
          [["id", "=", department_id]],
          ["id"],
          1
        );

        if (!department.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid department_id",
          });
        }

        valid_department_id = department_id;
      }

      let valid_skill_ids = [];

      if (Array.isArray(skill_ids) && skill_ids.length) {
        for (const id of skill_ids) {
          const skill = await odooService.searchRead(
            "hr.skill",
            [["id", "=", id]],
            ["id"],
            1
          );

          if (!skill.length) {
            return res.status(400).json({
              status: "error",
              message: `Invalid skill_id: ${id}`,
            });
          }

          valid_skill_ids.push(id);
        }
      }

      let valid_industry_id = false;

      if (industry_id) {
        const industry = await odooService.searchRead(
          "res.partner.industry",
          [
            ["id", "=", industry_id],
            ["client_id", "=", client_id],
          ],
          ["id"],
          1
        );

        if (!industry.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid industry_id",
          });
        }

        valid_industry_id = industry_id;
      }
      let valid_contract_type_id = false;

      if (contract_type_id) {
        const contract = await odooService.searchRead(
          "hr.contract.type",
          [
            ["id", "=", contract_type_id],
            ["client_id", "=", client_id],
          ],
          ["id"],
          1
        );

        if (!contract.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid contract_type_id",
          });
        }

        valid_contract_type_id = contract_type_id;
      }
      const vals = {
        name,
        client_id,
        department_id: valid_department_id,
        no_of_recruitment: no_of_recruitment || 0,
        skill_ids: [[6, 0, valid_skill_ids]],
        industry_id: valid_industry_id,
        contract_type_id: valid_contract_type_id,
      };

      const jobId = await odooService.create("hr.job", vals);

      return res.status(201).json({
        status: "success",
        message: "Job Position created successfully",
        job_id: jobId,
      });
    } catch (error) {
      console.error("❌ Create Job Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to create job position",
      });
    }
  }

  async getJobPositions(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const jobs = await odooService.searchRead(
        "hr.job",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "department_id",
          "no_of_recruitment",
          "industry_id",
          "contract_type_id",
          "skill_ids",
        ]
      );

      const data = jobs.map((job) => ({
        job_id: job.id,
        name: job.name,
        department_id: job.department_id?.[0] || null,
        department_name: job.department_id?.[1] || null,
        no_of_recruitment: job.no_of_recruitment,
        industry_id: job.industry_id?.[0] || null,
        industry_name: job.industry_id?.[1] || null,
        contract_type_id: job.contract_type_id?.[0] || null,
        contract_type_name: job.contract_type_id?.[1] || null,
        skill_ids: job.skill_ids || [],
      }));

      return res.status(200).json({
        status: "success",
        message: "Job positions fetched successfully",
        data,
      });
    } catch (error) {
      console.error("❌ Get Job Positions Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch job positions",
      });
    }
  }
  async updateJobPosition(req, res) {
    try {
      const { job_id } = req.params;

      if (!job_id) {
        return res.status(400).json({
          status: "error",
          message: "job_id is required",
        });
      }

      const {
        name,
        department_id,
        no_of_recruitment,
        skill_ids,
        industry_id,
        contract_type_id,
      } = req.body;

      const { client_id } = await getClientFromRequest(req);

      // Check job exists
      const job = await odooService.searchRead(
        "hr.job",
        [
          ["id", "=", parseInt(job_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!job.length) {
        return res.status(404).json({
          status: "error",
          message: "Job Position not found",
        });
      }

      // Duplicate name check
      if (name) {
        const duplicate = await odooService.searchRead(
          "hr.job",
          [
            ["name", "=", name],
            ["client_id", "=", client_id],
            ["id", "!=", parseInt(job_id)],
          ],
          ["id"],
          1
        );

        if (duplicate.length) {
          return res.status(400).json({
            status: "error",
            message: "Job Position name already exists",
          });
        }
      }

      // ------------------------------------
      // Validate Department ID
      // ------------------------------------
      let valid_department_id = false;
      if (department_id) {
        const dep = await odooService.searchRead(
          "hr.department",
          [["id", "=", department_id]],
          ["id"],
          1
        );

        if (!dep.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid department_id",
          });
        }

        valid_department_id = department_id;
      }

      // ------------------------------------
      // Validate Skill IDs
      // ------------------------------------
      let valid_skill_ids;
      if (Array.isArray(skill_ids)) {
        valid_skill_ids = [];

        for (const id of skill_ids) {
          const skill = await odooService.searchRead(
            "hr.skill",
            [["id", "=", id]],
            ["id"],
            1
          );

          if (!skill.length) {
            return res.status(400).json({
              status: "error",
              message: `Invalid skill_id: ${id}`,
            });
          }

          valid_skill_ids.push(id);
        }
      }

      // ------------------------------------
      // Validate Industry ID
      // ------------------------------------
      let valid_industry_id = false;
      if (industry_id) {
        const industry = await odooService.searchRead(
          "res.partner.industry",
          [
            ["id", "=", industry_id],
            ["client_id", "=", client_id],
          ],
          ["id"],
          1
        );

        if (!industry.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid industry_id",
          });
        }

        valid_industry_id = industry_id;
      }

      // ------------------------------------
      // Validate Contract Type ID
      // ------------------------------------
      let valid_contract_type_id = false;
      if (contract_type_id) {
        const contract = await odooService.searchRead(
          "hr.contract.type",
          [
            ["id", "=", contract_type_id],
            ["client_id", "=", client_id],
          ],
          ["id"],
          1
        );

        if (!contract.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid contract_type_id",
          });
        }

        valid_contract_type_id = contract_type_id;
      }

      // ------------------------------------
      // Build vals
      // ------------------------------------
      const vals = {};

      if (name) vals.name = name;
      if (department_id) vals.department_id = valid_department_id;
      if (no_of_recruitment !== undefined)
        vals.no_of_recruitment = no_of_recruitment;
      if (Array.isArray(skill_ids)) vals.skill_ids = [[6, 0, valid_skill_ids]];
      if (industry_id) vals.industry_id = valid_industry_id;
      if (contract_type_id) vals.contract_type_id = valid_contract_type_id;

      await odooService.write("hr.job", parseInt(job_id), vals);

      return res.status(200).json({
        status: "success",
        message: "Job Position updated successfully",
      });
    } catch (error) {
      console.error("❌ Update Job Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update job position",
      });
    }
  }

  async deleteJobPosition(req, res) {
    try {
      const { job_id } = req.params;

      if (!job_id) {
        return res.status(400).json({
          status: "error",
          message: "job_id is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const job = await odooService.searchRead(
        "hr.job",
        [
          ["id", "=", parseInt(job_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!job.length) {
        return res.status(404).json({
          status: "error",
          message: "Job Position not found",
        });
      }

      await odooService.unlink("hr.job", parseInt(job_id));

      return res.status(200).json({
        status: "success",
        message: "Job Position deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete Job Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to delete job position",
      });
    }
  }

  async createWorkLocation(req, res) {
    try {
      const { name, location_type } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Work Location name is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "hr.work.location",
        [
          ["name", "=", name.trim()],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Work Location with name '${name}' already exists`,
        });
      }
      const vals = {
        name: name.trim(),
        location_type: location_type || "office",
        client_id,
      };

      const locationId = await odooService.create("hr.work.location", vals);

      return res.status(201).json({
        status: "success",
        message: "Work Location created successfully",
        id: locationId,
      });
    } catch (error) {
      console.error("Create Work Location Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create work location",
      });
    }
  }

  async getWorkLocations(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);
      const locations = await odooService.searchRead(
        "hr.work.location",
        [["client_id", "=", client_id]],
        ["id", "name", "location_type"]
      );

      return res.status(200).json({
        status: "success",
        count: locations.length,
        data: locations,
      });
    } catch (error) {
      console.error("Get Work Locations Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch work locations",
      });
    }
  }

  async getWorkLocation(req, res) {
    try {
      const { id } = req.params;

      const location = await odooService.searchRead(
        "hr.work.location",
        [["id", "=", parseInt(id)]],
        ["id", "name", "company_id", "address_id", "location_type"],
        1
      );

      if (!location.length) {
        return res.status(200).json({
          status: "error",
          message: "Work location not found",
        });
      }

      return res.status(200).json({
        status: "success",
        data: location[0],
      });
    } catch (error) {
      console.error("Get Work Location Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch work location",
      });
    }
  }

  async updateWorkLocation(req, res) {
    try {
      const { id } = req.params;
      const { name, location_type } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: "error",
          message: "Valid Work Location ID is required",
        });
      }

      if (!name && !location_type) {
        return res.status(400).json({
          status: "error",
          message: "Nothing to update",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const exists = await odooService.searchRead(
        "hr.work.location",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id", "name"],
        1
      );

      if (!exists.length) {
        return res.status(404).json({
          status: "error",
          message: "Work location not found",
        });
      }
      if (name) {
        const duplicate = await odooService.searchRead(
          "hr.work.location",
          [
            ["name", "=", name.trim()],
            ["client_id", "=", client_id],
            ["id", "!=", parseInt(id)],
          ],
          ["id"],
          1
        );

        if (duplicate.length) {
          return res.status(409).json({
            status: "error",
            message: `Work Location with name '${name}' already exists`,
          });
        }
      }

      // ✅ UPDATE VALUES
      const vals = {
        ...(name && { name: name.trim() }),
        ...(location_type && { location_type }),
      };

      await odooService.write("hr.work.location", [parseInt(id)], vals);

      return res.status(200).json({
        status: "success",
        message: "Work location updated successfully",
      });
    } catch (error) {
      console.error("Update Work Location Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update work location",
      });
    }
  }

  async deleteWorkLocation(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          status: "error",
          message: "Valid Work Location ID is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const exists = await odooService.searchRead(
        "hr.work.location",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );
      if (!exists.length) {
        return res.status(404).json({
          status: "error",
          message: "Work location not found",
        });
      }
      await odooService.unlink("hr.work.location", [parseInt(id)]);
      return res.status(200).json({
        status: "success",
        message: "Work location deleted successfully",
      });
    } catch (error) {
      console.error("Delete Work Location Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete work location",
      });
    }
  }
  async createDepartment(req, res) {
    try {
      console.log("API Called createDepartment");
      const {
        name,
        parent_id,
        color,
        unit_code,
        range_start,
        range_end,
        is_no_range,
        is_lapse_allocation,
        wage,
        children,
      } = req.body;

      const { client_id } = await getClientFromRequest(req);

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Department name is required",
        });
      }
      const domain = [
        ["name", "=", name],
        ["client_id", "=", client_id],
      ];

      if (parent_id) {
        domain.push(["parent_id", "=", parseInt(parent_id)]);
      } else {
        domain.push(["parent_id", "=", false]);
      }

      const existing = await odooService.searchRead(
        "hr.department",
        domain,
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Department '${name}' already exists`,
        });
      }
      const vals = {
        name,
        parent_id: parent_id ? parseInt(parent_id) : false,
        color: color || 0,
        unit_code: unit_code || null,
        range_start: range_start || null,
        range_end: range_end || null,
        is_no_range: !!is_no_range,
        is_lapse_allocation: !!is_lapse_allocation,
        wage: wage || 0,
        client_id,
      };

      const parentId = await odooService.create("hr.department", vals);
      const childIds = [];

      if (children && Array.isArray(children)) {
        for (const child of children) {
          const childVals = {
            ...child,
            parent_id: parentId,
            client_id,
          };

          const childId = await odooService.create("hr.department", childVals);
          childIds.push(childId);
        }
      }

      return res.status(201).json({
        status: "success",
        message: "Department created successfully",
        parentId,
        childIds,
      });
    } catch (error) {
      console.error("Create Department Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create department",
      });
    }
  }
async getDepartments(req, res) {
  console.log("getDepartments API Called .........");
  try {
    const { client_id } = await getClientFromRequest(req);
    
    const departments = await fetchOdooRecords(
      "hr.department",
      client_id,
      [
        "id",
        "name",
        "parent_id",
        "color",
        "unit_code",
        "range_start",
        "range_end",
        "is_no_range",
        "is_lapse_allocation",
        "wage",
      ]
    );
    
    return res.status(200).json({
      status: "success",
      message: "Your plan is active",
      data: departments,
    });
  } catch (error) {
    console.error("Get Departments Error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch departments",
    });
  }
}
  async updateDepartment(req, res) {
    try {
      const id = parseInt(req.params.id);

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Department ID is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const department = await odooService.searchRead(
        "hr.department",
        [
          ["id", "=", id],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!department.length) {
        return res.status(404).json({
          status: "error",
          message: "Department not found or does not belong to this client",
        });
      }
      const { user_id, unique_user_id, ...updateData } = req.body;
      const updated = await odooService.write("hr.department", id, updateData);

      if (!updated) {
        return res.status(500).json({
          status: "error",
          message: "Failed to update department",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Department updated successfully",
      });
    } catch (error) {
      console.error("Update Department Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update department",
      });
    }
  }
  async deleteDepartment(req, res) {
    try {
      const id = parseInt(req.params.id);

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Department ID is required",
        });
      }

      // 🔑 Client + Plan check using helper
      const { client_id } = await getClientFromRequest(req);

      // 🔎 Check ownership
      const department = await odooService.searchRead(
        "hr.department",
        [
          ["id", "=", id],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!department.length) {
        return res.status(404).json({
          status: "error",
          message: "Department not found or does not belong to this client",
        });
      }

      // ✅ Delete
      const deleted = await odooService.unlink("hr.department", id);

      if (!deleted) {
        return res.status(500).json({
          status: "error",
          message: "Failed to delete department",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Department deleted successfully",
      });
    } catch (error) {
      console.error("Delete Department Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete department",
      });
    }
  }
  async sendTempPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "Email is required"
        });
      }

      const user = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id", "name"]
      );

      if (!user || user.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Email not found"
        });
      }

      const userId = user[0].id;
      const userName = user[0].name || "User";

      // Generate random temporary password
      const randomTempPass = Math.random().toString(36).slice(-10) + "A1!";

      // --- DISABLE PASSWORD IN res.users (Set to random unusable value) ---
      try {
        const disabledPassword = `DISABLED_${Date.now()}_${Math.random().toString(36)}`;
        await odooService.write("res.users", [userId], {
          password: disabledPassword
        });
        console.log(`✓ Password disabled in res.users for user ${userId}`);
      } catch (odooError) {
        console.error("✗ Failed to disable password in Odoo:", odooError);
        return res.status(500).json({
          status: "error",
          message: "Failed to disable password"
        });
      }

      // --- DISABLE PASSWORD IN hr.employee ---
      try {
        const employee = await odooService.searchRead(
          "hr.employee",
          [["user_id", "=", userId]],
          ["id"]
        );

        if (employee && employee.length > 0) {
          const employeeId = employee[0].id;
          await odooService.write("hr.employee", [employeeId], {
            employee_password: ""  // Clear employee password
          });
          console.log(`✓ Password cleared in hr.employee for employee ${employeeId}`);
        }
      } catch (empError) {
        console.error("✗ Failed to clear employee password:", empError);
      }

      // Store temp password in Redis with 5-minute expiry
      await redisClient.set(`tempPass:${email}`, randomTempPass, { EX: 300 });

      const emailHTML = `<!DOCTYPE html>
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
          <tr><td style="background-color: #5f5cc4; height: 8px;"></td></tr>
          <tr>
            <td style="padding: 50px 60px;">
              <h1 style="margin: 0 0 30px 0; font-size: 32px; font-weight: 600; color: #1a1a1a;">Reset Your Password</h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">Hi ${userName},</p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                We have received your request to reset your password.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #ff6b6b;">
                <strong>Important:</strong> Your old password has been disabled and will no longer work.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Your temporary password for verification is:
              </p>
              <div style="background-color: #f8f8f8; border-left: 4px solid #5f5cc4; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #5f5cc4; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                  ${randomTempPass}
                </p>
              </div>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                This temporary password will expire in <strong>5 minutes</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Please use this code to verify your identity and set a new password.
              </p>
              <p style="margin: 30px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">Thank you.</p>
              <p style="margin: 40px 0 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                <strong>Best regards,<br>Kavach Team</strong>
              </p>
            </td>
          </tr>
          <tr><td style="background-color: #5f5cc4; height: 8px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await mailService.sendMail(email, "Reset Your Password", emailHTML);

      return res.status(200).json({
        status: "success",
        message: "Temporary password sent to your email",
      });
    } catch (error) {
      console.error("Send temp password error:", error);
      return res.status(500).json({
        status: "error",
        message: "Something went wrong"
      });
    }
  }


  async resetPassword(req, res) {
    try {
      const { email, temp_password, new_password, confirm_password } = req.body;

      if (!email || !temp_password || !new_password || !confirm_password) {
        return res
          .status(400)
          .json({ status: "error", message: "All fields are required" });
      }

      if (new_password !== confirm_password) {
        return res
          .status(400)
          .json({ status: "error", message: "Passwords do not match" });
      }

      const user = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id"]
      );

      if (!user || user.length === 0) {
        return res
          .status(400)
          .json({ status: "error", message: "Email not found" });
      }

      const userId = user[0].id;

      const savedTempPass = await redisClient.get(`tempPass:${email}`);

      if (!savedTempPass) {
        return res.status(400).json({
          status: "error",
          message: "Temporary password expired",
        });
      }

      if (savedTempPass !== temp_password) {
        return res.status(400).json({
          status: "error",
          message: "Temporary password is incorrect",
        });
      }

      // Update password in res.users
      await odooService.write("res.users", [userId], {
        password: new_password,
      });

      // 🔥 NEW: Update employee_password in hr.employee
      const employee = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", userId]],
        ["id"]
      );

      if (employee && employee.length > 0) {
        const employeeId = employee[0].id;

        await odooService.write("hr.employee", [employeeId], {
          employee_password: new_password,
        });
      }

      // Delete temp password from Redis
      await redisClient.del(`tempPass:${email}`);

      return res.status(200).json({
        status: "success",
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }

  async kavachUserCreation(req, res) {
    console.log("Kavach Signup API called");
    try {
      const { name, email, temp_password, new_password } = req.body;
      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "Email is required",
        });
      }

      if (temp_password && new_password) {
        const savedTempData = await redisClient.get(`tempPass:${email}`);
        if (!savedTempData) {
          return res.status(404).json({
            status: "error",
            message: "Temporary password expired or not requested",
          });
        }

        const { name: savedName, password: savedTempPassword } =
          JSON.parse(savedTempData);

        if (savedTempPassword !== temp_password) {
          return res.status(401).json({
            status: "error",
            message: "Incorrect temporary password",
          });
        }

        console.log(savedName, email);
        console.log(name, email);
        const partnerId = await odooService.create("res.partner", {
          name: savedName,
          email: email,
          password: new_password,
          type: "contact",
          company_type: "person",
          mobile: "N/A",
          is_kavach_services: true,
        });

        await redisClient.del(`tempPass:${email}`);
        return res.status(200).json({
          status: "success",
          message: "Partner created successfully",
          id: partnerId,
        });
      }
      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Name is required",
        });
      }
      const existingPartner = await odooService.searchRead(
        "res.partner",
        [
          ["email", "=", email],
          ["is_kavach_services", "=", true],
        ],
        ["id"]
      );

      if (existingPartner.length > 0) {
        return res.status(400).json({
          status: "error",
          message:
            "Partner already exists with Kavach services. Please verify your temporary password.",
        });
      }

      const generatedTempPassword =
        Math.random().toString(36).slice(-10) + "A1!";

      await redisClient.set(
        `tempPass:${email}`,
        JSON.stringify({ name, password: generatedTempPassword }),
        { EX: 600 } // 10 minutes
      );
      await mailService.sendMail(
        email,
        "Verify Your Kavach Account",
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Kavach Account</title>
        <style>
        /* Resets */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; }

        /* Client Specific Styles */
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

        /* Mobile Styles */
        @media screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
        .stack-column-center { text-align: center !important; }
        .center-on-mobile { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; }
        }
        </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc;">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
        <td align="center">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(234, 88, 12, 0.1);">

        <tr>
        <td height="8" style="background: linear-gradient(90deg, #EAB308 0%, #EA580C 100%); background-color: #EA580C;"></td>
        </tr>

        <tr>
        <td style="padding: 40px 40px 20px 40px; text-align: center;">
        <img src="https://via.placeholder.com/150x50/ffffff/EA580C?text=KAVACH" alt="Kavach Global" width="150" style="display: block; margin: 0 auto; font-family: sans-serif; font-weight: bold; font-size: 24px; color: #EA580C;">
        </td>
        </tr>

        <tr>
        <td style="padding: 20px 40px 40px 40px; text-align: center;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827;">Welcome to Kavach Global!</h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 26px; color: #4B5563;">
        Hello ${name}! Thank you for registering with Kavach Global. To complete your account setup, please use the temporary password below.
        </p>

        <div style="background-color: #FFF7ED; border: 2px dashed #FDBA74; border-radius: 16px; padding: 24px; margin: 30px 0;">
        <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #9A3412; font-weight: 600; margin-bottom: 8px;">Your Temporary Password</span>
        <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 4px; color: #EA580C; font-family: monospace;">${generatedTempPassword}</span>
        </div>

        <p style="margin: 0; font-size: 14px; color: #6B7280;">
        This temporary password is valid for <strong>10 minutes</strong>. <br>Please use it to verify your account and set your permanent password.
        </p>
        </td>
        </tr>

        <tr>
        <td style="background-color: #111827; padding: 30px 40px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #F3F4F6; font-weight: 600;">
        Kavach Global
        </p>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #9CA3AF; line-height: 18px;">
        A/53, 5th floor, New York Tower Thaltej,<br>S G Highway Ahmedabad - 380015
        </p>
        <div style="margin-top: 20px;">
        <a href="#" style="color: #FDBA74; font-size: 12px; text-decoration: none; margin: 0 10px;">Privacy Policy</a>
        <a href="#" style="color: #FDBA74; font-size: 12px; text-decoration: none; margin: 0 10px;">Support</a>
        </div>
        </td>
        </tr>

        </table>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
        <td style="padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; 2024 Kavach Global. All rights reserved.
        </td>
        </tr>
        </table>

        </td>
        </tr>
        </table>
        </body>
        </html>
      `
      );
      return res.status(200).json({
        status: "success",
        message: "Temporary password sent to email. Verify to create partner.",
      });
    } catch (error) {
      console.error("Create/Verify partner error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
  async kavachLogin(req, res) {
    console.log("Kavach Login API called");

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and password are required",
        });
      }
      const partner = await odooService.searchRead(
        "res.partner",
        [
          ["email", "=", email],
          ["is_kavach_services", "=", true],
        ],
        ["id", "name", "email", "password"]
      );

      if (partner.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const user = partner[0];
      if (!user.password) {
        return res.status(401).json({
          status: "error",
          message: "Password not set for this account",
        });
      }

      if (user.password !== password) {
        return res.status(401).json({
          status: "error",
          message: "Incorrect password",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
  async kavachForgotPassword(req, res) {
    try {
      const { email, otp, new_password, confirm_password } = req.body;
      if (otp && new_password && confirm_password) {
        if (new_password !== confirm_password) {
          return res.status(400).json({
            status: "error",
            message: "Passwords do not match",
          });
        }
        const keys = await redisClient.keys("forgotPassOTP:*");
        let userEmail = null;

        for (const key of keys) {
          const savedOTP = await redisClient.get(key);
          if (savedOTP === otp) {
            userEmail = key.replace("forgotPassOTP:", "");
            break;
          }
        }

        if (!userEmail) {
          return res.status(401).json({
            status: "error",
            message: "Invalid or expired OTP",
          });
        }
        const partner = await odooService.searchRead(
          "res.partner",
          [["email", "=", userEmail]],
          ["id"]
        );

        if (partner.length === 0) {
          return res.status(404).json({
            status: "error",
            message: "Partner not found",
          });
        }

        const partnerId = partner[0].id;
        await odooService.write("res.partner", partnerId, {
          password: new_password,
        });
        await redisClient.del(`forgotPassOTP:${userEmail}`);

        return res.status(200).json({
          status: "success",
          message: "Password reset successfully",
        });
      }

      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "Email is required",
        });
      }
      const partner = await odooService.searchRead(
        "res.partner",
        [["email", "=", email]],
        ["id", "name"]
      );

      if (partner.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "No account found with this email",
        });
      }

      const partnerName = partner[0].name;
      const generatedOTP = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      await redisClient.set(`forgotPassOTP:${email}`, generatedOTP, {
        EX: 180,
      });
      await mailService.sendMail(
        email,
        "Reset Your Kavach Password",
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
        /* Resets */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; }

        /* Client Specific Styles */
        a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

        /* Mobile Styles */
        @media screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .stack-column, .stack-column-center { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
        .stack-column-center { text-align: center !important; }
        .center-on-mobile { text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; }
        }
        </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc;">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
        <td align="center">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(234, 88, 12, 0.1);">

        <tr>
        <td height="8" style="background: linear-gradient(90deg, #EAB308 0%, #EA580C 100%); background-color: #EA580C;"></td>
        </tr>

        <tr>
        <td style="padding: 40px 40px 20px 40px; text-align: center;">
        <img src="https://via.placeholder.com/150x50/ffffff/EA580C?text=KAVACH" alt="Kavach Global" width="150" style="display: block; margin: 0 auto;">
        </td>
        </tr>

        <tr>
        <td style="padding: 20px 40px 40px 40px; text-align: center;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827;">Password Reset Request</h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 26px; color: #4B5563;">
        Hello ${partnerName}! We received a request to reset your Kavach Global password. Use the OTP below to proceed.
        </p>

        <div style="background-color: #FFF7ED; border: 2px dashed #FDBA74; border-radius: 16px; padding: 24px; margin: 30px 0;">
        <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #9A3412; font-weight: 600; margin-bottom: 8px;">Your OTP Code</span>
        <span style="display: block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #EA580C; font-family: monospace;">${generatedOTP}</span>
        </div>

        <p style="margin: 0; font-size: 14px; color: #6B7280;">
        This OTP is valid for <strong>3 minutes</strong>. <br>If you didn't request this, please ignore this email.
        </p>
        </td>
        </tr>

        <tr>
        <td style="background-color: #111827; padding: 30px 40px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #F3F4F6; font-weight: 600;">
        Kavach Global
        </p>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #9CA3AF; line-height: 18px;">
        A/53, 5th floor, New York Tower Thaltej,<br>S G Highway Ahmedabad - 380015
        </p>
        </td>
        </tr>

        </table>

        </td>
        </tr>
        </table>
        </body>
        </html>
      `
      );

      return res.status(200).json({
        status: "success",
        message: "OTP sent to your email. Valid for 3 minutes.",
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }

  async planActivation(req, res) {
    try {
      const { email, secret_key } = req.body;
      if (!email || !secret_key) {
        return res.status(400).json({
          status: "error",
          message: "Email and secret_key are required",
        });
      }
      const users = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id", "partner_id"],
        1
      );
      if (!users || users.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found with this email",
        });
      }
      const partnerId = users[0].partner_id?.[0];
      if (!partnerId) {
        return res.status(404).json({
          status: "error",
          message: "Partner not linked with user",
        });
      }
      const planDetails = await odooService.searchRead(
        "client.plan.details",
        [
          ["partner_id", "=", partnerId],
          ["secret_key", "=", secret_key],
        ],
        ["id", "is_expier", "product_id", "start_date", "end_date"],
        1
      );
      if (!planDetails || planDetails.length === 0) {
        return res.status(401).json({
          status: "error",
          message: "Invalid secret key or plan not found",
        });
      }

      const plan = planDetails[0];

      if (plan.is_expier) {
        return res.status(403).json({
          status: "error",
          message: "Plan has expired",
        });
      }
      return res.status(200).json({
        status: "OK",
        message: "Plan verified successfully",
        data: {
          partner_id: partnerId,
          plan_id: plan.id,
          product_id: plan.product_id,
          start_date: plan.start_date,
          end_date: plan.end_date,
        },
      });
    } catch (error) {
      console.error("Plan Activation Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to verify plan activation",
      });
    }
  }
  async getTimezones(req, res) {
    try {
      const fields = await odooService.execute(
        "res.users",
        "fields_get",
        [["tz"]],
        { attributes: ["string", "selection", "type"] }
      );

      const data = (fields.tz.selection || []).map(([value, label]) => ({
        value,
        label,
      }));

      return res.status(200).json({
        status: "success",
        count: data.length,
        data,
      });
    } catch (error) {
      console.error("Get timezones error:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to fetch timezones",
      });
    }
  }
  async createWorkEntryType(req, res) {
    try {
      let {
        name,
        code,
        external_code,
        sequence,
        color,
        is_unforeseen,
        is_leave,
        round_days,
      } = req.body;
      if (!name || !code || !external_code || !round_days) {
        return res.status(400).json({
          status: "error",
          message: "name, code, external_code and round_days are required",
        });
      }

      const VALID_ROUNDING = ["NO", "HALF", "FULL"];
      if (!VALID_ROUNDING.includes(round_days)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid round_days value (${round_days})`,
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "hr.work.entry.type",
        [
          ["code", "=", code],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Work Entry Type with code '${code}' already exists`,
        });
      }
      const vals = {
        name,
        code,
        external_code,
        round_days,
        client_id,
        sequence: sequence ? parseInt(sequence) : 10,
        color: color ? parseInt(color) : 0,
        is_unforeseen: !!is_unforeseen,
        is_leave: !!is_leave,
      };

      const id = await odooService.create("hr.work.entry.type", vals);

      return res.status(201).json({
        status: "success",
        message: "Work Entry Type created successfully",
        id,
      });
    } catch (error) {
      console.error("Create Work Entry Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create work entry type",
      });
    }
  }
  async getWorkEntryTypes(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const workEntryTypes = await odooService.searchRead(
        "hr.work.entry.type",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "code",
          "external_code",
          "round_days",
          "sequence",
          "color",
          "is_unforeseen",
          "is_leave",
        ]
      );

      return res.status(200).json({
        status: "success",
        message: "Your plan is active",
        data: workEntryTypes,
      });
    } catch (error) {
      console.error("Get Work Entry Types Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch work entry types",
      });
    }
  }
  async updateWorkEntryType(req, res) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Work entry type ID is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);
      const exists = await odooService.searchRead(
        "hr.work.entry.type",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!exists.length) {
        return res.status(404).json({
          status: "error",
          message:
            "Work entry type not found or does not belong to this client",
        });
      }

      const {
        user_id,
        unique_user_id,
        client_id: _client,
        ...updateVals
      } = req.body;

      if (Object.keys(updateVals).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }

      await odooService.write("hr.work.entry.type", parseInt(id), updateVals);

      return res.status(200).json({
        status: "success",
        message: "Work entry type updated successfully",
      });
    } catch (error) {
      console.error("Update Work Entry Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update work entry type",
      });
    }
  }
  async deleteWorkEntryType(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Work entry type ID is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);

      const workEntryType = await odooService.searchRead(
        "hr.work.entry.type",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!workEntryType.length) {
        return res.status(404).json({
          status: "error",
          message:
            "Work entry type not found or does not belong to this client",
        });
      }
      const result = await odooService.unlink(
        "hr.work.entry.type",
        parseInt(id)
      );

      if (!result) {
        return res.status(500).json({
          status: "error",
          message: "Failed to delete work entry type",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Work entry type deleted successfully",
      });
    } catch (error) {
      console.error("Delete Work Entry Type Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete work entry type",
      });
    }
  }
  async createSkill(req, res) {
    console.log("....... Skill Creation Process Started ........");
    try {
      let {
        skill_type_name,
        skill_names,
        skill_level_name,
        level_progress,
        default_level,
      } = req.body;
      if (
        !skill_type_name ||
        !Array.isArray(skill_names) ||
        skill_names.length === 0 ||
        !skill_level_name
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "skill_type_name, skill_names[] and skill_level_name are required",
        });
      }

      if (
        level_progress !== undefined &&
        (level_progress < 0 || level_progress > 100)
      ) {
        return res.status(400).json({
          status: "error",
          message: "level_progress must be between 0 and 100",
        });
      }
      const { client_id: finalClientId } = await getClientFromRequest(req);

      let skillTypeId;

      const existingSkillType = await odooService.searchRead(
        "hr.skill.type",
        [
          ["name", "=", skill_type_name],
          ["client_id", "=", finalClientId],
        ],
        ["id"],
        1
      );

      if (existingSkillType.length) {
        skillTypeId = existingSkillType[0].id;
      } else {
        skillTypeId = await odooService.create("hr.skill.type", {
          name: skill_type_name,
          client_id: finalClientId,
        });

        if (!skillTypeId) {
          return res.status(500).json({
            status: "error",
            message: "Failed to create skill type",
          });
        }
      }
      const createdSkills = [];
      const skippedSkills = [];

      for (const skill_name of skill_names) {
        const existingSkill = await odooService.searchRead(
          "hr.skill",
          [
            ["name", "=", skill_name],
            ["skill_type_id", "=", skillTypeId],
          ],
          ["id"],
          1
        );

        if (existingSkill.length) {
          skippedSkills.push(skill_name);
          continue;
        }

        const skillId = await odooService.create("hr.skill", {
          name: skill_name,
          skill_type_id: skillTypeId,
        });

        if (skillId) {
          createdSkills.push({
            skill_name,
            skill_id: skillId,
          });
        }
      }
      let skillLevelId;

      const existingSkillLevel = await odooService.searchRead(
        "hr.skill.level",
        [
          ["name", "=", skill_level_name],
          ["skill_type_id", "=", skillTypeId],
        ],
        ["id"],
        1
      );

      if (existingSkillLevel.length) {
        skillLevelId = existingSkillLevel[0].id;
      } else {
        skillLevelId = await odooService.create("hr.skill.level", {
          name: skill_level_name,
          skill_type_id: skillTypeId,
          level_progress: level_progress ? parseInt(level_progress) : 0,
          default_level: !!default_level,
        });

        if (!skillLevelId) {
          return res.status(500).json({
            status: "error",
            message: "Failed to create skill level",
          });
        }
      }
      return res.status(201).json({
        status: "success",
        message: "Skill Type, Skills and Skill Level processed successfully",
        data: {
          skill_type_id: skillTypeId,
          skill_level_id: skillLevelId,
          created_skills: createdSkills,
          skipped_skills: skippedSkills,
        },
      });
    } catch (error) {
      console.error("❌ Create Skill Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create skill",
      });
    }
  }
  async getSkills(req, res) {
    try {
      const { client_id: finalClientId } = await getClientFromRequest(req);
      const skillTypes = await odooService.searchRead(
        "hr.skill.type",
        [["client_id", "=", finalClientId]],
        ["id", "name"]
      );

      const result = [];

      for (const type of skillTypes) {
        const skills = await odooService.searchRead(
          "hr.skill",
          [["skill_type_id", "=", type.id]],
          ["id", "name"]
        );

        const levels = await odooService.searchRead(
          "hr.skill.level",
          [["skill_type_id", "=", type.id]],
          ["id", "name", "level_progress", "default_level"]
        );

        result.push({
          skill_type_id: type.id,
          skill_type_name: type.name,
          skills,
          levels,
        });
      }

      return res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      console.error("❌ Get Skills Error:", error);

      return res.status(error.status || 401).json({
        status: "error",
        message: error.message || "Unauthorized request",
      });
    }
  }
  async updateSkill(req, res) {
    try {
      const { skill_type_id } = req.params;
      const { skill_names, skill_level_name, level_progress, default_level } = req.body;

      if (!skill_type_id) {
        return res.status(400).json({ status: "error", message: "skill_type_id is required" });
      }

      const { client_id } = await getClientFromRequest(req);

      const skillType = await odooService.searchRead(
        "hr.skill.type",
        [["id", "=", parseInt(skill_type_id)], ["client_id", "=", client_id]],
        ["id"],
        1
      );

      if (!skillType.length) {
        return res.status(403).json({ status: "error", message: "Unauthorized or Skill Type not found" });
      }

      const addedSkills = [];
      let removedCount = 0; // Initialize count

      if (Array.isArray(skill_names)) {
        const currentOdooSkills = await odooService.searchRead(
          "hr.skill",
          [["skill_type_id", "=", parseInt(skill_type_id)]],
          ["id", "name"]
        );

        const currentOdooSkillNames = currentOdooSkills.map(s => s.name);

        // Identify skills to delete
        const skillsToDelete = currentOdooSkills.filter(s => !skill_names.includes(s.name));

        if (skillsToDelete.length > 0) {
          const idsToDelete = skillsToDelete.map(s => s.id);
          await odooService.unlink("hr.skill", idsToDelete);
          removedCount = idsToDelete.length; // Set the count here
        }

        // Identify skills to add
        for (const name of skill_names) {
          if (!currentOdooSkillNames.includes(name)) {
            const id = await odooService.create("hr.skill", {
              name,
              skill_type_id: parseInt(skill_type_id),
            });
            addedSkills.push({ name, id });
          }
        }
      }

      let updatedLevel = null;
      if (skill_level_name) {
        const existingLevel = await odooService.searchRead(
          "hr.skill.level",
          [["skill_type_id", "=", parseInt(skill_type_id)], ["name", "=", skill_level_name]],
          ["id"],
          1
        );

        if (existingLevel.length) {
          await odooService.write("hr.skill.level", [existingLevel[0].id], {
            ...(level_progress !== undefined && { level_progress: parseInt(level_progress) }),
            ...(default_level !== undefined && { default_level: !!default_level }),
          });
          updatedLevel = existingLevel[0].id;
        }
      }

      return res.json({
        status: "success",
        message: "Skills synchronized successfully",
        data: {
          added_skills: addedSkills,
          removed_count: removedCount, // Now properly scoped
          updated_level_id: updatedLevel,
        },
      });
    } catch (error) {
      console.error("❌ Update Skill Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update skill",
      });
    }
  }
  async deleteSkill(req, res) {
    console.log("....... Skill Delete Process Started ........");

    try {
      const { skill_type_id } = req.params;

      if (!skill_type_id) {
        return res.status(400).json({
          status: "error",
          message: "skill_type_id is required",
        });
      }
      await getClientFromRequest(req);
      const skills = await odooService.searchRead(
        "hr.skill",
        [["skill_type_id", "=", parseInt(skill_type_id)]],
        ["id"]
      );

      if (skills.length) {
        await odooService.unlink(
          "hr.skill",
          skills.map((s) => s.id)
        );
      }
      const levels = await odooService.searchRead(
        "hr.skill.level",
        [["skill_type_id", "=", parseInt(skill_type_id)]],
        ["id"]
      );

      if (levels.length) {
        await odooService.unlink(
          "hr.skill.level",
          levels.map((l) => l.id)
        );
      }
      await odooService.unlink("hr.skill.type", [parseInt(skill_type_id)]);

      return res.status(200).json({
        status: "success",
        message: "Skill Type, Skills and Skill Levels deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete Skill Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete skills",
      });
    }
  }
  async createIndustry(req, res) {
    try {
      const { name, full_name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Industry name is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "res.partner.industry",
        [
          ["name", "=", name],
          ["client_id", "=", client_id],
          ["active", "=", true],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: "Industry already exists",
        });
      }

      const industryId = await odooService.create("res.partner.industry", {
        name,
        full_name: full_name || name,
        client_id,
        active: true,
      });

      return res.status(201).json({
        status: "success",
        message: "Industry created successfully",
        id: industryId,
      });
    } catch (error) {
      console.error("❌ Create Industry Error:", error);
      return res.status(error.status || 401).json({
        status: "error",
        message: error.message || "Failed to create industry",
      });
    }
  }
  async getIndustries(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const industries = await odooService.searchRead(
        "res.partner.industry",
        [
          ["client_id", "=", client_id],
          ["active", "=", true],
        ],
        ["id", "name", "full_name"]
      );

      return res.status(200).json({
        status: "success",
        data: industries,
      });
    } catch (error) {
      console.error("❌ Get Industries Error:", error);
      return res.status(error.status || 401).json({
        status: "error",
        message: error.message || "Failed to fetch industries",
      });
    }
  }
  async updateIndustry(req, res) {
    try {
      const { industry_id } = req.params;
      const { name, full_name, active } = req.body;

      if (!industry_id) {
        return res.status(400).json({
          status: "error",
          message: "industry_id is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);
      const industry = await odooService.searchRead(
        "res.partner.industry",
        [
          ["id", "=", parseInt(industry_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!industry.length) {
        return res.status(404).json({
          status: "error",
          message: "Industry not found",
        });
      }

      await odooService.write("res.partner.industry", [parseInt(industry_id)], {
        ...(name && { name }),
        ...(full_name && { full_name }),
        ...(active !== undefined && { active }),
      });

      return res.status(200).json({
        status: "success",
        message: "Industry updated successfully",
      });
    } catch (error) {
      console.error("❌ Update Industry Error:", error);
      return res.status(error.status || 401).json({
        status: "error",
        message: error.message || "Failed to update industry",
      });
    }
  }
  async deleteIndustry(req, res) {
    try {
      const { industry_id } = req.params;

      if (!industry_id) {
        return res.status(400).json({
          status: "error",
          message: "industry_id is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const industry = await odooService.searchRead(
        "res.partner.industry",
        [
          ["id", "=", parseInt(industry_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!industry.length) {
        return res.status(404).json({
          status: "error",
          message: "Industry not found",
        });
      }

      await odooService.write("res.partner.industry", [parseInt(industry_id)], {
        active: false,
      });

      return res.status(200).json({
        status: "success",
        message: "Industry Deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete Industry Error:", error);
      return res.status(error.status || 401).json({
        status: "error",
        message: error.message || "Failed to delete industry",
      });
    }
  }

  async createHrContractType(req, res) {
    try {
      const { name, code, client_id, country_name } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Contract Type name is required",
        });
      }

      const clientData = await getClientFromRequest(req);
      const finalClientId = client_id || clientData.client_id;

      let country_id = null;
      if (country_name) {
        const countries = await odooService.searchRead(
          "res.country",
          [["name", "=", country_name]],
          ["id"],
          1
        );
        if (countries.length) {
          country_id = countries[0].id;
        } else {
          return res.status(400).json({
            status: "error",
            message: `Country '${country_name}' not found`,
          });
        }
      }
      const existing = await odooService.searchRead(
        "hr.contract.type",
        [
          ["name", "=", name],
          ["client_id", "=", finalClientId],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: "HR Contract Type already exists",
        });
      }

      const contractTypeId = await odooService.create("hr.contract.type", {
        name,
        code: code || name,
        client_id: finalClientId,
        country_id,
      });

      return res.status(201).json({
        status: "success",
        message: "HR Contract Type created successfully",
        id: contractTypeId,
      });
    } catch (error) {
      console.error("❌ Create HR Contract Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create HR Contract Type",
      });
    }
  }
  async getHrContractTypes(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const contractTypes = await odooService.searchRead(
        "hr.contract.type",
        [["client_id", "=", client_id]],
        ["id", "name", "code", "country_id"]
      );

      const contractTypesClean = await Promise.all(
        contractTypes.map(async (ct) => {
          let country_name = null;
          if (ct.country_id && ct.country_id[0]) {
            country_name = ct.country_id[1];
          }
          return {
            id: ct.id,
            name: ct.name,
            code: ct.code,
            country_name,
          };
        })
      );

      return res.status(200).json({
        status: "success",
        data: contractTypesClean,
      });
    } catch (error) {
      console.error("❌ Get HR Contract Types Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch HR Contract Types",
      });
    }
  }
  async updateHrContractType(req, res) {
    try {
      const { contract_type_id } = req.params;
      const { name, code, country_name } = req.body;

      if (!contract_type_id) {
        return res.status(400).json({
          status: "error",
          message: "contract_type_id is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const contractType = await odooService.searchRead(
        "hr.contract.type",
        [
          ["id", "=", parseInt(contract_type_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!contractType.length) {
        return res.status(404).json({
          status: "error",
          message: "HR Contract Type not found",
        });
      }

      let country_id = undefined;
      if (country_name) {
        const countries = await odooService.searchRead(
          "res.country",
          [["name", "=", country_name]],
          ["id"],
          1
        );
        if (countries.length) {
          country_id = countries[0].id;
        } else {
          return res.status(400).json({
            status: "error",
            message: `Country '${country_name}' not found`,
          });
        }
      }

      await odooService.write(
        "hr.contract.type",
        [parseInt(contract_type_id)],
        {
          ...(name && { name }),
          ...(code && { code }),
          ...(country_id && { country_id }),
        }
      );

      return res.status(200).json({
        status: "success",
        message: "HR Contract Type updated successfully",
      });
    } catch (error) {
      console.error("❌ Update HR Contract Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update HR Contract Type",
      });
    }
  }
  async deleteHrContractType(req, res) {
    try {
      const { contract_type_id } = req.params;

      if (!contract_type_id) {
        return res.status(400).json({
          status: "error",
          message: "contract_type_id is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const contractType = await odooService.searchRead(
        "hr.contract.type",
        [
          ["id", "=", parseInt(contract_type_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!contractType.length) {
        return res.status(404).json({
          status: "error",
          message: "HR Contract Type not found",
        });
      }

      await odooService.unlink("hr.contract.type", [
        parseInt(contract_type_id),
      ]);

      return res.status(200).json({
        status: "success",
        message: "HR Contract Type deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete HR Contract Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete HR Contract Type",
      });
    }
  }
  async createWorkingSchedule(req, res) {
    try {
      const {
        name,
        flexible_hours,
        is_night_shift,
        full_time_required_hours,
        hours_per_day,
        tz,
        total_overtime_hours_allowed,
        attendance_ids,
      } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Working Schedule name is required",
        });
      }

      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;
      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: error.message || "Either user_id or unique_user_id is required",
        });
      }

      const existing = await odooService.searchRead(
        "resource.calendar",
        [
          ["name", "=", name],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing && existing.length > 0) {
        return res.status(409).json({
          status: "error",
          message: `A working schedule named ${name} already exists for this client.`,
        });
      }

      if (!flexible_hours && hours_per_day !== undefined) {
        return res.status(400).json({
          status: "error",
          message: "Average Hour per Day is allowed only when Flexible Hours is true",
        });
      }

      const vals = {
        name,
        client_id,
        flexible_hours: !!flexible_hours,
        is_night_shift: !!is_night_shift,
        tz: tz || false,
        full_time_required_hours: full_time_required_hours !== undefined ? full_time_required_hours : 0,
        total_overtime_hours_allowed: total_overtime_hours_allowed !== undefined ? parseFloat(total_overtime_hours_allowed) : 0.0,
      };

      if (flexible_hours) {
        vals.hours_per_day = hours_per_day || 0;
      }

      if (attendance_ids && Array.isArray(attendance_ids) && attendance_ids.length > 0) {
        vals.attendance_ids = attendance_ids.map(attendance => {
          return [0, 0, {
            name: attendance.name,
            dayofweek: attendance.dayofweek, // '0' for Monday, '1' for Tuesday, etc.
            day_period: attendance.day_period, // 'morning', 'lunch', 'afternoon'
            hour_from: parseFloat(attendance.hour_from), // e.g., 8.0 for 08:00
            hour_to: parseFloat(attendance.hour_to), // e.g., 12.0 for 12:00
            work_entry_type_id: attendance.work_entry_type_id || false,
          }];
        });
      }

      const calendarId = await odooService.create("resource.calendar", vals);

      return res.status(201).json({
        status: "success",
        message: "Working schedule created successfully",
        calendar_id: calendarId,
      });
    } catch (error) {
      console.error("❌ Create Working Schedule Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to create working schedule",
      });
    }
  }
  async getWorkingSchedules(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const calendars = await odooService.searchRead(
        "resource.calendar",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "flexible_hours",
          "is_night_shift",
          "full_time_required_hours",
          "hours_per_day",
          "tz",
          "total_overtime_hours_allowed",
          "attendance_ids",
        ]
      );

      const calendarData = await Promise.all(
        calendars.map(async (cal) => {
          let attendances = [];

          if (!cal.flexible_hours && cal.attendance_ids?.length) {
            attendances = await odooService.searchRead(
              "resource.calendar.attendance",
              [["id", "in", cal.attendance_ids]],
              [
                "id",
                "name",
                "dayofweek",
                "day_period",
                "hour_from",
                "hour_to",
                "week_type",
                "work_entry_type_id",
              ]
            );
          }

          return {
            id: cal.id,
            name: cal.name,
            flexible_hours: cal.flexible_hours,
            is_night_shift: cal.is_night_shift,
            full_time_required_hours: cal.full_time_required_hours,
            hours_per_day: cal.hours_per_day || 0,
            tz: cal.tz || "UTC",
            total_overtime_hours_allowed: cal.total_overtime_hours_allowed || 0.0,
            client_id: cal.client_id,
            attendances: cal.flexible_hours ? [] : attendances,
          };
        })
      );

      return res.status(200).json({
        status: "success",
        count: calendarData.length,
        data: calendarData,
      });
    } catch (error) {
      console.error("❌ Get Working Schedules Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch working schedules",
      });
    }
  }
  async updateWorkingSchedule(req, res) {
    try {
      const { calendar_id } = req.params;
      const {
        name,
        flexible_hours,
        is_night_shift,
        full_time_required_hours,
        hours_per_day,
        tz,
        total_overtime_hours_allowed,
        attendance_ids, // New field for working hours
      } = req.body;

      if (!calendar_id) {
        return res.status(400).json({
          status: "error",
          message: "calendar_id is required",
        });
      }

      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;
      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: error.message || "Either user_id or unique_user_id is required",
        });
      }

      const existingSchedule = await odooService.searchRead(
        "resource.calendar",
        [
          ["id", "=", parseInt(calendar_id)],
          ["client_id", "=", client_id],
        ],
        ["id", "name"],
        1
      );

      if (!existingSchedule || existingSchedule.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Working schedule not found or does not belong to this client",
        });
      }

      if (name && name !== existingSchedule[0].name) {
        const duplicate = await odooService.searchRead(
          "resource.calendar",
          [
            ["name", "=", name],
            ["client_id", "=", client_id],
            ["id", "!=", parseInt(calendar_id)],
          ],
          ["id"],
          1
        );

        if (duplicate && duplicate.length > 0) {
          return res.status(409).json({
            status: "error",
            message: `A working schedule named ${name} already exists for this client.`,
          });
        }
      }

      if (!flexible_hours && hours_per_day !== undefined) {
        return res.status(400).json({
          status: "error",
          message: "Average Hour per Day is allowed only when Flexible Hours is true",
        });
      }

      const vals = {};
      if (name !== undefined) vals.name = name;
      if (flexible_hours !== undefined) vals.flexible_hours = !!flexible_hours;
      if (is_night_shift !== undefined) vals.is_night_shift = !!is_night_shift;
      if (tz !== undefined) vals.tz = tz || false;
      if (full_time_required_hours !== undefined) vals.full_time_required_hours = full_time_required_hours;
      if (total_overtime_hours_allowed !== undefined) vals.total_overtime_hours_allowed = parseFloat(total_overtime_hours_allowed);

      if (flexible_hours) {
        vals.hours_per_day = hours_per_day || 0;
      } else {
        vals.hours_per_day = false;
      }

      // Handle attendance_ids (working hours) update
      if (attendance_ids !== undefined) {
        if (Array.isArray(attendance_ids) && attendance_ids.length > 0) {
          // First, get existing attendance IDs to delete them
          const existingAttendances = await odooService.searchRead(
            "resource.calendar.attendance",
            [["calendar_id", "=", parseInt(calendar_id)]],
            ["id"]
          );

          // Delete all existing attendances
          const deleteCommands = existingAttendances.map(att => [2, att.id, 0]);

          // Create new attendances
          const createCommands = attendance_ids.map(attendance => {
            const attendanceData = {
              name: attendance.name,
              dayofweek: attendance.dayofweek,
              day_period: attendance.day_period,
              hour_from: parseFloat(attendance.hour_from),
              hour_to: parseFloat(attendance.hour_to),
            };

            // Add work_entry_type_id if provided
            if (attendance.work_entry_type_id) {
              attendanceData.work_entry_type_id = attendance.work_entry_type_id;
            }

            return [0, 0, attendanceData];
          });

          // Combine delete and create commands
          vals.attendance_ids = [...deleteCommands, ...createCommands];
        } else if (attendance_ids === null || (Array.isArray(attendance_ids) && attendance_ids.length === 0)) {
          // If null or empty array, delete all attendances
          const existingAttendances = await odooService.searchRead(
            "resource.calendar.attendance",
            [["calendar_id", "=", parseInt(calendar_id)]],
            ["id"]
          );
          vals.attendance_ids = existingAttendances.map(att => [2, att.id, 0]);
        }
      }

      await odooService.write("resource.calendar", [parseInt(calendar_id)], vals);

      return res.status(200).json({
        status: "success",
        message: "Working schedule updated successfully",
        calendar_id: parseInt(calendar_id),
      });
    } catch (error) {
      console.error("❌ Update Working Schedule Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update working schedule",
      });
    }
  }
  async deleteWorkingSchedule(req, res) {
    try {
      const { calendar_id } = req.params;

      if (!calendar_id) {
        return res.status(400).json({
          status: "error",
          message: "calendar_id is required",
        });
      }

      // Get client_id
      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;
      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: error.message || "Either user_id or unique_user_id is required",
        });
      }

      const existingSchedule = await odooService.searchRead(
        "resource.calendar",
        [
          ["id", "=", parseInt(calendar_id)],
          ["client_id", "=", client_id],
        ],
        ["id", "name"],
        1
      );

      if (!existingSchedule || existingSchedule.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Working schedule not found or does not belong to this client",
        });
      }
      await odooService.unlink("resource.calendar", [parseInt(calendar_id)]);

      return res.status(200).json({
        status: "success",
        message: "Working schedule deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete Working Schedule Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to delete working schedule",
      });
    }
  }
  async getDistricts(req, res) {
    try {
      const districts = await odooService.searchRead(
        "res.city",
        [],
        ["id", "name"]
      );

      const data = districts.map((district) => ({
        id: district.id,
        name: district.name,
      }));

      return res.status(200).json({
        status: "success",
        count: data.length,
        data: data,
      });
    } catch (error) {
      console.error("Get districts error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch districts",
        error: error.message,
      });
    }
  }
  async createShiftRoster(req, res) {
    try {
      const {
        name,
        auto_rotate,
        rotation_type,
        rotation_duration,
        rotation_start_date,
        resource_calendar_id,
        client_id,
        active,
      } = req.body;
      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Roster Name is required",
        });
      }
      const clientData = await getClientFromRequest(req);
      const finalClientId = client_id || clientData.client_id;
      const existing = await odooService.searchRead(
        "hr.shift.roster",
        [
          ["name", "=", name],
          ["client_id", "=", finalClientId],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: "Shift Roster already exists",
        });
      }
      const payload = {
        name,
        client_id: finalClientId,
        active: active !== undefined ? active : true,
        auto_rotate: auto_rotate || false,
        rotation_type: rotation_type || "day",
        rotation_duration: rotation_duration || 1,
        rotation_start_date: rotation_start_date || null,
        resource_calendar_id: resource_calendar_id || null,
      };

      const rosterId = await odooService.create("hr.shift.roster", payload);

      return res.status(201).json({
        status: "success",
        message: "Shift Roster created successfully",
        id: rosterId,
      });
    } catch (error) {
      console.error("❌ Create Shift Roster Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create Shift Roster",
      });
    }
  }
  async getShiftRosters(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);
      const rosters = await odooService.searchRead(
        "shift.roster",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "client_id",
          "active",
          "auto_rotate",
          "rotation_type",
          "rotation_duration",
          "rotation_start_date",
        ]
      );
      const data = rosters.map((item) => ({
        id: item.id,
        name: item.name,
        client_id: item.client_id ? item.client_id[0] : null,
        active: item.active,
        auto_rotate: item.auto_rotate,
        rotation_type: item.rotation_type,
        rotation_duration: item.rotation_duration,
        rotation_start_date: item.rotation_start_date,
      }));

      return res.status(200).json({
        status: "success",
        data,
      });
    } catch (error) {
      console.error("❌ Get Shift Rosters Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch shift rosters",
      });
    }
  }
  async createPartner(req, res) {
    try {
      console.log("API Called createPartner (Branches)");
      const {
        name,
        mobile,
        l10n_in_pan,
        vat,
        l10n_in_gst_treatment,
        street,
        street2,
        city,
        state_id,
        zip,
        country_id,
        email,
      } = req.body;

      const { client_id } = await getClientFromRequest(req);

      const requiredFields = {
        name,
        mobile,
        l10n_in_pan,
        vat,
        l10n_in_gst_treatment,
        street,
        street2,
        city,
        state_id,
        zip,
        country_id,
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          return res.status(400).json({
            status: "error",
            message: `${key} is required`,
          });
        }
      }
      const existing = await odooService.searchRead(
        "res.partner",
        [
          ["name", "=", name],
          ["parent_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Branch '${name}' already exists`,
        });
      }
      const vals = {
        name,
        mobile,
        l10n_in_pan,
        vat,
        l10n_in_gst_treatment,
        street,
        street2,
        city,
        state_id: parseInt(state_id),
        zip,
        country_id: parseInt(country_id),
        company_type: "company",
        is_from_konvert_hr_portal: true,
        parent_id: client_id,
        customer_rank: 1,
        supplier_rank: 0,
      };

      if (email) {
        vals.email = email;
      }

      console.log("partner branch payload --:", vals);
      const partnerId = await odooService.create("res.partner", vals);

      return res.status(200).json({
        status: "success",
        message: "branch created successfully",
        partnerId,
      });
    } catch (error) {
      console.error("Create branch Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to branch partner",
      });
    }
  }
  async getPartners(req, res) {
    try {
      console.log("API Called getPartners Branches .......");
      const { client_id } = await getClientFromRequest(req);

      const partners = await odooService.searchRead(
        "res.partner",
        [["parent_id", "=", client_id]],
        [
          "id",
          "name",
          "mobile",
          "email",
          "l10n_in_pan",
          "vat",
          "l10n_in_gst_treatment",
          "street",
          "street2",
          "city",
          "state_id",
          "zip",
          "country_id",
          "company_type",
          "is_from_konvert_hr_portal",
        ]
      );

      return res.status(200).json({
        status: "success",
        message: "Branches fetched successfully",
        data: partners,
      });
    } catch (error) {
      console.error("Get Branch Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch Branchs",
      });
    }
  }
  async updatePartner(req, res) {
    try {
      console.log("API Called updatePartner Branch");

      const { id } = req.params;
      const body = req.body;

      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "res.partner",
        [
          ["id", "=", parseInt(id)],
          ["parent_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Branch not found or unauthorized",
        });
      }
      for (const [key, value] of Object.entries(body)) {
        if (value === "" || value === null) {
          return res.status(400).json({
            status: "error",
            message: `${key} cannot be empty`,
          });
        }
      }
      const allowedFields = [
        "name",
        "mobile",
        "l10n_in_pan",
        "vat",
        "l10n_in_gst_treatment",
        "street",
        "street2",
        "city",
        "state_id",
        "zip",
        "country_id",
        "email",
      ];

      const vals = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if (["state_id", "country_id"].includes(field)) {
            vals[field] = parseInt(body[field]);
          } else {
            vals[field] = body[field];
          }
        }
      }
      await odooService.write("res.partner", parseInt(id), vals);

      return res.status(200).json({
        status: "success",
        message: "Branch updated successfully",
      });
    } catch (error) {
      console.error("Update Partner Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update Branch",
      });
    }
  }
  async deletePartner(req, res) {
    try {
      console.log("API Called deletePartner");

      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);
      const partner = await odooService.searchRead(
        "res.partner",
        [
          ["id", "=", parseInt(id)],
          ["parent_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!partner.length) {
        return res.status(404).json({
          status: "error",
          message: "Partner not found or unauthorized",
        });
      }
      await odooService.update("res.partner", parseInt(id), {
        active: false,
      });

      return res.status(200).json({
        status: "success",
        message: "Partner deleted successfully",
      });
    } catch (error) {
      console.error("Delete Partner Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete partner",
      });
    }
  }
  async createAttendance(req, res) {
    try {
      const {
        employee_id,
        check_in,
        check_out,
        checkin_lat,
        checkin_lon,
        checkout_lat,
        checkout_lon,
        system_version,
        user_agent,
        application_name,
        device_id,
        hardware,
        code_name,
        product,
        first_install_time,
        last_update_time,
        location,
        email,
        ip_address,
        android_id,
        brand,
        device,
        version,
        base_os,
      } = req.body;

      // Basic validations
      if (!employee_id) {
        return res.status(400).json({
          status: "error",
          message: "Employee ID is required",
        });
      }

      // Employee exists check
      const employeeExists = await odooService.searchRead(
        "hr.employee",
        [["id", "=", employee_id]],
        ["id"]
      );

      if (!employeeExists || employeeExists.length === 0) {
        return res.status(404).json({
          status: "error",
          message: `Employee with ID ${employee_id} not found`,
        });
      }

      // ✨ Determine if this is CHECK-IN or CHECK-OUT request
      const isCheckOut = check_out && check_out !== null && check_out !== "";
      const currentTime = isCheckOut ? new Date(check_out) : new Date(check_in);

      if (isNaN(currentTime.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid datetime format",
        });
      }

      // Get today's date range (start and end of day)
      const todayStart = new Date(currentTime);
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date(currentTime);
      todayEnd.setHours(23, 59, 59, 999);

      // ✨ Check if there's ANY attendance record for TODAY
      const todayAttendance = await odooService.searchRead(
        "hr.attendance",
        [
          ["employee_id", "=", employee_id],
          ["check_in", ">=", formatDateTimeForOdoo(todayStart)],
          ["check_in", "<=", formatDateTimeForOdoo(todayEnd)],
        ],
        ["id", "check_in", "check_out", "checkin_lat", "checkin_lon"],
        { order: "check_in desc", limit: 1 }
      );

      // ✨ CASE 1: CHECK-OUT Request (check_out field is provided)
      if (isCheckOut) {
        if (!todayAttendance || todayAttendance.length === 0) {
          return res.status(400).json({
            status: "error",
            message:
              "No active check-in found for today. Please check-in first.",
          });
        }

        const currentAttendance = todayAttendance[0];

        // Check if already checked out
        if (
          currentAttendance.check_out &&
          currentAttendance.check_out !== false
        ) {
          return res.status(400).json({
            status: "error",
            message: "Already checked out. Please check-in again to continue.",
            last_checkout: currentAttendance.check_out,
          });
        }

        // Validate checkout time
        const checkInDate = new Date(currentAttendance.check_in);
        const checkOutDate = new Date(check_out);

        if (checkOutDate <= checkInDate) {
          return res.status(400).json({
            status: "error",
            message: "Check-out time must be after check-in time",
          });
        }

        // UPDATE with checkout details
        await odooService.update("hr.attendance", currentAttendance.id, {
          check_out: formatDateTimeForOdoo(check_out), // ✅ Correct checkout time
          checkout_lat: checkout_lat || false,
          checkout_lon: checkout_lon || false,
        });

        return res.status(200).json({
          status: "success",
          message: "Check-out successful",
          action: "checkout",
          attendance_id: currentAttendance.id,
          check_in: currentAttendance.check_in,
          check_out: formatDateTimeForOdoo(check_out),
        });
      }

      // ✨ CASE 2: CHECK-IN Request (only check_in field is provided)

      // If today's attendance exists
      if (todayAttendance && todayAttendance.length > 0) {
        const currentAttendance = todayAttendance[0];

        // If currently working (not checked out yet)
        if (
          !currentAttendance.check_out ||
          currentAttendance.check_out === false
        ) {
          return res.status(400).json({
            status: "error",
            message: "Already checked in. Please check-out first.",
            current_checkin: currentAttendance.check_in,
          });
        }

        // If already checked out earlier today - RE-CHECKIN
        const lastCheckOut = new Date(currentAttendance.check_out);
        const newCheckIn = new Date(check_in);

        if (newCheckIn <= lastCheckOut) {
          return res.status(400).json({
            status: "error",
            message: "Check-in time must be after last check-out time",
            last_checkout: currentAttendance.check_out,
          });
        }

        // UPDATE same record with new check-in
        await odooService.update("hr.attendance", currentAttendance.id, {
          check_in: formatDateTimeForOdoo(check_in), // ✅ Update to latest check-in
          checkin_lat: checkin_lat || currentAttendance.checkin_lat,
          checkin_lon: checkin_lon || currentAttendance.checkin_lon,
          check_out: false, // Reset to "Currently Working"
          checkout_lat: false,
          checkout_lon: false,
          // Update device info
          system_version: system_version || "",
          user_agent: user_agent || "",
          application_name: application_name || "",
          device_id: device_id || "",
          location: location || "",
          ip_address: ip_address || "",
        });

        return res.status(200).json({
          status: "success",
          message: "Re-check-in successful (same day)",
          action: "re-checkin",
          attendance_id: currentAttendance.id,
          previous_checkout: currentAttendance.check_out,
          new_checkin: formatDateTimeForOdoo(check_in),
        });
      }

      // ✨ CASE 3: First check-in of the day (NEW record)
      if (!check_in) {
        return res.status(400).json({
          status: "error",
          message: "Check-in time is required",
        });
      }

      const attendanceData = {
        employee_id: employee_id,
        check_in: formatDateTimeForOdoo(check_in),
        checkin_lat: checkin_lat || false,
        checkin_lon: checkin_lon || false,
        system_version: system_version || "",
        user_agent: user_agent || "",
        application_name: application_name || "",
        device_id: device_id || "",
        hardware: hardware || "",
        code_name: code_name || "",
        product: product || "",
        first_install_time: first_install_time || "",
        last_update_time: last_update_time || "",
        location: location || "",
        email: email || "",
        ip_address: ip_address || "",
        android_id: android_id || "",
        brand: brand || "",
        device: device || "",
        version: version || "",
        base_os: base_os || "",
      };

      const attendanceId = await odooService.create(
        "hr.attendance",
        attendanceData
      );

      return res.status(201).json({
        status: "success",
        message: "Check-in successful (new day)",
        action: "checkin",
        attendance_id: attendanceId,
        check_in: formatDateTimeForOdoo(check_in),
      });
    } catch (error) {
      console.error("Error in attendance operation:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to process attendance",
        error: error.message,
      });
    }
  }

  async updateAttendance(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          status: "error",
          message: "Valid Attendance ID is required",
        });
      }

      const existingAttendance = await odooService.searchRead(
        "hr.attendance",
        [["id", "=", parseInt(id)]],
        ["id", "check_in"]
      );

      if (!existingAttendance || existingAttendance.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Attendance not found",
        });
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No fields to update",
        });
      }

      if (updateData.employee_id) {
        const employeeExists = await odooService.searchRead(
          "hr.employee",
          [["id", "=", updateData.employee_id]],
          ["id"]
        );

        if (!employeeExists || employeeExists.length === 0) {
          return res.status(404).json({
            status: "error",
            message: `Employee with ID ${updateData.employee_id} not found`,
          });
        }
      }

      if (updateData.check_in) {
        const checkInDate = new Date(updateData.check_in);
        if (isNaN(checkInDate.getTime())) {
          return res.status(400).json({
            status: "error",
            message: "Invalid Check In datetime format",
          });
        }
      }

      if (updateData.check_out) {
        const checkOutDate = new Date(updateData.check_out);
        if (isNaN(checkOutDate.getTime())) {
          return res.status(400).json({
            status: "error",
            message: "Invalid Check Out datetime format",
          });
        }

        const checkInTime =
          updateData.check_in || existingAttendance[0].check_in;
        if (new Date(updateData.check_out) <= new Date(checkInTime)) {
          return res.status(400).json({
            status: "error",
            message: "Check Out time must be after Check In time",
          });
        }
      }

      await odooService.write("hr.attendance", [parseInt(id)], updateData);

      return res.status(200).json({
        status: "success",
        message: "Attendance updated successfully",
        id: parseInt(id),
      });
    } catch (error) {
      console.error("Error updating attendance:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update Attendance",
        error: error.message,
      });
    }
  }
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
          status: "error",
          message: "Valid Attendance ID is required",
        });
      }

      const existingAttendance = await odooService.searchRead(
        "hr.attendance",
        [["id", "=", parseInt(id)]],
        ["id"]
      );

      if (!existingAttendance || existingAttendance.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Attendance not found",
        });
      }

      await odooService.unlink("hr.attendance", [parseInt(id)]);

      return res.status(200).json({
        status: "success",
        message: "Attendance deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to delete Attendance",
        error: error.message,
      });
    }
  }

  async createGeoLocation(req, res) {
    console.log("Called");
    try {
      const { name, latitude, longitude, radius_km, hr_employee_ids } =
        req.body;
      console.log("GEO Location api called with this ", req.body);
      const { client_id } = await getClientFromRequest(req);
      const requiredFields = {
        name,
        latitude,
        longitude,
        hr_employee_ids,
      };

      for (const [key, value] of Object.entries(requiredFields)) {
        if (value === undefined || value === null || value === "") {
          return res.status(400).json({
            status: "error",
            message: `${key} is required`,
          });
        }
      }
      if (!Array.isArray(hr_employee_ids)) {
        return res.status(400).json({
          status: "error",
          message: "hr_employee_ids must be an array of employee IDs",
        });
      }
      const employees = await odooService.searchRead(
        "hr.employee",
        [["id", "in", hr_employee_ids]],
        ["id"]
      );
      const validIds = employees.map((e) => e.id);
      const missingIds = hr_employee_ids.filter((id) => !validIds.includes(id));
      if (missingIds.length > 0) {
        return res.status(404).json({
          status: "error",
          message: `Employee(s) not found: ${missingIds.join(", ")}`,
        });
      }
      const existing = await odooService.searchRead(
        "geo.config",
        [
          ["name", "=", name],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length > 0) {
        return res.status(409).json({
          status: "error",
          message: `Geo location '${name}' already exists`,
        });
      }
      const vals = {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_km: radius_km ? parseFloat(radius_km) : 0,
        hr_employee_ids: [[6, 0, hr_employee_ids]],
        client_id,
      };
      console.log("Geo location payload -->", vals);
      const geoId = await odooService.create("geo.config", vals);
      return res.status(200).json({
        status: "success",
        message: "Geo location created successfully",
        geoId,
      });
    } catch (error) {
      console.error("Create Geo Location Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create geo location",
      });
    }
  }

  async getAllGeoLocations(req, res) {
    try {
      console.log("API Called: getAllGeoLocations");

      const { client_id } = await getClientFromRequest(req);
      console.log("✅ Extracted client_id from helper:", client_id);
      const geoLocations = await odooService.searchRead(
        "geo.config",
        [["client_id", "=", client_id]],
        ["id", "name", "latitude", "longitude", "radius_km", "hr_employee_ids"]
      );
      let allEmployeeIds = [];
      geoLocations.forEach((loc) => {
        if (Array.isArray(loc.hr_employee_ids)) {
          allEmployeeIds.push(...loc.hr_employee_ids);
        }
      });
      let employeeMap = {};
      if (allEmployeeIds.length > 0) {
        const employees = await odooService.searchRead(
          "hr.employee",
          [["id", "in", allEmployeeIds]],
          ["id", "name"]
        );
        console.log("👥 Employees Fetched:", employees);
        employees.forEach((emp) => {
          employeeMap[emp.id] = emp.name;
        });
      }
      const finalData = geoLocations.map((loc) => ({
        ...loc,
        employees: (loc.hr_employee_ids || []).map((empId) => ({
          id: empId,
          name: employeeMap[empId] || null,
        })),
      }));
      return res.status(200).json({
        status: "success",
        data: finalData,
      });
    } catch (error) {
      console.error("❌ Get Geo Locations Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch geo locations",
      });
    }
  }
  async updateGeoLocation(req, res) {
    try {
      console.log("API Called: updateGeoLocation");

      const { id } = req.params;
      const { name, latitude, longitude, radius_km, hr_employee_ids } =
        req.body;

      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "geo.config",
        [
          ["id", "=", id],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Geo location not found for this client",
        });
      }

      if (hr_employee_ids) {
        if (!Array.isArray(hr_employee_ids)) {
          return res.status(400).json({
            status: "error",
            message: "hr_employee_ids must be an array",
          });
        }

        const employees = await odooService.searchRead(
          "hr.employee",
          [["id", "in", hr_employee_ids]],
          ["id"]
        );

        const validIds = employees.map((e) => e.id);
        const missingIds = hr_employee_ids.filter(
          (id) => !validIds.includes(id)
        );

        if (missingIds.length > 0) {
          return res.status(404).json({
            status: "error",
            message: `Employee(s) not found: ${missingIds.join(", ")}`,
          });
        }
      }

      const vals = {};

      if (name) vals.name = name;
      if (latitude) vals.latitude = parseFloat(latitude);
      if (longitude) vals.longitude = parseFloat(longitude);
      if (radius_km) vals.radius_km = parseFloat(radius_km);
      if (hr_employee_ids) vals.hr_employee_ids = [[6, 0, hr_employee_ids]];

      console.log("Geo Location update payload -->", vals);

      await odooService.write("geo.config", parseInt(id), vals);

      return res.status(200).json({
        status: "success",
        message: "Geo location updated successfully",
      });
    } catch (error) {
      console.error("Update Geo Location Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update geo location",
      });
    }
  }
  async deleteGeoLocation(req, res) {
    try {
      console.log("API Called: deleteGeoLocation");

      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);

      const existing = await odooService.searchRead(
        "geo.config",
        [
          ["id", "=", id],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Geo location not found or does not belong to this client",
        });
      }

      await odooService.unlink("geo.config", parseInt(id));

      return res.status(200).json({
        status: "success",
        message: "Geo location deleted successfully",
      });
    } catch (error) {
      console.error("Delete Geo Location Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete geo location",
      });
    }
  }

  async createAttendanceRegularization(req, res) {
    try {
      const { employee_id, reg_reason, from_date, to_date, reg_category } =
        req.body;
      const { client_id } = await getClientFromRequest(req);
      const requiredFields = {
        employee_id,
        reg_reason,
        from_date,
        to_date,
        reg_category,
      };
      for (const [key, value] of Object.entries(requiredFields)) {
        if (!value) {
          return res.status(400).json({
            status: "error",
            message: `${key} is required`,
          });
        }
      }

      // ✅ DATE VALIDATION ADD KARO
      const fromDateObj = new Date(from_date);
      const toDateObj = new Date(to_date);

      if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date format. Please provide valid dates.",
        });
      }

      if (toDateObj < fromDateObj) {
        return res.status(400).json({
          status: "error",
          message: "End date cannot be earlier than start date",
        });
      }

      const now = new Date();
      if (fromDateObj > now || toDateObj > now) {
        return res.status(400).json({
          status: "error",
          message: "Future dates are not allowed",
        });
      }

      try {
        const categoryExists = await odooService.searchRead(
          "reg.categories",
          [["id", "=", parseInt(reg_category)]],
          ["id", "type", "client_id"],
          1
        );
        if (!categoryExists || categoryExists.length === 0) {
          console.log("❌ Category not found!");
          return res.status(400).json({
            status: "error",
            message: `Category not found. The reg_category ID '${reg_category}' does not exist.`,
          });
        }
      } catch (categoryError) {
        return res.status(400).json({
          status: "error",
          message: `Category validation failed: ${categoryError.message}`,
        });
      }
      const existing = await odooService.searchRead(
        "attendance.regular",
        [
          ["employee_id", "=", employee_id],
          ["from_date", "=", from_date],
          ["to_date", "=", to_date],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );
      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: "A regularization request already exists for this duration.",
        });
      }
      const vals = {
        employee_id: parseInt(employee_id),
        reg_reason,
        from_date,
        to_date,
        reg_category: parseInt(reg_category),
        state_select: "draft",
        client_id: client_id,
      };
      const regId = await odooService.create("attendance.regular", vals);
      try {
        const submitResult = await odooService.callMethod(
          "attendance.regular",
          "action_submit_reg",
          [regId]
        );
      } catch (submitError) {
        try {
          await odooService.delete("attendance.regular", regId);
        } catch (deleteError) { }
        return res.status(500).json({
          status: "error",
          message: "Failed to submit regularization request",
          details: submitError.message,
        });
      }
      return res.status(200).json({
        status: "success",
        message:
          "Attendance regularization request created and submitted successfully",
        regId,
      });
    } catch (error) {
      if (error.message) {
        if (error.message.includes("Future dates are not allowed")) {
          return res.status(400).json({
            status: "error",
            message: "Future dates are not allowed",
          });
        }
        if (error.message.includes("attendance_regular_reg_category_fkey")) {
          return res.status(400).json({
            status: "error",
            message: "Category not found. The provided reg_category does not exist in the system.",
          });
        }
      }

      return res.status(error.status || 500).json({
        status: "error",
        message:
          error.message || "Failed to create attendance regularization request",
      });
    }
  }
  async getAttendanceRegularization(req, res) {
    try {
      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;
      } catch (clientError) {
        console.error("❌ Client extraction failed:", clientError);
        return res.status(clientError.status || 400).json({
          status: "error",
          message: clientError.message || "Client identification failed",
        });
      }

      const records = await odooService.searchRead(
        "attendance.regular",
        [["client_id", "=", client_id]],
        [
          "id",
          "employee_id",
          "reg_reason",
          "from_date",
          "to_date",
          "reg_category",
          "state_select"
        ]
      );

      const enrichedRecords = await Promise.all(
        records.map(async (record) => {
          if (record.state_select === "reject") {
            let RejectedReason = null;

            try {
              const approvalRecords = await odooService.searchRead(
                "approval.request",
                [["attendance_regulzie_id", "=", record.id]],
                ["reason"]
              );

              if (approvalRecords && approvalRecords.length > 0) {
                RejectedReason = approvalRecords[0].reason || null;
              }
            } catch (err) {
              console.error(`Error fetching rejection reason for record ${record.id}:`, err);
            }

            return {
              ...record,
              RejectedReason
            };
          }
          return record;
        })
      );

      return res.status(200).json({
        status: "success",
        data: enrichedRecords,
      });
    } catch (error) {
      console.error("❌ Error fetching attendance regularization:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch regularization records",
      });
    }
  }
  async updateAttendanceRegularization(req, res) {
    try {
      console.log("API Called: updateAttendanceRegularization");
      const { id } = req.params;
      const updateData = req.body;
      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Record ID is required",
        });
      }
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Update data cannot be empty",
        });
      }
      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;
        console.log("✅ Extracted client_id from helper:", client_id);
      } catch (clientError) {
        console.error("❌ Client extraction failed:", clientError);
        return res.status(clientError.status || 400).json({
          status: "error",
          message: clientError.message || "Client identification failed",
        });
      }
      const recordId = parseInt(id, 10);
      const success = await odooService.write(
        "attendance.regular",
        [recordId],
        updateData
      );
      if (!success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to update record on Odoo",
        });
      }
      return res.status(200).json({
        status: "success",
        message: "Attendance regularization updated successfully",
      });
    } catch (error) {
      console.error(" Update regularization error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update regularization record",
      });
    }
  }
  async getRegCategories(req, res) {
    try {
      console.log("API Called getRegCategories");
      const { client_id } = await getClientFromRequest(req);

      const categories = await fetchOdooRecords(
        "reg.categories",
        client_id,
        ["id", "type", "client_id"]
      );

      return res.status(200).json({
        status: "success",
        data: categories,
      });
    } catch (error) {
      console.error("Fetch categories error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch categories",
      });
    }
  }

  async updateRegCategory(req, res) {
    try {
      console.log("API Called updateRegCategory");

      const { id } = req.params;
      const body = req.body;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Category ID is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "reg.categories",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Category not found or unauthorized",
        });
      }

      for (const [key, value] of Object.entries(body)) {
        if (value === "" || value === null) {
          return res.status(400).json({
            status: "error",
            message: `${key} cannot be empty`,
          });
        }
      }
      const allowedFields = ["type"];
      const vals = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          vals[field] = body[field];
        }
      }

      if (Object.keys(vals).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No valid fields to update",
        });
      }
      const success = await odooService.write(
        "reg.categories",
        [parseInt(id)],
        vals
      );

      if (!success) {
        return res.status(400).json({
          status: "error",
          message: "Failed to update category",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Category updated successfully",
      });
    } catch (error) {
      console.error("Update category error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update category",
      });
    }
  }
  async deleteRegCategory(req, res) {
    try {
      console.log("API Called deleteRegCategory");

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Category ID is required",
        });
      }

      // 1️⃣ Get client_id
      const { client_id } = await getClientFromRequest(req);

      // 2️⃣ Check if category exists and belongs to the client
      const existing = await odooService.searchRead(
        "reg.categories",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Category not found or unauthorized",
        });
      }

      // 3️⃣ Delete record
      const success = await odooService.unlink("reg.categories", [
        parseInt(id),
      ]);

      if (!success) {
        return res.status(500).json({
          status: "error",
          message: "Failed to delete category",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete category error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete category",
      });
    }
  }
  async createRegCategory(req, res) {
    try {
      console.log("API Called createRegCategory");

      const { type } = req.body;
      if (!type) {
        return res.status(400).json({
          status: "error",
          message: "type is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const existing = await odooService.searchRead(
        "reg.categories",
        [
          ["type", "=", type],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Category '${type}' already exists`,
        });
      }

      const vals = {
        type,
        client_id: client_id,
      };

      console.log("Regularization Category Payload:", vals);

      const categoryId = await odooService.create("reg.categories", vals);

      return res.status(200).json({
        status: "success",
        message: "Regularization category created successfully",
        categoryId,
      });
    } catch (error) {
      console.error("Create Reg Category Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create regularization category",
      });
    }
  }


  // async getAdminAttendances(req, res) {
  //   try {
  //     const {
  //       user_id,
  //       date_from,
  //       date_to,
  //       limit = 100,
  //       offset = 0,
  //     } = req.query;

  //     console.log("📥 Request Query Params:", req.query);

  //     if (!user_id) {
  //       return res.status(400).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: "user_id is required",
  //       });
  //     }

  //     console.log("🔍 Admin Attendance Fetch - user_id:", user_id);

  //     const partner = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", parseInt(user_id)]],
  //       ["id", "partner_id"]
  //     );
  //     console.log("👤 Partner Data:", partner);

  //     if (!partner.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Partner not found for user_id: ${user_id}`,
  //       });
  //     }

  //     const partnerId = partner[0].partner_id?.[0];
  //     console.log("🆔 Partner ID:", partnerId);

  //     const adminEmployee = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", partnerId]],
  //       ["id", "address_id"]
  //     );
  //     console.log("👨‍💼 Admin Employee Data:", adminEmployee);

  //     if (!adminEmployee.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Employee not found for partner ${partnerId}`,
  //       });
  //     }

  //     const client_id = adminEmployee[0].address_id?.[0];
  //     console.log("🏢 Client ID:", client_id);

  //     console.log("\n📊 Fetching Custom Method Stats...");

  //     const totalEmployees = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_number_of_employee",
  //       [[], client_id]
  //     );
  //     console.log("✅ Total Employees:", totalEmployees);

  //     const Presentemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_present_employee",
  //       [[], false, false, client_id]
  //     );

  //     const TotalLateemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_late_employee",
  //       [[], false, false, client_id]
  //     );

  //     const Ununiformendemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_uninformed_employee",
  //       [client_id]
  //     );
  //     console.log("❓ Uninformed Employees:", Ununiformendemployee);

  //     const TodayAbsetEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_employees_no_attendance_today",
  //       [client_id]
  //     );
  //     console.log("🚫 Today Absent Employees:", TodayAbsetEmployee);

  //     const ApprovedLeaveOfEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_permited_employee",
  //       [client_id]
  //     );
  //     console.log("✅ Approved Leave Employees:", ApprovedLeaveOfEmployee);

  //     console.log("\n👥 Fetching All Employees for client_id:", client_id);
  //     const allEmployees = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", client_id]],
  //       ["id", "name", "job_id"]
  //     );
  //     console.log("📋 All Employees Count:", allEmployees.length);
  //     console.log("📋 All Employees Data:", JSON.stringify(allEmployees, null, 2));

  //     if (!allEmployees.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: "No employees found for this client_id",
  //       });
  //     }

  //     const employeeIds = allEmployees.map((e) => e.id);
  //     console.log("🔢 Employee IDs:", employeeIds);

  //     let domain = [["employee_id", "in", employeeIds]];
  //     if (date_from) domain.push(["check_in", ">=", date_from]);
  //     if (date_to) domain.push(["check_in", "<=", date_to]);
  //     console.log("🔍 Attendance Domain:", JSON.stringify(domain));

  //     const FIELDS = [
  //       "employee_id",
  //       "check_in",
  //       "checkin_lat",
  //       "checkin_lon",
  //       "check_out",
  //       "checkout_lat",
  //       "checkout_lon",
  //       "worked_hours",
  //       "early_out_minutes",
  //       "overtime_hours",
  //       "is_early_out",
  //       "validated_overtime_hours",
  //       "is_late_in",
  //       "late_time_display",
  //       "status_code",
  //     ];

  //     console.log("\n📅 Fetching Attendance Records...");
  //     const attendances = await odooService.searchRead(
  //       "hr.attendance",
  //       domain,
  //       FIELDS,
  //       parseInt(offset),
  //       parseInt(limit),
  //       "check_in desc"
  //     );
  //     console.log("📊 Attendance Records Count:", attendances.length);
  //     console.log("📊 First 3 Attendance Records:", JSON.stringify(attendances.slice(0, 3), null, 2));

  //     const convertToIST = (utcDateStr) => {
  //       if (!utcDateStr) return null;
  //       const utcDate = new Date(utcDateStr + " UTC");
  //       const istOffset = 5.5 * 60 * 60 * 1000;
  //       const istDate = new Date(utcDate.getTime() + istOffset);
  //       return istDate.toISOString().slice(0, 19).replace("T", " ");
  //     };

  //     const attendanceIds = attendances.map((a) => a.id);
  //     console.log("🆔 Attendance IDs:", attendanceIds);

  //     let breakLines = [];
  //     if (attendanceIds.length > 0) {
  //       console.log("\n☕ Fetching Break Lines...");
  //       breakLines = await odooService.searchRead(
  //         "hr.attendance.line",
  //         [["attendance_id", "in", attendanceIds]],
  //         ["attendance_id", "break_start", "break_end", "break_hours"]
  //       );
  //       console.log("☕ Break Lines Count:", breakLines.length);
  //       console.log("☕ Break Lines Data:", JSON.stringify(breakLines, null, 2));
  //     }

  //     const breakMap = {};
  //     breakLines.forEach((line) => {
  //       const attId = line.attendance_id?.[0];
  //       breakMap[attId] = line;
  //     });
  //     console.log("🗺️ Break Map Keys:", Object.keys(breakMap));

  //     const attendancesByEmployee = {};
  //     attendances.forEach((att) => {
  //       const empId = att.employee_id?.[0];
  //       if (!attendancesByEmployee[empId]) {
  //         attendancesByEmployee[empId] = [];
  //       }
  //       attendancesByEmployee[empId].push(att);
  //     });
  //     console.log("\n👥 Attendances by Employee:");
  //     Object.entries(attendancesByEmployee).forEach(([empId, atts]) => {
  //       console.log(`  Employee ${empId}: ${atts.length} attendance record(s)`);
  //     });

  //     console.log("\n🔄 Building Final Data...");
  //     const finalData = allEmployees
  //       .map((emp) => {
  //         const empAttendances = attendancesByEmployee[emp.id] || [];

  //         if (empAttendances.length > 0) {
  //           console.log(`  ✓ Employee ${emp.id} (${emp.name}): ${empAttendances.length} records`);
  //           return empAttendances.map((att) => {
  //             const breakLine = breakMap[att.id];
  //             return {
  //               id: att.id,
  //               employee_id: att.employee_id,

  //               check_in: convertToIST(att.check_in),
  //               checkin_lat: att.checkin_lat,
  //               checkin_lon: att.checkin_lon,

  //               check_out: convertToIST(att.check_out),
  //               checkout_lat: att.checkout_lat,
  //               checkout_lon: att.checkout_lon,

  //               worked_hours: att.worked_hours,
  //               early_out_minutes: att.early_out_minutes,
  //               overtime_hours: att.overtime_hours,
  //               validated_overtime_hours: att.validated_overtime_hours,

  //               is_late_in: att.is_late_in,
  //               late_time_display: att.late_time_display,
  //               is_early_out: att.is_early_out,
  //               status_code: att.status_code,

  //               break_start: convertToIST(breakLine?.break_start),
  //               break_end: convertToIST(breakLine?.break_end),
  //               break_hours: breakLine?.break_hours || null,

  //               job_id: emp.job_id || null,
  //               job_name: emp.job_id ? emp.job_id[1] : null,
  //             };
  //           });
  //         } else {
  //           console.log(`  ✗ Employee ${emp.id} (${emp.name}): No attendance records`);
  //           return [
  //             {
  //               id: null,
  //               employee_id: [emp.id, emp.name],

  //               check_in: null,
  //               checkin_lat: null,
  //               checkin_lon: null,

  //               check_out: null,
  //               checkout_lat: null,
  //               checkout_lon: null,

  //               worked_hours: null,
  //               early_out_minutes: null,
  //               overtime_hours: null,
  //               validated_overtime_hours: null,

  //               is_late_in: null,
  //               late_time_display: null,
  //               is_early_out: null,
  //               status_code: null,

  //               break_start: null,
  //               break_end: null,
  //               break_hours: null,

  //               job_id: emp.job_id || null,
  //               job_name: emp.job_id ? emp.job_id[1] : null,
  //             },
  //           ];
  //         }
  //       })
  //       .flat();

  //     console.log("\n📦 Final Data Count:", finalData.length);
  //     console.log("\n📊 Meta Summary:");
  //     console.log("  - Total Attendance Records:", finalData.length);
  //     console.log("  - Total Employees:", allEmployees.length);
  //     console.log("  - Custom Method - Total Employees:", totalEmployees);
  //     console.log("  - Custom Method - Present:", Presentemployee);
  //     console.log("  - Custom Method - Late:", TotalLateemployee);
  //     console.log("  - Custom Method - Uninformed:", Ununiformendemployee);
  //     console.log("  - Custom Method - Absent Today:", TodayAbsetEmployee);
  //     console.log("  - Custom Method - Approved Leave:", ApprovedLeaveOfEmployee);

  //     return res.status(200).json({
  //       success: true,
  //       status: "success",
  //       successMessage: "Admin attendance records fetched",
  //       data: finalData,
  //       meta: {
  //         total_Attendace_records: finalData.length,
  //         total_employees: allEmployees.length,
  //         limit: parseInt(limit),
  //         offset: parseInt(offset),
  //         admin_partner_id: partnerId,
  //         admin_address_id: client_id,
  //         TotalEmployee: totalEmployees,
  //         Presentemployee: Presentemployee,
  //         TotalLateemployee: TotalLateemployee,
  //         Ununiformendemployee: Ununiformendemployee,
  //         TodayAbsetEmployee: TodayAbsetEmployee,
  //         ApprovedLeaveOfEmployee: ApprovedLeaveOfEmployee,
  //       },
  //     });
  //   } catch (error) {
  //     console.error("🔥 Admin Attendance Error:", error);
  //     console.error("🔥 Error Stack:", error.stack);
  //     return res.status(500).json({
  //       success: false,
  //       status: "error",
  //       errorMessage: error.message || "Failed to fetch admin attendance",
  //     });
  //   }
  // }

  async getAdminAttendances(req, res) {
    try {
      const {
        user_id,
        date_from,
        date_to,
        limit = 100,
        offset = 0,
      } = req.query;

      console.log("📥 Request Query Params:", req.query);

      if (!user_id) {
        return res.status(400).json({
          success: false,
          status: "error",
          errorMessage: "user_id is required",
        });
      }

      console.log("🔍 Admin Attendance Fetch - user_id:", user_id);

      // -----------------------------
      // 1. Check if user is admin
      // -----------------------------
      const userInfo = await odooService.searchRead(
        "res.users",
        [["id", "=", parseInt(user_id)]],
        ["id", "partner_id", "is_client_employee_admin", "is_client_employee_user"]
      );
      console.log("👤 User Data:", userInfo);

      if (!userInfo.length) {
        return res.status(404).json({
          success: false,
          status: "error",
          errorMessage: `User not found for user_id: ${user_id}`,
        });
      }

      const user = userInfo[0];

      // Check if both fields are false - plan expired or not purchased
      if (!user.is_client_employee_admin && !user.is_client_employee_user) {
        return res.status(403).json({
          success: false,
          status: "error",
          errorMessage: "Your plan expired or you didn't Buy",
        });
      }

      // Check if user is admin
      if (!user.is_client_employee_admin) {
        return res.status(403).json({
          success: false,
          status: "error",
          errorMessage: "You are not admin ,you are Employee",
        });
      }

      console.log("✅ User is admin. Proceeding...");

      const partnerId = user.partner_id?.[0];
      console.log("🆔 Partner ID:", partnerId);

      const adminEmployee = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["id", "address_id"]
      );
      console.log("👨‍💼 Admin Employee Data:", adminEmployee);

      if (!adminEmployee.length) {
        return res.status(404).json({
          success: false,
          status: "error",
          errorMessage: `Employee not found for partner ${partnerId}`,
        });
      }

      const client_id = adminEmployee[0].address_id?.[0];
      console.log("🏢 Client ID:", client_id);

      console.log("\n📊 Fetching Custom Method Stats...");

      const totalEmployees = await odooService.callCustomMethod(
        "simple.action",
        "get_total_number_of_employee",
        [[], client_id]
      );
      console.log("✅ Total Employees:", totalEmployees);

      const Presentemployee = await odooService.callCustomMethod(
        "simple.action",
        "get_total_present_employee",
        [[], false, false, client_id]
      );

      const TotalLateemployee = await odooService.callCustomMethod(
        "simple.action",
        "get_total_no_of_late_employee",
        [[], false, false, client_id]
      );

      const Ununiformendemployee = await odooService.callCustomMethod(
        "simple.action",
        "get_total_no_of_uninformed_employee",
        [client_id]
      );
      console.log("❓ Uninformed Employees:", Ununiformendemployee);

      const TodayAbsetEmployee = await odooService.callCustomMethod(
        "simple.action",
        "get_employees_no_attendance_today",
        [client_id]
      );
      console.log("🚫 Today Absent Employees:", TodayAbsetEmployee);

      const ApprovedLeaveOfEmployee = await odooService.callCustomMethod(
        "simple.action",
        "get_total_no_of_permited_employee",
        [client_id]
      );
      console.log("✅ Approved Leave Employees:", ApprovedLeaveOfEmployee);

      console.log("\n👥 Fetching All Employees for client_id:", client_id);
      const allEmployees = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", client_id]],
        ["id", "name", "job_id"]
      );
      console.log("📋 All Employees Count:", allEmployees.length);
      console.log("📋 All Employees Data:", JSON.stringify(allEmployees, null, 2));

      if (!allEmployees.length) {
        return res.status(404).json({
          success: false,
          status: "error",
          errorMessage: "No employees found for this client_id",
        });
      }

      const employeeIds = allEmployees.map((e) => e.id);
      console.log("🔢 Employee IDs:", employeeIds);

      let domain = [["employee_id", "in", employeeIds]];
      if (date_from) domain.push(["check_in", ">=", date_from]);
      if (date_to) domain.push(["check_in", "<=", date_to]);
      console.log("🔍 Attendance Domain:", JSON.stringify(domain));

      const FIELDS = [
        "employee_id",
        "check_in",
        "checkin_lat",
        "checkin_lon",
        "check_out",
        "checkout_lat",
        "checkout_lon",
        "worked_hours",
        "early_out_minutes",
        "overtime_hours",
        "is_early_out",
        "validated_overtime_hours",
        "is_late_in",
        "late_time_display",
        "status_code",
      ];

      console.log("\n📅 Fetching Attendance Records...");
      const attendances = await odooService.searchRead(
        "hr.attendance",
        domain,
        FIELDS,
        parseInt(offset),
        parseInt(limit),
        "check_in desc"
      );
      console.log("📊 Attendance Records Count:", attendances.length);
      console.log("📊 First 3 Attendance Records:", JSON.stringify(attendances.slice(0, 3), null, 2));

      const convertToIST = (utcDateStr) => {
        if (!utcDateStr) return null;
        const utcDate = new Date(utcDateStr + " UTC");
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(utcDate.getTime() + istOffset);
        return istDate.toISOString().slice(0, 19).replace("T", " ");
      };

      const attendanceIds = attendances.map((a) => a.id);
      console.log("🆔 Attendance IDs:", attendanceIds);

      let breakLines = [];
      if (attendanceIds.length > 0) {
        console.log("\n☕ Fetching Break Lines...");
        breakLines = await odooService.searchRead(
          "hr.attendance.line",
          [["attendance_id", "in", attendanceIds]],
          ["attendance_id", "break_start", "break_end", "break_hours"]
        );
        console.log("☕ Break Lines Count:", breakLines.length);
        console.log("☕ Break Lines Data:", JSON.stringify(breakLines, null, 2));
      }

      const breakMap = {};
      breakLines.forEach((line) => {
        const attId = line.attendance_id?.[0];
        breakMap[attId] = line;
      });
      console.log("🗺️ Break Map Keys:", Object.keys(breakMap));

      const attendancesByEmployee = {};
      attendances.forEach((att) => {
        const empId = att.employee_id?.[0];
        if (!attendancesByEmployee[empId]) {
          attendancesByEmployee[empId] = [];
        }
        attendancesByEmployee[empId].push(att);
      });
      console.log("\n👥 Attendances by Employee:");
      Object.entries(attendancesByEmployee).forEach(([empId, atts]) => {
        console.log(`  Employee ${empId}: ${atts.length} attendance record(s)`);
      });

      console.log("\n🔄 Building Final Data...");
      const finalData = allEmployees
        .map((emp) => {
          const empAttendances = attendancesByEmployee[emp.id] || [];

          if (empAttendances.length > 0) {
            console.log(`  ✓ Employee ${emp.id} (${emp.name}): ${empAttendances.length} records`);
            return empAttendances.map((att) => {
              const breakLine = breakMap[att.id];
              return {
                id: att.id,
                employee_id: att.employee_id,

                check_in: convertToIST(att.check_in),
                checkin_lat: att.checkin_lat,
                checkin_lon: att.checkin_lon,

                check_out: convertToIST(att.check_out),
                checkout_lat: att.checkout_lat,
                checkout_lon: att.checkout_lon,

                worked_hours: att.worked_hours,
                early_out_minutes: att.early_out_minutes,
                overtime_hours: att.overtime_hours,
                validated_overtime_hours: att.validated_overtime_hours,

                is_late_in: att.is_late_in,
                late_time_display: att.late_time_display,
                is_early_out: att.is_early_out,
                status_code: att.status_code,

                break_start: convertToIST(breakLine?.break_start),
                break_end: convertToIST(breakLine?.break_end),
                break_hours: breakLine?.break_hours || null,

                job_id: emp.job_id || null,
                job_name: emp.job_id ? emp.job_id[1] : null,
              };
            });
          } else {
            console.log(`  ✗ Employee ${emp.id} (${emp.name}): No attendance records`);
            return [
              {
                id: null,
                employee_id: [emp.id, emp.name],

                check_in: null,
                checkin_lat: null,
                checkin_lon: null,

                check_out: null,
                checkout_lat: null,
                checkout_lon: null,

                worked_hours: null,
                early_out_minutes: null,
                overtime_hours: null,
                validated_overtime_hours: null,

                is_late_in: null,
                late_time_display: null,
                is_early_out: null,
                status_code: null,

                break_start: null,
                break_end: null,
                break_hours: null,

                job_id: emp.job_id || null,
                job_name: emp.job_id ? emp.job_id[1] : null,
              },
            ];
          }
        })
        .flat();

      console.log("\n📦 Final Data Count:", finalData.length);
      console.log("\n📊 Meta Summary:");
      console.log("  - Total Attendance Records:", finalData.length);
      console.log("  - Total Employees:", allEmployees.length);
      console.log("  - Custom Method - Total Employees:", totalEmployees);
      console.log("  - Custom Method - Present:", Presentemployee);
      console.log("  - Custom Method - Late:", TotalLateemployee);
      console.log("  - Custom Method - Uninformed:", Ununiformendemployee);
      console.log("  - Custom Method - Absent Today:", TodayAbsetEmployee);
      console.log("  - Custom Method - Approved Leave:", ApprovedLeaveOfEmployee);

      return res.status(200).json({
        success: true,
        status: "success",
        successMessage: "Admin attendance records fetched",
        data: finalData,
        meta: {
          total_Attendace_records: finalData.length,
          total_employees: allEmployees.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          admin_partner_id: partnerId,
          admin_address_id: client_id,
          TotalEmployee: totalEmployees,
          Presentemployee: Presentemployee,
          TotalLateemployee: TotalLateemployee,
          Ununiformendemployee: Ununiformendemployee,
          TodayAbsetEmployee: TodayAbsetEmployee,
          ApprovedLeaveOfEmployee: ApprovedLeaveOfEmployee,
        },
      });
    } catch (error) {
      console.error("🔥 Admin Attendance Error:", error);
      console.error("🔥 Error Stack:", error.stack);
      return res.status(500).json({
        success: false,
        status: "error",
        errorMessage: error.message || "Failed to fetch admin attendance",
      });
    }
  }
  async updateAdminAttendance(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          status: "error",
          errorMessage: "Attendance ID is required",
        });
      }

      const { check_in, check_out, late_minutes } = req.body;
      console.log("Payload from Frontend :", req.body);
      const toOdooUTC = (dt) =>
        new Date(dt).toISOString().slice(0, 19).replace("T", " ");

      const payload = {
        check_in: check_in ? toOdooUTC(check_in) : false,
        check_out: check_out ? toOdooUTC(check_out) : false,
        late_time_display: late_minutes ? `${late_minutes} Min` : false,
        is_late_in: late_minutes > 0,
      };

      console.log("Updating Attendance:", payload);

      const updated = await odooService.write(
        "hr.attendance",
        parseInt(id),
        payload
      );

      return res.status(200).json({
        success: true,
        status: "success",
        successMessage: "Attendance updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("🔥 Update Attendance Error:", error);
      return res.status(500).json({
        success: false,
        status: "error",
        errorMessage: error.message || "Failed to update attendance",
      });
    }
  }
  async getGroupList(req, res) {
    try {
      const allowedGroupNames = ["Client Admin", "Client Employee Own", "Reporting Manager (Client)"];
      const groups = await odooService.searchRead(
        "res.groups",
        [["name", "in", allowedGroupNames]],
        ["id", "name", "category_id"]
      );
      const data = groups
        .filter((g) => {
          if (g.name === "Employee Own") {
            const categoryName = g.category_id?.[1] || null;

            return categoryName === "User roles";
          }
          return true;
        })
        .map((g) => ({
          group_id: g.id,
          group_name: g.name,
        }));

      return res.status(200).json({
        status: "success",
        message: "Group list fetched",
        data,
      });
    } catch (error) {
      console.error("❌ Get Group List Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  async getGroupUsers(req, res) {
    try {
      const { group_id, user_id } = req.query;

      if (!group_id) {
        return res.status(400).json({
          status: "error",
          message: "group_id is required",
        });
      }

      if (!user_id) {
        return res.status(400).json({
          status: "error",
          message: "user_id is required",
        });
      }

      const employeeRec = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", Number(user_id)]],
        ["id", "address_id"],
        1
      );

      if (!employeeRec.length || !employeeRec[0].address_id) {
        return res.status(404).json({
          status: "error",
          message: "Partner not found for logged-in user",
        });
      }

      const loggedInPartnerId = employeeRec[0].address_id[0];

      const groups = await odooService.searchRead(
        "res.groups",
        [["id", "=", Number(group_id)]],
        ["id", "name", "users"]
      );

      if (!groups.length) {
        return res.status(404).json({
          status: "error",
          message: "Group not found",
        });
      }

      const group = groups[0];

      if (!group.users || group.users.length === 0) {
        return res.status(200).json({
          status: "success",
          message: "No users in this group",
          data: {
            group_id: group.id,
            group_name: group.name,
            users: [],
          },
        });
      }

      const users = await odooService.searchRead(
        "res.users",
        [["id", "in", group.users]],
        ["id", "name", "login"]
      );

      const finalUsers = [];

      for (const user of users) {
        const userEmployeeRec = await odooService.searchRead(
          "hr.employee",
          [["user_id", "=", user.id]],
          ["id", "address_id"],
          1
        );

        if (!userEmployeeRec.length) {
          continue;
        }

        const employee = userEmployeeRec[0];
        const partnerId = employee.address_id?.[0];

        if (!partnerId) continue;

        if (partnerId !== loggedInPartnerId) continue;

        const plan = await odooService.searchRead(
          "client.plan.details",
          [
            ["partner_id", "=", partnerId],
            ["is_expier", "=", true],
          ],
          ["id"],
          1
        );

        if (!plan.length) continue;

        finalUsers.push({
          user_id: user.id,
          name: user.name,
          login: user.login,
          partner_id: partnerId,
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Group users from same client with active plan fetched",
        data: {
          group_id: group.id,
          group_name: group.name,
          logged_in_partner_id: loggedInPartnerId,
          users: finalUsers,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch group users",
      });
    }
  }


  async getEmployeeAttendanceComplete(req, res) {
    try {
      const {
        user_id,
        date_from,
        date_to,
        date,
        limit = 100,
        offset = 0,
      } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          status: "error",
          errorMessage: "user_id is required",
          successMessage: "",
          statuscode: 400,
        });
      }

      console.log("🔍 Searching employee for user_id:", user_id);

      const formatDatetime = (datetime) => {
        if (!datetime) return null;
        return moment
          .utc(datetime)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss");
      };

      const employee = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", parseInt(user_id)]],
        ["id", "name", "resource_calendar_id"]
      );

      if (!employee.length) {
        return res.status(404).json({
          success: false,
          status: "error",
          errorMessage: `No employee found for user_id: ${user_id}`,
          successMessage: "",
          statuscode: 404,
        });
      }

      const employeeData = employee[0];
      const employeeId = employeeData.id;

      let domain = [["employee_id", "=", employeeId]];
      if (date_from) domain.push(["check_in", ">=", date_from]);
      if (date_to) domain.push(["check_in", "<=", date_to]);

      const REQUIRED_FIELDS = [
        "employee_id",
        "check_in",
        "check_out",
        "checkin_lat",
        "checkin_lon",
        "checkout_lat",
        "checkout_lon",
        "total_working_hours",
        "total_productive_hours",
        "early_out_minutes",
        "overtime_hours",
        "is_early_out",
        "validated_overtime_hours",
        "is_late_in",
        "late_time_display",
        "status_code",
        "overtime_start",
        "overtime_end",
      ];

      const attendances = await odooService.searchRead(
        "hr.attendance",
        domain,
        REQUIRED_FIELDS,
        parseInt(offset),
        parseInt(limit),
        "check_in desc"
      );

      const totalCount = await odooService.search("hr.attendance", domain);

      const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

      const attendanceIds = attendances.map((att) => att.id);
      let attendanceLinesByAttendance = {};

      if (attendanceIds.length > 0) {
        const allAttendanceLines = await odooService.searchRead(
          "hr.attendance.line",
          [["attendance_id", "in", attendanceIds]],
          [
            "attendance_id",
            "check_in",
            "check_out",
            "break_start",
            "break_end",
            "break_hours",
            "productive_hours",
          ]
        );

        allAttendanceLines.forEach((line) => {
          const attId = line.attendance_id?.[0];
          if (attId) {
            if (!attendanceLinesByAttendance[attId]) {
              attendanceLinesByAttendance[attId] = [];
            }
            attendanceLinesByAttendance[attId].push(line);
          }
        });
      }

      const finalAttendance = attendances.map((att) => {
        const checkInDate = moment
          .utc(att.check_in)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const isToday = checkInDate === todayDate;

        const formatted = {
          id: att.id,
          employee_id: att.employee_id,
          checkin_lat: att.checkin_lat,
          checkin_lon: att.checkin_lon,
          checkout_lat: att.checkout_lat,
          checkout_lon: att.checkout_lon,
          total_working_hours: att.total_working_hours,
          total_productive_hours: att.total_productive_hours,
          early_out_minutes: att.early_out_minutes,
          overtime_hours: att.overtime_hours,
          is_early_out: att.is_early_out,
          is_late_in: att.is_late_in,
          late_time_display: att.late_time_display,
          status_code: att.status_code,
          overtime_start: formatDatetime(att.overtime_start),
          overtime_end: formatDatetime(att.overtime_end),
        };

        const attendanceLines = attendanceLinesByAttendance[att.id] || [];

        if (attendanceLines.length > 0) {
          const firstLine = attendanceLines[0];
          const lastLine = attendanceLines[attendanceLines.length - 1];
          formatted.check_in = formatDatetime(firstLine.check_in);
          formatted.check_out = formatDatetime(lastLine.check_out);
        } else {
          formatted.check_in = formatDatetime(att.check_in);
          formatted.check_out = formatDatetime(att.check_out);
        }

        return formatted;
      });
      let workingHoursSummary = null;

      if (employeeData.resource_calendar_id) {
        const calendarId = Array.isArray(employeeData.resource_calendar_id)
          ? employeeData.resource_calendar_id[0]
          : employeeData.resource_calendar_id;

        const calendar = await odooService.searchRead(
          "resource.calendar",
          [["id", "=", calendarId]],
          ["id", "name", "hours_per_day", "total_overtime_hours_allowed"]
        );

        if (calendar.length) {
          const allowedHoursPerDay = calendar[0].hours_per_day || 0;
          const allowedOvertimePerDay =
            calendar[0].total_overtime_hours_allowed || 0;
          const targetDate =
            date || moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

          const getDateRanges = (dateString) => {
            const tz = "Asia/Kolkata";
            const todayStart = moment
              .tz(dateString, tz)
              .startOf("day")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");
            const todayEnd = moment
              .tz(dateString, tz)
              .endOf("day")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");

            const weekStart = moment
              .tz(dateString, tz)
              .startOf("week")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");
            const weekEnd = moment
              .tz(dateString, tz)
              .endOf("week")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");

            const monthStart = moment
              .tz(dateString, tz)
              .startOf("month")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");
            const monthEnd = moment
              .tz(dateString, tz)
              .endOf("month")
              .utc()
              .format("YYYY-MM-DD HH:mm:ss");

            return {
              todayStart,
              todayEnd,
              weekStart,
              weekEnd,
              monthStart,
              monthEnd,
            };
          };

          const getWorkingDaysInMonth = (dateString) => {
            const tz = "Asia/Kolkata";
            const start = moment.tz(dateString, tz).startOf("month");
            const end = moment.tz(dateString, tz).endOf("month");

            let workingDays = 0;
            let current = start.clone();

            while (current.isSameOrBefore(end)) {
              const day = current.day();
              if (day !== 0 && day !== 6) {
                workingDays++;
              }
              current.add(1, "day");
            }

            return workingDays;
          };

          const ranges = getDateRanges(targetDate);

          const [todayLogs, weekLogs, monthLogs] = await Promise.all([
            odooService.searchRead(
              "hr.attendance",
              [
                ["employee_id", "=", employeeId],
                ["check_in", ">=", ranges.todayStart],
                ["check_in", "<=", ranges.todayEnd],
              ],
              ["id", "total_working_hours"]
            ),
            odooService.searchRead(
              "hr.attendance",
              [
                ["employee_id", "=", employeeId],
                ["check_in", ">=", ranges.weekStart],
                ["check_in", "<=", ranges.weekEnd],
              ],
              ["id", "total_working_hours"]
            ),
            odooService.searchRead(
              "hr.attendance",
              [
                ["employee_id", "=", employeeId],
                ["check_in", ">=", ranges.monthStart],
                ["check_in", "<=", ranges.monthEnd],
              ],
              ["id", "total_working_hours"]
            ),
          ]);

          const sumWorkingHours = (records) =>
            records.reduce(
              (sum, rec) => sum + (parseFloat(rec.total_working_hours) || 0),
              0
            );

          const workedToday = sumWorkingHours(todayLogs);
          const workedWeek = sumWorkingHours(weekLogs);
          const workedMonth = sumWorkingHours(monthLogs);

          let breakHoursToday = 0;
          let todayAttendanceLineDetails = [];

          if (todayLogs.length > 0) {
            const todayIds = todayLogs.map((att) => att.id);
            const breakLines = await odooService.searchRead(
              "hr.attendance.line",
              [["attendance_id", "in", todayIds]],
              [
                "attendance_id",
                "check_in",
                "check_out",
                "break_start",
                "break_end",
                "break_hours",
                "productive_hours",
              ]
            );

            breakHoursToday = breakLines.reduce(
              (sum, brk) => sum + (parseFloat(brk.break_hours) || 0),
              0
            );

            todayAttendanceLineDetails = breakLines.map((line) => ({
              attendance_id: line.attendance_id?.[0] || null,
              check_in: formatDatetime(line.check_in),
              check_out: formatDatetime(line.check_out),
              break_start: formatDatetime(line.break_start),
              break_end: formatDatetime(line.break_end),
              break_hours: parseFloat((line.break_hours || 0).toFixed(2)),
              productive_hours: parseFloat(
                (line.productive_hours || 0).toFixed(2)
              ),
            }));
          }
          const workingDaysInMonth = getWorkingDaysInMonth(targetDate);
          const allowedWeek = allowedHoursPerDay * 5;
          const allowedMonth = allowedHoursPerDay * workingDaysInMonth;
          const allowedOvertimeWeek = allowedOvertimePerDay * 5;
          const allowedOvertimeMonth =
            allowedOvertimePerDay * workingDaysInMonth;
          const sumOvertimeHours = (records) =>
            records.reduce(
              (sum, rec) =>
                sum + (parseFloat(rec.validated_overtime_hours) || 0),
              0
            );
          const [todayOvertimeLogs, weekOvertimeLogs, monthOvertimeLogs] =
            await Promise.all([
              odooService.searchRead(
                "hr.attendance",
                [
                  ["employee_id", "=", employeeId],
                  ["check_in", ">=", ranges.todayStart],
                  ["check_in", "<=", ranges.todayEnd],
                ],
                ["id", "validated_overtime_hours"]
              ),
              odooService.searchRead(
                "hr.attendance",
                [
                  ["employee_id", "=", employeeId],
                  ["check_in", ">=", ranges.weekStart],
                  ["check_in", "<=", ranges.weekEnd],
                ],
                ["id", "validated_overtime_hours"]
              ),
              odooService.searchRead(
                "hr.attendance",
                [
                  ["employee_id", "=", employeeId],
                  ["check_in", ">=", ranges.monthStart],
                  ["check_in", "<=", ranges.monthEnd],
                ],
                ["id", "validated_overtime_hours"]
              ),
            ]);
          const overtimeToday = sumOvertimeHours(todayOvertimeLogs);
          const overtimeWeek = sumOvertimeHours(weekOvertimeLogs);
          const overtimeMonth = sumOvertimeHours(monthOvertimeLogs);
          workingHoursSummary = {
            resource_calendar_id: calendarId,
            calendar_name: calendar[0].name,
            allowed_hours_per_day: allowedHoursPerDay,

            today: {
              date: targetDate,
              worked_hours: parseFloat(workedToday.toFixed(2)),
              allowed_hours: allowedHoursPerDay,
              remaining_hours: parseFloat(
                Math.max(0, allowedHoursPerDay - workedToday).toFixed(2)
              ),
              percentage: parseFloat(
                Math.min(100, (workedToday / allowedHoursPerDay) * 100).toFixed(
                  2
                )
              ),
              is_completed: workedToday >= allowedHoursPerDay,
              attendance_records: todayLogs.length,
              total_break_hours: parseFloat(breakHoursToday.toFixed(2)),
              total_overtime_hours_allowed: parseFloat(
                allowedOvertimePerDay.toFixed(2)
              ),
              total_overtime_hours_worked: parseFloat(overtimeToday.toFixed(2)),
              attendance_line_details: todayAttendanceLineDetails,
              message:
                todayLogs.length === 0 ? "Not checked in till now" : null,
            },

            week: {
              worked_hours: parseFloat(workedWeek.toFixed(2)),
              allowed_hours: allowedWeek,
              remaining_hours: parseFloat(
                Math.max(0, allowedWeek - workedWeek).toFixed(2)
              ),
              percentage: parseFloat(
                Math.min(100, (workedWeek / allowedWeek) * 100).toFixed(2)
              ),
              attendance_records: weekLogs.length,
              total_overtime_hours_allowed: parseFloat(
                allowedOvertimeWeek.toFixed(2)
              ),
              total_overtime_hours_worked: parseFloat(overtimeWeek.toFixed(2)),
            },

            month: {
              worked_hours: parseFloat(workedMonth.toFixed(2)),
              allowed_hours: allowedMonth,
              remaining_hours: parseFloat(
                Math.max(0, allowedMonth - workedMonth).toFixed(2)
              ),
              percentage: parseFloat(
                Math.min(100, (workedMonth / allowedMonth) * 100).toFixed(2)
              ),
              attendance_records: monthLogs.length,
              total_overtime_hours_allowed: parseFloat(
                allowedOvertimeMonth.toFixed(2)
              ),
              total_overtime_hours_worked: parseFloat(overtimeMonth.toFixed(2)),
            },
          };
        }
      }

      return res.status(200).json({
        success: true,
        status: "success",
        successMessage: "Employee attendance data fetched successfully",
        statuscode: 200,
        data: {
          employee: {
            employee_id: employeeId,
            employee_name: employeeData.name,
          },
          attendance_records: finalAttendance,
          working_hours_summary: workingHoursSummary,
        },
        meta: {
          total_attendance_records: totalCount.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } catch (error) {
      console.error("🔥 Error fetching employee attendance data:", error);
      return res.status(500).json({
        success: false,
        status: "error",
        errorMessage: error.message || "Internal Server Error",
        statuscode: 500,
      });
    }
  }


  async getUserContacts(req, res) {
    try {
      const { user_id } = req.query;
      if (!user_id) {
        return res.status(400).json({
          status: "error",
          message: "User ID is required",
        });
      }
      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", parseInt(user_id)]],
        ["id", "login", "name", "partner_id"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const companyPartnerId = userData[0].partner_id[0];
      const contacts = await odooService.searchRead(
        "res.partner",
        [["parent_id", "=", companyPartnerId]],
        ["id", "name", "email", "mobile", "phone", "type", "function"]
      );
      const formattedContacts = contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email || null,
        mobile: contact.mobile || null,
        phone: contact.phone || null,
        type: contact.type,
        job_position: contact.function || null,
      }));

      return res.status(200).json({
        status: "OK",
        user: {
          id: userData[0].id,
          email: userData[0].login,
          name: userData[0].name,
        },
        company_partner_id: companyPartnerId,
        contacts: formattedContacts,
      });
    } catch (error) {
      console.error("Get user contacts error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch user contacts",
      });
    }
  }

  async updateUserContact(req, res) {
    try {
      console.log("✏️ Update User Contact API called");

      const { user_id, contact_id } = req.query;
      const { name, email, mobile, phone } = req.body;

      if (!user_id || !contact_id) {
        return res.status(400).json({
          status: "error",
          message: "User ID and Contact ID are required",
        });
      }

      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", parseInt(user_id)]],
        ["id", "login", "name", "partner_id"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const companyPartnerId = userData[0].partner_id[0];

      const contactData = await odooService.searchRead(
        "res.partner",
        [
          ["id", "=", parseInt(contact_id)],
          ["parent_id", "=", companyPartnerId],
        ],
        ["id"]
      );

      if (!contactData || contactData.length === 0) {
        return res.status(403).json({
          status: "error",
          message: "Contact does not belong to this user/company",
        });
      }

      const updateVals = {};

      if (name) updateVals.name = name;
      if (email) updateVals.email = email;
      if (mobile) {
        updateVals.mobile = mobile;
        updateVals.phone = mobile;
      }
      if (phone) updateVals.phone = phone;

      if (Object.keys(updateVals).length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No fields provided for update",
        });
      }

      await odooService.write(
        "res.partner",
        [parseInt(contact_id)],
        updateVals
      );

      return res.status(200).json({
        status: "OK",
        message: "Contact updated successfully",
        contact_id: parseInt(contact_id),
      });
    } catch (error) {
      console.error("Update contact error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update contact",
      });
    }
  }

  async sendOtp(req, res) {
    try {
      console.log("🔥 Send OTP API called");

      const { user_id, type, value } = req.body;

      // ------------------ 1️⃣ Basic Validation ------------------
      if (!user_id || !type || !value) {
        return res.status(400).json({
          status: "error",
          message: "user_id, type and value are required",
        });
      }

      if (!["email", "mobile"].includes(type)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid type",
        });
      }

      if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid email format",
        });
      }

      if (type === "mobile" && !/^[6-9]\d{9}$/.test(value)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid mobile number",
        });
      }

      // ------------------ 2️⃣ Verify user exists ------------------
      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", parseInt(user_id)]],
        ["id"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      // ------------------ 3️⃣ Generate OTP ------------------
      const otp = Math.floor(100000 + Math.random() * 900000);

      // ------------------ 4️⃣ Store OTP with expiry ------------------
      const otpKey = `${user_id}_${type}_${value}`;
      otpStore.set(otpKey, {
        otp: otp.toString(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        attempts: 0,
      });

      // Auto-delete after 5 minutes
      setTimeout(() => {
        otpStore.delete(otpKey);
      }, 5 * 60 * 1000);

      // ------------------ 5️⃣ Send OTP ------------------
      if (type === "email") {
        await mailService.sendMail(
          value,
          "OTP Verification - Kavach Global",
          `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin:0; padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr>
<td style="background-color:#5f5cc4; height:8px;"></td>
</tr>
<tr>
<td style="padding:50px 60px; text-align:center;">
<h1 style="color:#1a1a1a; font-size:28px; margin-bottom:20px;">OTP Verification</h1>
<p style="font-size:16px; color:#333;">Your OTP for updating your ${type} is:</p>
<p style="font-size:24px; font-weight:bold; color:#5f5cc4; margin:20px 0;">${otp}</p>
<p style="font-size:14px; color:#555;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
</td>
</tr>
<tr>
<td style="background-color:#5f5cc4; height:8px;"></td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`
        );
      } else {
        const transporter = mailService.transporter;
        const smsEmail = `${value}@sms.gateway.com`;

        await transporter.sendMail({
          from: `"Kavach Global" <${process.env.SMTP_USER}>`,
          to: smsEmail,
          subject: "",
          text: `Your OTP for updating your mobile is ${otp}. Valid for 5 minutes.`,
        });
      }

      return res.status(200).json({
        status: "OK",
        message: "OTP sent successfully",
        // otp, // ⚠️ Remove in production
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP",
      });
    }
  }

  async verifyOtp(req, res) {
    try {
      console.log("✅ Verify OTP API called");

      const { user_id, type, value, otp } = req.body;

      // ------------------ 1️⃣ Basic Validation ------------------
      if (!user_id || !type || !value || !otp) {
        return res.status(400).json({
          status: "error",
          message: "user_id, type, value and otp are required",
        });
      }

      if (!["email", "mobile"].includes(type)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid type",
        });
      }

      // ------------------ 2️⃣ Get stored OTP ------------------
      const otpKey = `${user_id}_${type}_${value}`;
      const storedOtpData = otpStore.get(otpKey);

      if (!storedOtpData) {
        return res.status(400).json({
          status: "error",
          message: "OTP not found or expired",
        });
      }

      // ------------------ 3️⃣ Check expiry ------------------
      if (Date.now() > storedOtpData.expiresAt) {
        otpStore.delete(otpKey);
        return res.status(400).json({
          status: "error",
          message: "OTP has expired",
        });
      }

      // ------------------ 4️⃣ Check attempts (prevent brute force) ------------------
      if (storedOtpData.attempts >= 3) {
        otpStore.delete(otpKey);
        return res.status(429).json({
          status: "error",
          message: "Too many failed attempts. Please request a new OTP",
        });
      }

      // ------------------ 5️⃣ Verify OTP ------------------
      if (storedOtpData.otp !== otp.toString()) {
        storedOtpData.attempts += 1;
        otpStore.set(otpKey, storedOtpData);

        return res.status(400).json({
          status: "error",
          message: "Invalid OTP",
          remaining_attempts: 3 - storedOtpData.attempts,
        });
      }

      // ------------------ 6️⃣ OTP verified successfully ------------------
      otpStore.delete(otpKey); // Remove used OTP

      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", parseInt(user_id)]],
        ["id", "partner_id"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const partnerId = userData[0].partner_id[0];
      const updateVals = {};

      if (type === "email") {
        updateVals.email = value;
      } else if (type === "mobile") {
        updateVals.mobile = value;
        updateVals.phone = value;
      }

      // Update partner in Odoo
      await odooService.write("res.partner", [partnerId], updateVals);

      return res.status(200).json({
        status: "OK",
        message: `${type === "email" ? "Email" : "Mobile"
          } verified and updated successfully`,
        user_id: parseInt(user_id),
        [type]: value,
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to verify OTP",
      });
    }
  }

  // async updateUserContact(req, res) {
  //   try {
  //     console.log("✏️ Update User Contact API called");

  //     // ✅ Flexible Extraction: Sabhi jagah se data nikalne ka try karega
  //     const contact_id = req.params.contact_id || req.body.contact_id || req.query.contact_id;
  //     const user_id = req.body.user_id || req.query.user_id || req.params.user_id;

  //     const { name, email, mobile, phone, job_position } = req.body;

  //     // Validate IDs
  //     if (!user_id || !contact_id) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "User ID and Contact ID are required (Body, Params or Query)",
  //       });
  //     }

  //     const userData = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", parseInt(user_id)]],
  //       ["id", "login", "name", "partner_id"]
  //     );

  //     if (!userData || userData.length === 0) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "User not found",
  //       });
  //     }

  //     const companyPartnerId = userData[0].partner_id[0];

  //     // Verify if contact belongs to the company
  //     const contactData = await odooService.searchRead(
  //       "res.partner",
  //       [
  //         ["id", "=", parseInt(contact_id)],
  //         ["parent_id", "=", companyPartnerId],
  //       ],
  //       ["id"]
  //     );

  //     if (!contactData || contactData.length === 0) {
  //       return res.status(403).json({
  //         status: "error",
  //         message: "Contact does not belong to this user/company",
  //       });
  //     }

  //     const updateVals = {};

  //     if (name) updateVals.name = name;
  //     if (email) updateVals.email = email;
  //     if (mobile) {
  //       updateVals.mobile = mobile;
  //       updateVals.phone = mobile;
  //     }
  //     if (phone) updateVals.phone = phone;

  //     // ✅ Job Position mapping to Odoo 'function' field
  //     if (job_position !== undefined) {
  //       updateVals.function = job_position;
  //     }

  //     if (Object.keys(updateVals).length === 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "No fields provided for update",
  //       });
  //     }

  //     await odooService.write(
  //       "res.partner",
  //       [parseInt(contact_id)],
  //       updateVals
  //     );

  //     return res.status(200).json({
  //       status: "OK",
  //       message: "Contact updated successfully",
  //       contact_id: parseInt(contact_id),
  //       updated_fields: updateVals
  //     });
  //   } catch (error) {
  //     console.error("Update contact error:", error);
  //     return res.status(500).json({
  //       status: "error",
  //       message: "Failed to update contact",
  //     });
  //   }
  // }

  async getAllApprovalRequests(req, res) {
    try {
      // Validate required parameters first
      const { user_id, unique_user_id } = req.body || req.query;

      if (!user_id && !unique_user_id) {
        return res.status(400).json({
          status: "error",
          message: "Either user_id or unique_user_id is required"
        });
      }

      // Get client and current user from request
      const { client_id, currentUser } = await getClientFromRequest(req);

      if (!client_id) {
        return res.status(400).json({
          status: "error",
          message: "Client ID missing."
        });
      }

      // Build domain filter
      let domain = [["req_employee_id.address_id", "=", client_id]];

      if (!currentUser.is_client_employee_admin) {
        domain.push(["approval_log_list.approver_id", "=", currentUser.id]);
      }

      // Define fields to fetch
      const fields = [
        "name",
        "req_employee_id",
        "attendance_regulzie_id",
        "hr_leave_id",
        "hr_expense_id",
        "description",
        "state",
        "reason",
        "approval_log_list"
      ];

      // Fetch approval requests from Odoo
      const requests = await odooService.searchRead(
        "approval.request",
        domain,
        fields,
        0,
        100,
        "id desc",
        currentUser.id
      );

      // Handle empty results
      if (requests.length === 0) {
        return res.status(200).json({
          status: "success",
          message: "There is no any Request for you.",
          total: 0,
          data: []
        });
      }

      // Process and enrich request data
      const processedRequests = requests.map((item) => {
        const newItem = { ...item };

        // Determine approval type
        let approvalType = "Unknown";

        if (newItem.hr_leave_id && newItem.hr_leave_id !== false) {
          approvalType = "Leave";
        } else if (newItem.hr_expense_id && newItem.hr_expense_id !== false) {
          approvalType = "Expense";
        } else if (newItem.attendance_regulzie_id && newItem.attendance_regulzie_id !== false) {
          approvalType = "Attendance Regularization";
        }

        newItem.approvalType = approvalType;

        // Remove reason field if request is not refused/rejected
        if (newItem.state !== "refused" && newItem.state !== "reject") {
          delete newItem.reason;
        }

        return newItem;
      });

      // Return success response
      return res.status(200).json({
        status: "success",
        total: processedRequests.length,
        data: processedRequests
      });

    } catch (error) {
      // Log error for debugging
      console.error("Error in getAllApprovalRequests:", error);

      // Return server error response
      return res.status(500).json({
        status: "error",
        message: error.message || "An unexpected error occurred"
      });
    }
  }
  async approveAttendanceRegularization(req, res) {
    try {
      console.log("--------------------------------------------------");
      console.log("🚀 START: approveAttendanceRegularization");
      const { approval_request_id, user_id } = req.body;
      console.log("📥 Incoming Payload:", { approval_request_id, user_id });
      if (!approval_request_id || !user_id) {
        console.warn("⚠️ Validation Failed: Missing required fields");
        return res.status(400).json({
          status: "error",
          message: "approval_request_id and user_id are required",
        });
      }
      // --- STEP 1: Fetch Password from hr.employee ---
      console.log(`🔍 Step 1: Searching hr.employee for user_id: ${user_id}`);
      const employeeData = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", parseInt(user_id)]],
        ["id", "name", "employee_password"],
        1
      );
      console.log("📄 Odoo Employee Result:", JSON.stringify(employeeData, null, 2));
      if (!employeeData || employeeData.length === 0) {
        console.error(`❌ Error: No employee found linked to user_id ${user_id}`);
        return res.status(404).json({
          status: "error",
          message: "Employee record not found for this user",
        });
      }
      const fetchedPassword = employeeData[0].employee_password;
      console.log(`🔐 Password Status: ${fetchedPassword ? "Found (HIDDEN)" : "NOT FOUND/EMPTY"}`);
      if (!fetchedPassword || fetchedPassword === "") {
        console.error("❌ Error: employee_password field is empty in Odoo");
        return res.status(400).json({
          status: "error",
          message: "Password not found in Odoo for this employee. Please check hr.employee record.",
        });
      }
      // --- STEP 2: Check Approval Record ---
      console.log(`🔍 Step 2: Checking approval.request ID: ${approval_request_id}`);
      const approvalRecords = await odooService.searchRead(
        "approval.request",
        [["id", "=", parseInt(approval_request_id)]],
        ["id", "state", "name"],
        1
      );
      console.log("📄 Odoo Approval Result:", JSON.stringify(approvalRecords, null, 2));
      if (!approvalRecords || approvalRecords.length === 0) {
        console.error("❌ Error: Approval record not found in Odoo");
        return res.status(404).json({ status: "error", message: "Approval record not found" });
      }
      console.log(`Current state of request: ${approvalRecords[0].state}`);
      if (approvalRecords[0].state === "approved") {
        console.warn("⚠️ Request already approved. Skipping...");
        return res.status(400).json({ status: "error", message: "This request is already approved" });
      }
      // --- STEP 3: Execute Approve Method ---
      try {
        console.log(`⚡ Step 3: Executing Odoo method 'approve_request' as User ${user_id}`);
        const result = await odooService.callMethod(
          "approval.request",
          "approve_request",
          [parseInt(approval_request_id)],
          {},
          parseInt(user_id),
          fetchedPassword
        );
        console.log("✅ Odoo Execution Successful:", result);
        console.log("--------------------------------------------------");
        return res.status(200).json({
          status: "success",
          message: "Request approved successfully",
          data: { approval_id: approval_request_id }
        });
      } catch (odooError) {
        console.error("❌ Odoo Execution Error:", odooError.message);

        let userMessage = odooError.message || "Approval failed. Check permissions or sequence.";

        if (odooError.message && odooError.message.includes("Check Out") && odooError.message.includes("Check In")) {
          userMessage = "Cannot approve: Check Out time is earlier than Check In time";
        }

        return res.status(400).json({
          status: "error",
          message: userMessage
        });
      }
    } catch (error) {
      console.error("🔥 Critical Server Error:", error.message);
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
  // async approveAttendanceRegularization(req, res) {
  //   try {
  //     console.log("--------------------------------------------------");
  //     console.log("🚀 START: approveAttendanceRegularization");

  //     const { approval_request_id, user_id } = req.body;
  //     console.log("📥 Incoming Payload:", { approval_request_id, user_id });

  //     if (!approval_request_id || !user_id) {
  //       console.warn("⚠️ Validation Failed: Missing required fields");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "approval_request_id and user_id are required",
  //       });
  //     }

  //     // --- STEP 1: Fetch Password from hr.employee ---
  //     console.log(`🔍 Step 1: Searching hr.employee for user_id: ${user_id}`);
  //     const employeeData = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", parseInt(user_id)]],
  //       ["id", "name", "employee_password"],
  //       1
  //     );

  //     console.log("📄 Odoo Employee Result:", JSON.stringify(employeeData, null, 2));

  //     if (!employeeData || employeeData.length === 0) {
  //       console.error(`❌ Error: No employee found linked to user_id ${user_id}`);
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee record not found for this user",
  //       });
  //     }

  //     const fetchedPassword = employeeData[0].employee_password;
  //     console.log(`🔐 Password Status: ${fetchedPassword ? "Found (HIDDEN)" : "NOT FOUND/EMPTY"}`);

  //     if (!fetchedPassword || fetchedPassword === "") {
  //       console.error("❌ Error: employee_password field is empty in Odoo");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Password not found in Odoo for this employee. Please check hr.employee record.",
  //       });
  //     }

  //     // --- STEP 2: Check Approval Record ---
  //     console.log(`🔍 Step 2: Checking approval.request ID: ${approval_request_id}`);
  //     const approvalRecords = await odooService.searchRead(
  //       "approval.request",
  //       [["id", "=", parseInt(approval_request_id)]],
  //       ["id", "state", "name"],
  //       1
  //     );

  //     console.log("📄 Odoo Approval Result:", JSON.stringify(approvalRecords, null, 2));

  //     if (!approvalRecords || approvalRecords.length === 0) {
  //       console.error("❌ Error: Approval record not found in Odoo");
  //       return res.status(404).json({ status: "error", message: "Approval record not found" });
  //     }

  //     console.log(`Current state of request: ${approvalRecords[0].state}`);

  //     if (approvalRecords[0].state === "approved") {
  //       console.warn("⚠️ Request already approved. Skipping...");
  //       return res.status(400).json({ status: "error", message: "This request is already approved" });
  //     }

  //     // --- STEP 3: Execute Approve Method ---
  //     try {
  //       console.log(`⚡ Step 3: Executing Odoo method 'approve_request' as User ${user_id}`);

  //       const result = await odooService.callMethod(
  //         "approval.request",
  //         "approve_request",
  //         [parseInt(approval_request_id)],
  //         {},
  //         parseInt(user_id),
  //         fetchedPassword
  //       );

  //       console.log("✅ Odoo Execution Successful:", result);
  //       console.log("--------------------------------------------------");

  //       return res.status(200).json({
  //         status: "success",
  //         message: "Request approved successfully",
  //         data: { approval_id: approval_request_id }
  //       });

  //     } catch (odooError) {
  //       console.error("❌ Odoo Execution Error:", odooError.message);
  //       return res.status(400).json({
  //         status: "error",
  //         message: odooError.message || "Approval failed. Check permissions or sequence."
  //       });
  //     }
  //   } catch (error) {
  //     console.error("🔥 Critical Server Error:", error.message);
  //     return res.status(500).json({ status: "error", message: error.message });
  //   }
  // }
  // async rejectAttendanceRegularization(req, res) {
  //   try {
  //     const { approval_request_id, remarks, user_id } = req.body;
  //     const { currentUser } = await getClientFromRequest(req);

  //     const adminName = currentUser?.partner_id ? currentUser.partner_id[1] : "Approver";

  //     if (!approval_request_id || !user_id) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "approval_request_id and user_id are required",
  //       });
  //     }

  //     const approvalRecords = await odooService.searchRead(
  //       "approval.request",
  //       [["id", "=", parseInt(approval_request_id)]],
  //       [
  //         "id",
  //         "name",
  //         "state",
  //         "attendance_regulzie_id",
  //         "hr_leave_id",
  //         "hr_expense_id",
  //         "description",
  //         "approval_log_list"
  //       ]
  //     );

  //     if (!approvalRecords?.length) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Approval Record not found"
  //       });
  //     }

  //     const approvalRecord = approvalRecords[0];

  //     if (approvalRecord.state === 'refused' || approvalRecord.state === 'reject' || approvalRecord.state === 'cancel') {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "This request has already been rejected.",
  //       });
  //     }

  //     const approvalLogIds = approvalRecord.approval_log_list;

  //     if (!approvalLogIds || approvalLogIds.length === 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "No approval sequence configured",
  //       });
  //     }

  //     let approvalLogs = await odooService.searchRead(
  //       "approval.log.list",
  //       [["id", "in", approvalLogIds]],
  //       ["id", "sequence_no_of_user", "approver_id", "is_approved_by_user"]
  //     );

  //     if (!approvalLogs || approvalLogs.length === 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Could not retrieve approval sequence",
  //       });
  //     }

  //     approvalLogs.sort((a, b) => a.sequence_no_of_user - b.sequence_no_of_user);

  //     const currentUserLog = approvalLogs.find(log => {
  //       const approverId = Array.isArray(log.approver_id) ? log.approver_id[0] : log.approver_id;
  //       return approverId === parseInt(user_id);
  //     });

  //     if (!currentUserLog) {
  //       return res.status(403).json({
  //         status: "error",
  //         message: "You are not authorized to reject this request (not in approval sequence)",
  //       });
  //     }

  //     const currentSequence = currentUserLog.sequence_no_of_user;

  //     const previousApprovers = approvalLogs.filter(log =>
  //       log.sequence_no_of_user < currentSequence
  //     );

  //     if (previousApprovers.length > 0) {
  //       for (const prevLog of previousApprovers) {
  //         if (prevLog.is_approved_by_user !== true) {
  //           return res.status(403).json({
  //             status: "error",
  //             message: `Cannot reject. The approver at sequence ${prevLog.sequence_no_of_user} must approve first before you can take action.`,
  //           });
  //         }
  //       }
  //     }

  //     const employeeData = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", parseInt(user_id)]],
  //       ["employee_password", "name"]
  //     );

  //     if (!employeeData || employeeData.length === 0) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee record not found for this user"
  //       });
  //     }

  //     const fetchedPassword = employeeData[0].employee_password;

  //     if (!fetchedPassword || fetchedPassword === "") {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Password not found in Odoo for this employee."
  //       });
  //     }

  //     const wizardId = await odooService.create(
  //       "request.reject.wizard",
  //       { remarks: remarks || `Rejected via App by ${adminName}` },
  //       { uid: parseInt(user_id), userPassword: fetchedPassword }
  //     );

  //     await odooService.callMethod(
  //       "request.reject.wizard",
  //       "action_reject_request",
  //       [parseInt(wizardId)],
  //       {
  //         active_id: approvalRecord.id,
  //         active_model: "approval.request",
  //         active_ids: [approvalRecord.id],
  //       },
  //       parseInt(user_id),
  //       fetchedPassword
  //     );

  //     let updatedRecord = null;

  //     if (approvalRecord.attendance_regulzie_id) {
  //       const regId = approvalRecord.attendance_regulzie_id[0];
  //       await odooService.write(
  //         "attendance.regular",
  //         [regId],
  //         { state_select: "reject" },
  //         parseInt(user_id),
  //         fetchedPassword
  //       );
  //       updatedRecord = { model: "attendance.regular", id: regId };

  //     } else if (approvalRecord.hr_leave_id) {
  //       const leaveId = approvalRecord.hr_leave_id[0];
  //       await odooService.write(
  //         "hr.leave",
  //         [leaveId],
  //         { state: "refuse" },
  //         parseInt(user_id),
  //         fetchedPassword
  //       );
  //       updatedRecord = { model: "hr.leave", id: leaveId };

  //     } else if (approvalRecord.hr_expense_id) {
  //       const sheetId = approvalRecord.hr_expense_id[0];
  //       await odooService.write(
  //         "hr.expense.sheet",
  //         [sheetId],
  //         { state: "cancel" },
  //         parseInt(user_id),
  //         fetchedPassword
  //       );
  //       updatedRecord = { model: "hr.expense.sheet", id: sheetId };
  //     }

  //     return res.status(200).json({
  //       status: "success",
  //       message: `The request has been successfully rejected.`,
  //       data: {
  //         approval_id: approvalRecord.id,
  //         updated_record: updatedRecord,
  //       },
  //     });

  //   } catch (error) {
  //     const isAccessError = error.message.includes("access") ||
  //       error.message.includes("top-secret") ||
  //       error.message.includes("permissions");

  //     return res.status(isAccessError ? 400 : 500).json({
  //       status: "error",
  //       message: error.message
  //     });
  //   }
  // }

  // async rejectAttendanceRegularization(req, res) {
  //   try {
  //     const { approval_request_id, remarks, user_id } = req.body;
  //     const { currentUser } = await getClientFromRequest(req);

  //     const adminName = currentUser?.partner_id ? currentUser.partner_id[1] : "Approver";

  //     if (!approval_request_id || !user_id) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "approval_request_id and user_id are required",
  //       });
  //     }

  //     const approvalRecords = await odooService.searchRead(
  //       "approval.request",
  //       [["id", "=", parseInt(approval_request_id)]],
  //       [
  //         "id",
  //         "name",
  //         "state",
  //         "attendance_regulzie_id",
  //         "hr_leave_id",
  //         "hr_expense_id",
  //         "description",
  //         "approval_log_list"
  //       ]
  //     );

  //     if (!approvalRecords?.length) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Approval Record not found"
  //       });
  //     }

  //     const approvalRecord = approvalRecords[0];

  //     if (approvalRecord.state === 'refused' || approvalRecord.state === 'reject' || approvalRecord.state === 'cancel') {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "This request has already been rejected.",
  //       });
  //     }

  //     const approvalLogIds = approvalRecord.approval_log_list;

  //     if (!approvalLogIds || approvalLogIds.length === 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "No approval sequence configured",
  //       });
  //     }

  //     let approvalLogs = await odooService.searchRead(
  //       "approval.log.list",
  //       [["id", "in", approvalLogIds]],
  //       ["id", "sequence_no_of_user", "approver_id", "is_approved_by_user"]
  //     );

  //     if (!approvalLogs || approvalLogs.length === 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Could not retrieve approval sequence",
  //       });
  //     }

  //     approvalLogs.sort((a, b) => a.sequence_no_of_user - b.sequence_no_of_user);

  //     const currentUserLog = approvalLogs.find(log => {
  //       const approverId = Array.isArray(log.approver_id) ? log.approver_id[0] : log.approver_id;
  //       return approverId === parseInt(user_id);
  //     });

  //     if (!currentUserLog) {
  //       return res.status(403).json({
  //         status: "error",
  //         message: "You are not authorized to reject this request (not in approval sequence)",
  //       });
  //     }

  //     const currentSequence = currentUserLog.sequence_no_of_user;

  //     const previousApprovers = approvalLogs.filter(log =>
  //       log.sequence_no_of_user < currentSequence
  //     );

  //     if (previousApprovers.length > 0) {
  //       for (const prevLog of previousApprovers) {
  //         if (prevLog.is_approved_by_user !== true) {
  //           return res.status(403).json({
  //             status: "error",
  //             message: `Cannot reject. The approver at sequence ${prevLog.sequence_no_of_user} must approve first before you can take action.`,
  //           });
  //         }
  //       }
  //     }

  //     const employeeData = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", parseInt(user_id)]],
  //       ["employee_password", "name"]
  //     );

  //     if (!employeeData || employeeData.length === 0) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee record not found for this user"
  //       });
  //     }

  //     const fetchedPassword = employeeData[0].employee_password;

  //     if (!fetchedPassword || fetchedPassword === "") {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Password not found in Odoo for this employee."
  //       });
  //     }

  //     // Create the wizard
  //     const wizardId = await odooService.create(
  //       "request.reject.wizard",
  //       { remarks: remarks || `Rejected via App by ${adminName}` },
  //       { uid: parseInt(user_id), userPassword: fetchedPassword }
  //     );

  //     // Call the reject action - this is the critical step
  //     // If this fails, we should not proceed
  //     await odooService.callMethod(
  //       "request.reject.wizard",
  //       "action_reject_request",
  //       [parseInt(wizardId)],
  //       {
  //         active_id: approvalRecord.id,
  //         active_model: "approval.request",
  //         active_ids: [approvalRecord.id],
  //       },
  //       parseInt(user_id),
  //       fetchedPassword
  //     );

  //     // Try to update the related records, but don't fail if there are permission issues
  //     // The rejection has already happened in Odoo via the wizard
  //     let updatedRecord = null;

  //     try {
  //       if (approvalRecord.attendance_regulzie_id) {
  //         const regId = approvalRecord.attendance_regulzie_id[0];
  //         await odooService.write(
  //           "attendance.regular",
  //           [regId],
  //           { state_select: "reject" },
  //           parseInt(user_id),
  //           fetchedPassword
  //         );
  //         updatedRecord = { model: "attendance.regular", id: regId };

  //       } else if (approvalRecord.hr_leave_id) {
  //         const leaveId = approvalRecord.hr_leave_id[0];
  //         await odooService.write(
  //           "hr.leave",
  //           [leaveId],
  //           { state: "refuse" },
  //           parseInt(user_id),
  //           fetchedPassword
  //         );
  //         updatedRecord = { model: "hr.leave", id: leaveId };

  //       } else if (approvalRecord.hr_expense_id) {
  //         const sheetId = approvalRecord.hr_expense_id[0];
  //         await odooService.write(
  //           "hr.expense.sheet",
  //           [sheetId],
  //           { state: "cancel" },
  //           parseInt(user_id),
  //           fetchedPassword
  //         );
  //         updatedRecord = { model: "hr.expense.sheet", id: sheetId };
  //       }
  //     } catch (updateError) {
  //       // Log the error but don't fail the request
  //       // The wizard has already handled the rejection in Odoo
  //       console.error("Warning: Could not update related record state:", updateError.message);
  //       // Continue to return success because the rejection itself succeeded
  //     }

  //     return res.status(200).json({
  //       status: "success",
  //       message: `The request has been successfully rejected.`,
  //       data: {
  //         approval_id: approvalRecord.id,
  //         updated_record: updatedRecord,
  //       },
  //     });

  //   } catch (error) {
  //     // Only catch errors that happen BEFORE the wizard action is called
  //     // If we reach here, the rejection hasn't happened yet, so it's safe to return an error
  //     const isAccessError = error.message.includes("access") ||
  //       error.message.includes("top-secret") ||
  //       error.message.includes("permissions");

  //     return res.status(isAccessError ? 400 : 500).json({
  //       status: "error",
  //       message: error.message
  //     });
  //   }
  // }
  async getClientLeaveDashboardCount(req, res) {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          errorMessage: "user_id is required",
        });
      }

      // 1️⃣ User → Partner
      const user = await odooService.searchRead(
        "res.users",
        [["id", "=", Number(user_id)]],
        ["partner_id"]
      );

      if (!user.length) {
        return res.status(404).json({
          success: false,
          errorMessage: "User not found",
        });
      }

      const partnerId = user[0].partner_id?.[0];

      // 2️⃣ Admin employee → Client ID
      const adminEmployee = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["address_id"]
      );

      if (!adminEmployee.length) {
        return res.status(404).json({
          success: false,
          errorMessage: "Admin employee not found",
        });
      }

      const client_id = adminEmployee[0].address_id?.[0];

      // 3️⃣ All employees under same client
      const employees = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", client_id]],
        ["id"]
      );

      const employeeIds = employees.map(e => e.id);

      if (!employeeIds.length) {
        return res.status(200).json({
          success: true,
          data: {
            pending_approvals: 0,
            leave_requests: 0,
          },
        });
      }

      // 4️⃣ Pending Approvals → confirm
      const pendingApprovals = await odooService.searchCount(
        "hr.leave",
        [
          ["employee_id", "in", employeeIds],
          ["state", "=", "confirm"],
        ]
      );

      // 5️⃣ Leave Requests → confirm + validate1
      const leaveRequests = await odooService.searchCount(
        "hr.leave",
        [
          ["employee_id", "in", employeeIds],
          ["state", "in", ["confirm", "validate1"]],
        ]
      );

      return res.status(200).json({
        success: true,
        status: "success",
        data: {
          pending_approvals: pendingApprovals,
          leave_requests: leaveRequests,
        },
        meta: {
          client_id,
          total_employees: employeeIds.length,
        },
      });

    } catch (error) {
      console.error("🔥 Leave Dashboard Count Error:", error);

      return res.status(500).json({
        success: false,
        errorMessage: "Failed to fetch leave dashboard counts",
      });
    }
  }

  // async rejectAttendanceRegularization(req, res) {
  //   try {
  //     console.log("--------------------------------------------------");
  //     console.log("🚀 START: rejectAttendanceRegularization");

  //     const { approval_request_id, remarks, user_id } = req.body;
  //     console.log("📥 Incoming Payload:", { approval_request_id, remarks, user_id });

  //     if (!approval_request_id || !user_id) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "approval_request_id and user_id are required",
  //       });
  //     }

  //     const employeeData = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", parseInt(user_id)]],
  //       ["id", "name", "employee_password"],
  //       1
  //     );

  //     if (!employeeData || employeeData.length === 0) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee record not found for this user",
  //       });
  //     }

  //     const fetchedPassword = employeeData[0].employee_password;

  //     const approvalRecords = await odooService.searchRead(
  //       "approval.request",
  //       [["id", "=", parseInt(approval_request_id)]],
  //       [
  //         "id",
  //         "state",
  //         "attendance_regulzie_id",
  //         "hr_leave_id",
  //         "hr_expense_id",
  //         "approval_log_list"
  //       ],
  //       1
  //     );

  //     if (!approvalRecords || approvalRecords.length === 0) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Approval record not found"
  //       });
  //     }

  //     const approvalRecord = approvalRecords[0];

  //     if (['refused', 'reject', 'cancel'].includes(approvalRecord.state)) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "This request has already been rejected"
  //       });
  //     }

  //     const approvalLogIds = approvalRecord.approval_log_list;
  //     if (!approvalLogIds || approvalLogIds.length === 0) {
  //       return res.status(400).json({ status: "error", message: "No approval sequence configured" });
  //     }

  //     let approvalLogs = await odooService.searchRead(
  //       "approval.log.list",
  //       [["id", "in", approvalLogIds]],
  //       ["id", "sequence_no_of_user", "approver_id", "is_approved_by_user"]
  //     );

  //     approvalLogs.sort((a, b) => a.sequence_no_of_user - b.sequence_no_of_user);

  //     const currentUserLog = approvalLogs.find(log => {
  //       const approverId = Array.isArray(log.approver_id) ? log.approver_id[0] : log.approver_id;
  //       return approverId === parseInt(user_id);
  //     });

  //     if (!currentUserLog) {
  //       return res.status(403).json({ status: "error", message: "You are not authorized to reject this request" });
  //     }

  //     // Check if previous sequences are approved
  //     const previousApprovers = approvalLogs.filter(log => log.sequence_no_of_user < currentUserLog.sequence_no_of_user);
  //     for (const prevLog of previousApprovers) {
  //       if (!prevLog.is_approved_by_user) {
  //         return res.status(403).json({
  //           status: "error",
  //           message: `Approver at sequence ${prevLog.sequence_no_of_user} must approve first.`,
  //         });
  //       }
  //     }

  //     try {
  //       const { currentUser } = await getClientFromRequest(req);
  //       const adminName = currentUser?.partner_id ? currentUser.partner_id[1] : "Approver";

  //       console.log(`⚡ Executing 'reject_request' on approval.request ID: ${approval_request_id}`);

  //       const result = await odooService.callMethod(
  //         "approval.request",
  //         "reject_request",
  //         [parseInt(approval_request_id)],
  //         {
  //           "remarks": remarks || `Rejected via App by ${adminName}`
  //         },
  //         parseInt(user_id),
  //         fetchedPassword
  //       );

  //       console.log("✅ Odoo Execution Successful");

  //       return res.status(200).json({
  //         status: "success",
  //         message: "Request rejected successfully",
  //         data: { approval_id: approval_request_id }
  //       });

  //     } catch (odooError) {
  //       console.error("❌ Odoo Execution Error:", odooError.message);
  //       return res.status(400).json({
  //         status: "error",
  //         message: odooError.message || "Rejection failed."
  //       });
  //     }

  //   } catch (error) {
  //     console.error("🔥 Critical Server Error:", error.message);
  //     return res.status(500).json({ status: "error", message: error.message });
  //   }
  // }

  async rejectAttendanceRegularization(req, res) {
    try {
      console.log("--------------------------------------------------");
      console.log("🚀 START: rejectAttendanceRegularization");

      const { approval_request_id, remarks, user_id } = req.body;
      const { currentUser } = await getClientFromRequest(req);
      const adminName = currentUser?.partner_id ? currentUser.partner_id[1] : "Approver";

      if (!approval_request_id || !user_id) {
        return res.status(400).json({
          status: "error",
          message: "request_id and user_id are required",
        });
      }

      const employeeData = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", parseInt(user_id)]],
        ["id", "name", "employee_password"],
        1
      );

      if (!employeeData || employeeData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Employee record not found for this user",
        });
      }

      const fetchedPassword = employeeData[0].employee_password;

      // --- STEP 2: Fetch Approval Record ---
      const approvalRecords = await odooService.searchRead(
        "approval.request",
        [["id", "=", parseInt(approval_request_id)]],
        ["id", "state", "attendance_regulzie_id", "hr_leave_id", "hr_expense_id", "approval_log_list"],
        1
      );

      if (!approvalRecords?.length) {
        return res.status(404).json({ status: "error", message: "Request record not found" });
      }

      const approvalRecord = approvalRecords[0];

      // --- STEP 3: Sequence & Status Validation ---
      if (['refused', 'reject', 'cancel'].includes(approvalRecord.state)) {
        return res.status(400).json({ status: "error", message: "This request has already been rejected" });
      }

      const approvalLogIds = approvalRecord.approval_log_list;
      let approvalLogs = await odooService.searchRead(
        "approval.log.list",
        [["id", "in", approvalLogIds]],
        ["id", "sequence_no_of_user", "approver_id", "is_approved_by_user"]
      );

      approvalLogs.sort((a, b) => a.sequence_no_of_user - b.sequence_no_of_user);
      const currentUserLog = approvalLogs.find(log => (Array.isArray(log.approver_id) ? log.approver_id[0] : log.approver_id) === parseInt(user_id));

      if (!currentUserLog) {
        return res.status(403).json({ status: "error", message: "Not authorized in sequence" });
      }

      const previousApprovers = approvalLogs.filter(log => log.sequence_no_of_user < currentUserLog.sequence_no_of_user);
      for (const prevLog of previousApprovers) {
        if (!prevLog.is_approved_by_user) {
          return res.status(403).json({ status: "error", message: `Sequence ${prevLog.sequence_no_of_user} must approve first.` });
        }
      }

      // --- STEP 4: Execution Logic ---
      try {
        // A. Pehle Main Model ka Method Call (reject_request)
        console.log("⚡ Step 4A: Calling reject_request on approval.request");
        await odooService.callMethod(
          "approval.request",
          "reject_request",
          [parseInt(approval_request_id)],
          { "remarks": remarks || `Rejected by ${adminName}` },
          parseInt(user_id),
          fetchedPassword
        );

        // B. Uske baad Wizard Create karna
        console.log("🔍 Step 4B: Creating request.reject.wizard");
        const wizardId = await odooService.create(
          "request.reject.wizard",
          { remarks: remarks || `Rejected via App by ${adminName}` },
          { uid: parseInt(user_id), userPassword: fetchedPassword }
        );

        // C. Wizard ka Action Method Call karna
        console.log(`⚡ Step 4C: Executing action_reject_request on Wizard ID: ${wizardId}`);
        await odooService.callMethod(
          "request.reject.wizard",
          "action_reject_request",
          [parseInt(wizardId)],
          {
            active_id: approvalRecord.id,
            active_model: "approval.request",
            active_ids: [approvalRecord.id],
          },
          parseInt(user_id),
          fetchedPassword
        );

        // Updated record info for response
        let updatedRecord = null;
        if (approvalRecord.attendance_regulzie_id) updatedRecord = { model: "attendance.regular", id: approvalRecord.attendance_regulzie_id[0] };
        else if (approvalRecord.hr_leave_id) updatedRecord = { model: "hr.leave", id: approvalRecord.hr_leave_id[0] };
        else if (approvalRecord.hr_expense_id) updatedRecord = { model: "hr.expense.sheet", id: approvalRecord.hr_expense_id[0] };

        return res.status(200).json({
          status: "success",
          message: "The request has been successfully rejected.",
          data: { approval_id: approvalRecord.id, updated_record: updatedRecord }
        });

      } catch (odooError) {
        return res.status(400).json({ status: "error", message: odooError.message });
      }

    } catch (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
}
module.exports = new ApiController();
