const odooService = require("../services/odoo.service");
const mailService = require("../services/mail.service");
const redisClient = require("../services/redisClient");
const { getClientFromRequest } = require("../services/plan.helper");
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
        return res.status(200).json({
          status: "error",
          message: "gst_number is required",
        });
      }

      let result = await odooService.execute(
        "res.partner",
        "autocomplete_by_vat",
        [gst_number, 104],
        { timeout: 15 }
      );

      if (!result || result.length === 0) {
        return res.status(200).json({
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
      return res.status(200).json({
        status: "error",
        message: "Failed to validate GST number",
      });
    }
  }
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

      const existingUsers = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id"]
      );

      let cleanImage = null;
      if (client_image) {
        cleanImage = client_image.replace(/^data:image\/\w+;base64,/, "");
      }

      if (existingUsers && existingUsers.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Already Registered Email",
        });
      }

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

      const superadminUser = await odooService.searchRead(
        "res.users",
        [["id", "=", 2]],
        ["company_id"]
      );

      const superadminCompanyId = superadminUser[0].company_id[0];

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
      const userId = await odooService.create("res.users", userVals);
      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", userId]],
        ["partner_id"]
      );

      const companyPartnerId = userData[0].partner_id[0];
      await odooService.write("res.partner", [companyPartnerId], {
        company_type: "company",
        name: company_name,
        is_from_konvert_hr_portal: true,
      });
      const childContactVals = {
        parent_id: companyPartnerId,
        type: "contact",
        name: `${first_name} ${last_name}`,
        email: email,
        phone: mobile,
        phone_res: mobile,
        mobile: mobile,
      };

      await odooService.create("res.partner", childContactVals);
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
      console.log("🔥 Login API called of the Register");
      const { email, password, is_plan_login } = req.body;
      console.log("body data.....", req.body);

      if (!email || !password) {
        return res.status(400).json({
          status: "error",
          message: "Email and Password are required",
        });
      }

      const validEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!validEmailRegex.test(email)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid email format",
        });
      }
      const userRecord = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        [
          "id",
          "login",
          "name",
          "first_name",
          "last_name",
          "partner_id",
          "unique_user_id",
        ]
      );

      if (!userRecord || userRecord.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found. Please signup.",
        });
      }

      const user = userRecord[0];
      const unique_user_id = user.unique_user_id;
      const partnerId = user.partner_id?.[0];
      const first_name = user.first_name || "";
      const last_name = user.last_name || "";
      const full_name = `${first_name} ${last_name}`.trim();

      if (!partnerId) {
        return res.status(500).json({
          status: "error",
          message: "Partner not linked with user",
        });
      }
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
      if (is_plan_login === true) {
        const plan = await odooService.searchRead(
          "client.plan.details",
          [
            ["partner_id", "=", partnerId],
            ["is_expier", "=", true],
          ],
          ["id", "product_id", "start_date", "end_date"],
          1
        );

        if (!plan || plan.length === 0) {
          return res.status(403).json({
            status: "error",
            message:
              "Your plan has expired. Please renew your subscription to continue.",
          });
        }
        await odooService.write(
          "res.users",
          user.id,
          { is_client_employee_admin: true }
        );
        return res.status(200).json({
          status: "success",
          message: "Login successful! Your plan is active.",
          unique_user_id,
          user_id: uid,
          email,
          partner_id: partnerId,
          plan_id: plan[0].id,
          product_id: plan[0].product_id,
          start_date: plan[0].start_date,
          end_date: plan[0].end_date,
          full_name,
          name: user.name,
          is_client_employee_admin: true,
        });
      }

      const token = jwt.sign(
        {
          userId: uid,
          email: email,
          name: user.name,
          odoo_username: email,
          odoo_password: password,
          odoo_db: odooService.db,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        unique_user_id: unique_user_id,
        user_id: uid,
        email: email,
        name: user.name,
        full_name: full_name,
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

      // -------------------------
      // Validate Department ID
      // -------------------------
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
        is_published: true,
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
          "is_published",
          "skill_ids"
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
        is_published: job.is_published,
        skill_ids: job.skill_ids || []
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
      if (Array.isArray(skill_ids))
        vals.skill_ids = [[6, 0, valid_skill_ids]];
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
      const departments = await odooService.searchRead(
        "hr.department",
        [["client_id", "=", client_id]],
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
        return res
          .status(200)
          .json({ status: "error", message: "Email is required" });
      }

      const user = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id", "name"]
      );

      if (!user || user.length === 0) {
        return res
          .status(200)
          .json({ status: "error", message: "Email not found" });
      }

      const userName = user[0].name || "User";

      const randomTempPass = Math.random().toString(36).slice(-10) + "A1!";

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
                We have received your request to change your password.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Your temporary password is:
              </p>
              <div style="background-color: #f8f8f8; border-left: 4px solid #5f5cc4; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; font-size: 24px; font-weight: bold; color: #5f5cc4; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                  ${randomTempPass}
                </p>
              </div>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                This password will expire in <strong>5 minutes</strong>.
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
      return res
        .status(500)
        .json({ status: "error", message: "Something went wrong" });
    }
  }
  async resetPassword(req, res) {
    try {
      const { email, temp_password, new_password, confirm_password } = req.body;

      if (!email || !temp_password || !new_password || !confirm_password) {
        return res
          .status(200)
          .json({ status: "error", message: "All fields are required" });
      }

      if (new_password !== confirm_password) {
        return res
          .status(200)
          .json({ status: "error", message: "Passwords do not match" });
      }

      const user = await odooService.searchRead(
        "res.users",
        [["login", "=", email]],
        ["id"]
      );

      if (!user || user.length === 0) {
        return res
          .status(200)
          .json({ status: "error", message: "Email not found" });
      }

      const userId = user[0].id;

      const savedTempPass = await redisClient.get(`tempPass:${email}`);

      if (!savedTempPass) {
        return res

          .status(200)
          .json({ status: "error", message: "Temporary password expired" });
      }

      if (savedTempPass !== temp_password) {
        return res.status(200).json({
          status: "error",
          message: "Temporary password is incorrect",
        });
      }

      await odooService.write("res.users", [userId], {
        password: new_password,
      });

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

  async handleGetOptions(res) {
    const options = {
      leave_validation_type: [
        { value: "no_validation", label: "No Validation" },
        { value: "hr", label: "By Leave Officer" },
        { value: "manager", label: "By Employee's Approver" },
        { value: "both", label: "By Employee's Approver and Leave Officer" },
        { value: "multi", label: "Multi Level Approval" },
      ],
      requires_allocation: [
        {
          value: "yes",
          label: "Yes",
          description: "Time off requests need to have a valid allocation",
        },
        { value: "no", label: "No Limit" },
      ],
      employee_requests: [
        { value: "yes", label: "Extra Days Requests Allowed" },
        { value: "no", label: "Not Allowed" },
      ],
      time_type: [
        { value: "other", label: "Worked Time" },
        { value: "leave", label: "Absence" },
      ],
      request_unit: [
        { value: "day", label: "Day" },
        { value: "half_day", label: "Half Day" },
        { value: "hour", label: "Hours" },
      ],
      employee_category: [
        { value: "staff", label: "Staff" },
        { value: "contract", label: "Contract" },
        { value: "intern", label: "Intern" },
      ],
      gender_restriction: [
        { value: "na", label: "Not Applicable" },
        { value: "all", label: "All" },
        { value: "female", label: "Female" },
        { value: "male", label: "Male" },
        { value: "other", label: "Other" },
      ],
      eligible_after: [
        { value: "joining", label: "Days After Joining" },
        { value: "confirmation", label: "Confirmation Date" },
      ],
    };

    return res.status(200).json({
      status: "success",
      type: "options",
      message: "Leave type options retrieved successfully",
      data: options,
    });
  }

  async getLeaveData(req, res) {
    try {
      const { type } = req.query;
      const loggedInUserId = req.userId;

      console.log("✅ Logged in user ID:", loggedInUserId);
      if (!type) {
        return res.status(400).json({
          status: "error",
          message:
            "Type parameter is required. Valid types: options, officers, approvers, projects",
        });
      }

      const validTypes = ["options", "officers", "approvers", "projects"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid type. Must be one of: ${validTypes.join(", ")}`,
        });
      }
      switch (type) {
        case "options":
          return await this.handleGetOptions(res);

        case "officers":
          return await this.handleGetOfficers(res, loggedInUserId);

        case "approvers":
          return await this.handleGetApprovers(res, loggedInUserId);

        case "projects":
          return await this.handleGetProjects(res, loggedInUserId);

        default:
          return res.status(400).json({
            status: "error",
            message: "Invalid type parameter",
          });
      }
    } catch (error) {
      console.error("Get leave data error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to retrieve leave data",
      });
    }
  }
  async handleGetOfficers(res, loggedInUserId) {
    try {
      const loggedInUser = await odooService.searchRead(
        "res.users",
        [["id", "=", loggedInUserId]],
        ["company_id"],
        1
      );

      if (!loggedInUser || loggedInUser.length === 0) {
        return res.status(404).json({
          status: "error",
          type: "officers",
          message: "Logged-in user not found",
        });
      }

      const userDefaultCompanyId = loggedInUser[0].company_id[0];
      const leaveGroups = await odooService.searchRead(
        "res.groups",
        [
          "|",
          "|",
          ["full_name", "=", "Time Off / Officer: Manage all requests"],
          ["name", "=", "Officer: Manage all requests"],
          ["name", "ilike", "Officer"],
        ],
        ["id", "name", "full_name"],
        0
      );

      if (!leaveGroups || leaveGroups.length === 0) {
        return res.status(404).json({
          status: "error",
          type: "officers",
          message: "Time Off Officer group not found in system",
          suggestion:
            "Please check if 'Time Off / Officer: Manage all requests' group exists in Odoo",
        });
      }

      const leaveGroupIds = leaveGroups.map((group) => group.id);
      const searchDomain = [
        ["share", "=", false],
        ["active", "=", true],
        ["groups_id", "in", leaveGroupIds],
        ["company_id", "=", userDefaultCompanyId],
      ];
      const users = await odooService.searchRead(
        "res.users",
        searchDomain,
        ["id", "name", "login", "email", "company_id", "company_ids"],
        0
      );

      if (!users || users.length === 0) {
        return res.status(404).json({
          status: "info",
          type: "officers",
          message: "No users found with Leave Officer rights in your company",
          your_company_id: userDefaultCompanyId,
          groups_checked: leaveGroups.map((g) => g.full_name || g.name),
        });
      }

      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email || user.login,
        company_id: user.company_id ? user.company_id[0] : null,
        company_name: user.company_id ? user.company_id[1] : null,
      }));

      return res.status(200).json({
        status: "success",
        type: "officers",
        message: "Leave Officers retrieved successfully",
        count: formattedUsers.length,
        your_company_id: userDefaultCompanyId,
        groups_found: leaveGroups.map((g) => ({
          id: g.id,
          name: g.full_name || g.name,
        })),
        data: formattedUsers,
      });
    } catch (error) {
      console.error("Get officers error:", error);
      return res.status(500).json({
        status: "error",
        type: "officers",
        message: "Failed to retrieve leave officers",
      });
    }
  }
  async handleGetApprovers(res, loggedInUserId) {
    try {
      const loggedInUser = await odooService.searchRead(
        "res.users",
        [["id", "=", loggedInUserId]],
        ["company_id"],
        1
      );

      if (!loggedInUser || loggedInUser.length === 0) {
        return res.status(404).json({
          status: "error",
          type: "approvers",
          message: "Logged-in user not found",
        });
      }

      const userDefaultCompanyId = loggedInUser[0].company_id[0];

      const searchDomain = [
        ["active", "=", true],
        ["company_id", "=", userDefaultCompanyId],
      ];

      const employees = await odooService.searchRead(
        "hr.employee",
        searchDomain,
        [
          "id",
          "name",
          "work_email",
          "job_title",
          "department_id",
          "company_id",
        ],
        0
      );

      if (!employees || employees.length === 0) {
        return res.status(404).json({
          status: "error",
          type: "approvers",
          message: "No employees found in your company",
          your_company_id: userDefaultCompanyId,
        });
      }

      const formattedEmployees = employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        email: emp.work_email,
        job_title: emp.job_title,
        department: emp.department_id ? emp.department_id[1] : null,
        company_id: emp.company_id ? emp.company_id[0] : null,
        company_name: emp.company_id ? emp.company_id[1] : null,
      }));

      return res.status(200).json({
        status: "success",
        type: "approvers",
        message: "Employees retrieved successfully",
        count: formattedEmployees.length,
        your_company_id: userDefaultCompanyId,
        data: formattedEmployees,
      });
    } catch (error) {
      console.error("Get approvers error:", error);
      return res.status(500).json({
        status: "error",
        type: "approvers",
        message: "Failed to retrieve employees",
      });
    }
  }
  async handleGetProjects(res, loggedInUserId) {
    try {
      const loggedInUser = await odooService.searchRead(
        "res.users",
        [["id", "=", loggedInUserId]],
        ["company_id"],
        1
      );

      if (!loggedInUser || loggedInUser.length === 0) {
        return res.status(404).json({
          status: "error",
          type: "projects",
          message: "Logged-in user not found",
        });
      }

      const userDefaultCompanyId = loggedInUser[0].company_id[0];
      const searchDomain = [
        ["active", "=", true],
        ["user_id", "=", loggedInUserId],
        "|",
        ["company_id", "=", userDefaultCompanyId],
        ["company_id", "=", false],
      ];

      const projects = await odooService.searchRead(
        "project.project",
        searchDomain,
        ["id", "name", "company_id", "partner_id", "user_id"],
        0
      );

      if (!projects || projects.length === 0) {
        return res.status(404).json({
          status: "info",
          type: "projects",
          message: "No projects found created by you",
          your_user_id: loggedInUserId,
          your_company_id: userDefaultCompanyId,
          suggestion: "You haven't created any projects yet",
        });
      }

      const formattedProjects = projects.map((project) => ({
        id: project.id,
        name: project.name,
        company_id: project.company_id ? project.company_id[0] : null,
        company_name: project.company_id
          ? project.company_id[1]
          : "All Companies",
        partner_id: project.partner_id ? project.partner_id[0] : null,
        partner_name: project.partner_id ? project.partner_id[1] : null,
        created_by_user_id: project.user_id ? project.user_id[0] : null,
        created_by_user_name: project.user_id ? project.user_id[1] : null,
      }));

      return res.status(200).json({
        status: "success",
        type: "projects",
        message: "Your projects retrieved successfully",
        count: formattedProjects.length,
        your_user_id: loggedInUserId,
        your_company_id: userDefaultCompanyId,
        data: formattedProjects,
      });
    } catch (error) {
      console.error("Get projects error:", error);
      return res.status(500).json({
        status: "error",
        type: "projects",
        message: "Failed to retrieve projects",
      });
    }
  }
  async createLeave(req, res) {
    try {
      let {
        name,
        leave_type_code,
        is_sandwich_leave,
        l10n_in_is_sandwich_leave,
        include_public_holidays_in_duration,
        show_on_dashboard,
        support_document,
        is_earned_leave,
        allow_encashment,
        allow_carry_forward,
        allow_lapse,
        leave_validation_type,
        requires_allocation,
        employee_requests,
        time_type,
        request_unit,
        employee_category,
        gender_restriction,
        eligible_after,
        working_days_threshold,
        days_earned_per_month,
        max_annual_cap,
        responsible_names,
        hr_approver_name,
        project_name,
      } = req.body;
      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Leave type name is required",
        });
      }

      const validationErrors = [];

      const allowedValidationTypes = [
        "no_validation",
        "hr",
        "manager",
        "both",
        "multi",
      ];
      const allowedYesNo = ["yes", "no"];
      const allowedTimeType = ["other", "leave"];
      const allowedReqUnit = ["day", "half_day", "hour"];
      const allowedEmpCategory = ["staff", "contract", "intern"];
      const allowedGender = ["na", "all", "female", "male", "other"];
      const allowedEligible = ["joining", "confirmation"];

      if (
        leave_validation_type &&
        !allowedValidationTypes.includes(leave_validation_type)
      )
        validationErrors.push("Invalid leave_validation_type");

      if (requires_allocation && !allowedYesNo.includes(requires_allocation))
        validationErrors.push("Invalid requires_allocation");

      if (employee_requests && !allowedYesNo.includes(employee_requests))
        validationErrors.push("Invalid employee_requests");

      if (time_type && !allowedTimeType.includes(time_type))
        validationErrors.push("Invalid time_type");

      if (request_unit && !allowedReqUnit.includes(request_unit))
        validationErrors.push("Invalid request_unit");

      if (employee_category && !allowedEmpCategory.includes(employee_category))
        validationErrors.push("Invalid employee_category");

      if (gender_restriction && !allowedGender.includes(gender_restriction))
        validationErrors.push("Invalid gender_restriction");

      if (eligible_after && !allowedEligible.includes(eligible_after))
        validationErrors.push("Invalid eligible_after");
      if (
        working_days_threshold !== undefined &&
        working_days_threshold !== null
      ) {
        const threshold = parseInt(working_days_threshold);
        if (isNaN(threshold) || threshold < 0) {
          validationErrors.push(
            "working_days_threshold must be a positive integer"
          );
        }
      }

      if (
        days_earned_per_month !== undefined &&
        days_earned_per_month !== null
      ) {
        const daysPerMonth = parseFloat(days_earned_per_month);
        if (isNaN(daysPerMonth) || daysPerMonth < 0) {
          validationErrors.push(
            "days_earned_per_month must be a positive number"
          );
        }
      }

      if (max_annual_cap !== undefined && max_annual_cap !== null) {
        const maxCap = parseInt(max_annual_cap);
        if (isNaN(maxCap) || maxCap < 0) {
          validationErrors.push("max_annual_cap must be a positive integer");
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: validationErrors,
        });
      }

      if (allow_carry_forward && allow_lapse) {
        return res.status(400).json({
          status: "error",
          message: "Cannot enable both 'Allow Carry Forward' and 'Allow Lapse'",
        });
      }

      if (leave_type_code) {
        const regex = /^[a-zA-Z0-9_]+$/;
        if (!regex.test(leave_type_code)) {
          return res.status(400).json({
            status: "error",
            message:
              "Leave type code must be alphanumeric with underscores only",
          });
        }
      }
      const loggedInUser = await odooService.searchRead(
        "res.users",
        [["id", "=", req.userId]],
        ["company_id"],
        1
      );

      if (!loggedInUser || loggedInUser.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Logged-in user not found",
        });
      }

      const userCompanyId = loggedInUser[0].company_id[0];
      const leaveGroups = await odooService.searchRead(
        "res.groups",
        [
          "|",
          ["full_name", "=", "Time Off / Officer: Manage all requests"],
          ["name", "=", "Officer: Manage all requests"],
        ],
        ["id", "name"]
      );

      if (!leaveGroups || leaveGroups.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Leave Officer group not found in system",
        });
      }

      const leaveGroupIds = leaveGroups.map((g) => g.id);
      let responsible_ids = [];

      if (responsible_names && Array.isArray(responsible_names)) {
        for (let userName of responsible_names) {
          const userRecord = await odooService.searchRead(
            "res.users",
            [["name", "=", userName]],
            ["id", "company_id"],
            1
          );

          if (!userRecord || userRecord.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `Responsible user '${userName}' not found`,
            });
          }

          const userId = userRecord[0].id;
          const userCompany = userRecord[0].company_id[0];

          if (userCompany !== userCompanyId) {
            return res.status(400).json({
              status: "error",
              message: `User '${userName}' is not in your company`,
            });
          }

          const isOfficer = await odooService.searchRead(
            "res.users",
            [
              ["id", "=", userId],
              ["groups_id", "in", leaveGroupIds],
            ],
            ["id"],
            1
          );

          if (!isOfficer || isOfficer.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `User '${userName}' does not have Leave Officer rights`,
            });
          }

          responsible_ids.push(userId);
        }
      }
      let hr_approver_id = null;

      if (hr_approver_name) {
        const empRecord = await odooService.searchRead(
          "hr.employee",
          [
            ["name", "=", hr_approver_name],
            ["comdeleteHrContractTypepany_id", "=", userCompanyId],
          ],
          ["id"],
          1
        );

        if (empRecord.length > 0) {
          hr_approver_id = empRecord[0].id;
        } else {
          const userRecord = await odooService.searchRead(
            "res.users",
            [
              ["name", "=", hr_approver_name],
              "|",
              ["company_id", "=", userCompanyId],
              ["company_ids", "in", [userCompanyId]],
            ],
            ["id"],
            1
          );

          if (userRecord.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `HR approver '${hr_approver_name}' not found as employee or user`,
            });
          }

          const empFromUser = await odooService.searchRead(
            "hr.employee",
            [["user_id", "=", userRecord[0].id]],
            ["id"],
            1
          );

          if (empFromUser.length === 0) {
            return res.status(400).json({
              status: "error",
              message: `User '${hr_approver_name}' exists but is not linked to any employee record`,
            });
          }

          hr_approver_id = empFromUser[0].id;
        }
      }
      let timesheet_project_id = null;

      if (project_name) {
        const projectRecord = await odooService.searchRead(
          "project.project",
          [
            ["name", "=", project_name],
            "|",
            ["company_id", "=", userCompanyId],
            ["company_id", "=", false],
          ],
          ["id", "company_id"],
          1
        );

        if (!projectRecord || projectRecord.length === 0) {
          return res.status(400).json({
            status: "error",
            message: `Project '${project_name}' not found in your company`,
          });
        }

        timesheet_project_id = projectRecord[0].id;
      }
      const existingLeave = await odooService.searchRead(
        "hr.leave.type",
        [["name", "=", name]],
        ["id"],
        1
      );

      if (existingLeave.length > 0) {
        return res.status(409).json({
          status: "info",
          message: "Leave type already exists",
          existing_id: existingLeave[0].id,
        });
      }
      const vals = {
        name,
        is_sandwich_leave,
        l10n_in_is_sandwich_leave,
        include_public_holidays_in_duration,
        show_on_dashboard,
        support_document,
        is_earned_leave,
        allow_encashment,
        allow_carry_forward,
        allow_lapse,

        leave_validation_type,
        requires_allocation,
        employee_requests,
        time_type,
        request_unit,
        employee_category,
        gender_restriction,
        eligible_after,
      };
      if (leave_type_code) vals.leave_type_code = leave_type_code;
      if (
        working_days_threshold !== undefined &&
        working_days_threshold !== null
      ) {
        vals.working_days_threshold = parseInt(working_days_threshold);
      }

      if (
        days_earned_per_month !== undefined &&
        days_earned_per_month !== null
      ) {
        vals.days_earned_per_month = parseFloat(days_earned_per_month);
      }

      if (max_annual_cap !== undefined && max_annual_cap !== null) {
        vals.max_annual_cap = parseInt(max_annual_cap);
      }

      if (responsible_ids.length > 0) {
        vals.responsible_ids = [[6, 0, responsible_ids]];
      }

      if (hr_approver_id) {
        vals.hr_approver_id = hr_approver_id;
      }
      if (timesheet_project_id) {
        vals.timesheet_project_id = timesheet_project_id;
      }

      const leaveTypeId = await odooService.create("hr.leave.type", vals);

      return res.status(201).json({
        status: "success",
        message: "Leave type created successfully",
        data: {
          id: leaveTypeId,
          responsible_ids,
          hr_approver_id,
          timesheet_project_id,
          working_days_threshold: vals.working_days_threshold,
          days_earned_per_month: vals.days_earned_per_month,
          max_annual_cap: vals.max_annual_cap,
        },
      });
    } catch (error) {
      console.error("Create leave type error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create leave type",
        error: error.message,
      });
    }
  }
  async createAccrualPlan(req, res) {
    try {
      const {
        name,
        accrued_gain_time,
        carryover_date,
        is_based_on_worked_time,
      } = req.body;

      if (!name || !accrued_gain_time || !carryover_date) {
        return res.status(400).json({
          status: "error",
          message: "Name, accrued_gain_time, and carryover_date are required",
        });
      }

      const userCompanyId = req.companyId;
      if (!userCompanyId) {
        return res.status(400).json({
          status: "error",
          message: "Company not found for this user",
        });
      }

      const accrualPlanData = {
        name,
        accrued_gain_time,
        carryover_date,
        company_id: userCompanyId,
      };

      if (
        accrued_gain_time !== "start" &&
        is_based_on_worked_time !== undefined
      ) {
        accrualPlanData.is_based_on_worked_time = is_based_on_worked_time;
      }

      console.log("---- ACCRUAL PLAN CREATION ----");
      console.log("User ID creating record:", req.userId);
      console.log("User Company ID:", req.companyId);
      console.log("Data sending to Odoo:", accrualPlanData);
      console.log("--------------------------------");
      const accrualPlanId = await odooService.create(
        "hr.leave.accrual.plan",
        accrualPlanData,
        {
          uid: req.userId,
          userPassword: req.userPassword,
        }
      );

      console.log("✅ Created Accrual Plan ID:", accrualPlanId);

      return res.status(200).json({
        status: "success",
        message: "Accrual plan created successfully",
        id: accrualPlanId,
      });
    } catch (error) {
      console.error("🔥 Error in createAccrualPlan:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create accrual plan",
        error: error.message,
      });
    }
  }
  async getAccrualPlans(req, res) {
    try {
      const userCompanyId = req.companyId;
      if (!userCompanyId) {
        return res.status(400).json({
          status: "error",
          message: "Company not found for this user",
        });
      }
      const domain = [["company_id", "=", userCompanyId]];
      const fields = [
        "name",
        "accrued_gain_time",
        "carryover_date",
        "is_based_on_worked_time",
        "company_id",
        "create_uid",
        "write_uid",
      ];
      const accrualPlans = await odooService.searchRead(
        "hr.leave.accrual.plan",
        domain,
        fields
      );
      if (!accrualPlans || accrualPlans.length === 0) {
        return res.status(200).json({
          status: "success",
          message:
            "No accrual plans found. Please create an accrual plan first.",
          data: [],
        });
      }
      return res.status(200).json({
        status: "success",
        data: accrualPlans,
      });
    } catch (error) {
      console.error("Error in getAccrualPlans:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch accrual plans",
        error: error.message,
      });
    }
  }
  async updateAccrualPlan(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        accrued_gain_time,
        carryover_date,
        is_based_on_worked_time,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Accrual plan ID is required",
        });
      }

      const updateData = {};

      if (name !== undefined) updateData.name = name;
      if (accrued_gain_time !== undefined)
        updateData.accrued_gain_time = accrued_gain_time;
      if (carryover_date !== undefined)
        updateData.carryover_date = carryover_date;
      if (is_based_on_worked_time !== undefined)
        updateData.is_based_on_worked_time = is_based_on_worked_time;

      const updated = await odooService.write(
        "hr.leave.accrual.plan",
        [id],
        updateData
      );

      return res.status(200).json({
        status: "success",
        message: "Accrual plan updated successfully",
        updated: updated,
      });
    } catch (error) {
      console.error("Error in updateAccrualPlan:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update accrual plan",
        error: error.message,
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
      const { skill_names, skill_level_name, level_progress, default_level } =
        req.body;

      if (!skill_type_id) {
        return res.status(400).json({
          status: "error",
          message: "skill_type_id is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const skillType = await odooService.searchRead(
        "hr.skill.type",
        [
          ["id", "=", parseInt(skill_type_id)],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!skillType.length) {
        return res.status(403).json({
          status: "error",
          message: "Unauthorized or Skill Type not found for this client",
        });
      }
      const updatedSkills = [];

      if (Array.isArray(skill_names)) {
        for (const name of skill_names) {
          const exists = await odooService.searchRead(
            "hr.skill",
            [
              ["name", "=", name],
              ["skill_type_id", "=", parseInt(skill_type_id)],
            ],
            ["id"],
            1
          );

          if (!exists.length) {
            const id = await odooService.create("hr.skill", {
              name,
              skill_type_id: parseInt(skill_type_id),
            });

            updatedSkills.push({ name, id });
          }
        }
      }
      let updatedLevel = null;

      if (skill_level_name) {
        const existingLevel = await odooService.searchRead(
          "hr.skill.level",
          [
            ["skill_type_id", "=", parseInt(skill_type_id)],
            ["name", "=", skill_level_name],
          ],
          ["id"],
          1
        );

        if (existingLevel.length) {
          await odooService.write("hr.skill.level", [existingLevel[0].id], {
            ...(level_progress !== undefined && {
              level_progress: parseInt(level_progress),
            }),
            ...(default_level !== undefined && {
              default_level: !!default_level,
            }),
          });

          updatedLevel = existingLevel[0].id;
        }
      }

      return res.json({
        status: "success",
        message: "Skill updated successfully",
        data: {
          added_skills: updatedSkills,
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
      } = req.body;

      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "Calendar name is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "resource.calendar",
        [
          ["name", "=", name],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: "Working schedule already exists",
        });
      }

      if (!flexible_hours && hours_per_day !== undefined) {
        return res.status(400).json({
          status: "error",
          message:
            "Average Hour per Day is allowed only when Flexible Hours is true",
        });
      }

      const vals = {
        name,
        client_id,
        flexible_hours: !!flexible_hours,
        is_night_shift: !!is_night_shift,
        tz: tz || false,
        full_time_required_hours:
          full_time_required_hours !== undefined ? full_time_required_hours : 0,
      };

      if (flexible_hours) {
        vals.hours_per_day = hours_per_day || 0;
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
          "attendance_ids",
        ]
      );

      const calendarData = await Promise.all(
        calendars.map(async (cal) => {
          let attendances = [];

          if (cal.attendance_ids?.length) {
            attendances = await odooService.searchRead(
              "resource.calendar.attendance",
              [["id", "in", cal.attendance_ids]],
              ["id", "dayofweek", "day_period", "hour_from", "hour_to"]
            );
          }

          return {
            id: cal.id,
            name: cal.name,
            flexible_hours: cal.flexible_hours,
            is_night_shift: cal.is_night_shift,
            full_time_required_hours: cal.full_time_required_hours,
            hours_per_day: cal.flexible_hours ? cal.hours_per_day : null,
            tz: cal.tz,
            attendance_ids: attendances,
          };
        })
      );

      return res.status(200).json({
        status: "success",
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

      console.log("partner branch payload --:", vals)
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
      console.log("API Called getPartners Branches .......")
      const { client_id } = await getClientFromRequest(req);

      const partners = await odooService.searchRead(
        "res.partner",
        [
          ["parent_id", "=", client_id]
        ],
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
        "email"
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
        active: false
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
          ["check_in", "<=", formatDateTimeForOdoo(todayEnd)]
        ],
        ["id", "check_in", "check_out", "checkin_lat", "checkin_lon"],
        { order: "check_in desc", limit: 1 }
      );

      // ✨ CASE 1: CHECK-OUT Request (check_out field is provided)
      if (isCheckOut) {
        if (!todayAttendance || todayAttendance.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "No active check-in found for today. Please check-in first.",
          });
        }

        const currentAttendance = todayAttendance[0];

        // Check if already checked out
        if (currentAttendance.check_out && currentAttendance.check_out !== false) {
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
        await odooService.update(
          "hr.attendance",
          currentAttendance.id,
          {
            check_out: formatDateTimeForOdoo(check_out),  // ✅ Correct checkout time
            checkout_lat: checkout_lat || false,
            checkout_lon: checkout_lon || false,
          }
        );

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
        if (!currentAttendance.check_out || currentAttendance.check_out === false) {
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
        await odooService.update(
          "hr.attendance",
          currentAttendance.id,
          {
            check_in: formatDateTimeForOdoo(check_in),  // ✅ Update to latest check-in
            checkin_lat: checkin_lat || currentAttendance.checkin_lat,
            checkin_lon: checkin_lon || currentAttendance.checkin_lon,
            check_out: false,  // Reset to "Currently Working"
            checkout_lat: false,
            checkout_lon: false,
            // Update device info
            system_version: system_version || "",
            user_agent: user_agent || "",
            application_name: application_name || "",
            device_id: device_id || "",
            location: location || "",
            ip_address: ip_address || "",
          }
        );

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
  async getAllAttendances(req, res) {
    try {
      const {
        user_id,
        date_from,
        date_to,
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
      const employee = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", parseInt(user_id)]],
        ["id", "name"]
      );
      if (!employee.length) {
        return res.status(400).json({
          success: false,
          status: "error",
          errorMessage: `No employee found for user_id: ${user_id}`,
          successMessage: "",
          statuscode: 404,
        });
      }
      const employeeId = employee[0].id;
      console.log("✅ Employee found:", employee[0]);
      let domain = [["employee_id", "=", employeeId]];
      if (date_from) {
        domain.push(["check_in", ">=", date_from]);
      }
      if (date_to) {
        domain.push(["check_in", "<=", date_to]);
      }
      const REQUIRED_FIELDS = [
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
        "status_code"
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

      console.log("📤 Attendance records found:", attendances.length);

      return res.status(200).json({
        success: true,
        status: "success",
        successMessage: "Attendance records fetched successfully",
        statuscode: 200,
        data: attendances,
        meta: {
          total: totalCount.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          employee_name: employee[0].name,
          employee_id: employeeId,
        },
      });

    } catch (error) {
      console.error("🔥 Error fetching attendances:", error);
      return res.status(500).json({
        success: false,
        status: "error",
        errorMessage: error.message || "Failed to fetch attendances",
        successMessage: "",
        statuscode: 500,
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
    console.log("Called")
    try {
      const {
        name,
        latitude,
        longitude,
        radius_km,
        hr_employee_ids,
      } = req.body;
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
      const missingIds = hr_employee_ids.filter(
        (id) => !validIds.includes(id)
      );
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
        [
          "id",
          "name",
          "latitude",
          "longitude",
          "radius_km",
          "hr_employee_ids",
        ]
      );
      let allEmployeeIds = [];
      geoLocations.forEach(loc => {
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
        employees.forEach(emp => {
          employeeMap[emp.id] = emp.name;
        });
      }
      const finalData = geoLocations.map(loc => ({
        ...loc,
        employees: (loc.hr_employee_ids || []).map(empId => ({
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
      const {
        name,
        latitude,
        longitude,
        radius_km,
        hr_employee_ids,
      } = req.body;

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
        const missingIds = hr_employee_ids.filter((id) => !validIds.includes(id));

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
      console.log("API Called createAttendanceRegularization");
      const {
        employee_id,
        reg_reason,
        from_date,
        to_date,
        reg_category,
      } = req.body;

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

      // ✅ Use client_id instead of parent_id
      const existing = await odooService.searchRead(
        "attendance.regular",
        [
          ["employee_id", "=", employee_id],
          ["from_date", "=", from_date],
          ["to_date", "=", to_date],
          ["client_id", "=", client_id]
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
        state_select: "requested",
        client_id: client_id,
      };

      console.log("Attendance Regularization Payload:", vals);

      const regId = await odooService.create("attendance.regular", vals);

      return res.status(200).json({
        status: "success",
        message: "Attendance regularization request created successfully",
        regId,
      });
    } catch (error) {
      console.error("Attendance Regularization Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create attendance regularization request",
      });
    }
  }
  async getAttendanceRegularization(req, res) {
    try {
      console.log("API Called: getAttendanceRegularization");

      // Extract client_id safely
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

      // Fetch attendance regularization records for this client
      const records = await odooService.searchRead(
        "attendance.regular",
        [["client_id", "=", client_id]], // Fixed field here
        [
          "id",
          "employee_id",
          "reg_reason",
          "from_date",
          "to_date",
          "reg_category",
          "state_select",
        ]
      );

      return res.status(200).json({
        status: "success",
        data: records,
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

      const categories = await odooService.searchRead(
        "reg.categories",
        [["client_id", "=", client_id]],
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
          ["client_id", "=", client_id]
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
          ["client_id", "=", client_id]
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
      const success = await odooService.unlink(
        "reg.categories",
        [parseInt(id)]
      );

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

  //     if (!partner.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Partner not found for user_id: ${user_id}`,
  //       });
  //     }

  //     const partnerId = partner[0].partner_id?.[0];

  //     const adminEmployee = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", partnerId]],
  //       ["id", "address_id"]
  //     );

  //     if (!adminEmployee.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Employee not found for partner ${partnerId}`,
  //       });
  //     }

  //     const client_id = adminEmployee[0].address_id?.[0];
  //     console.log(client_id, "✔ client_id");

  //     const totalEmployees = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_number_of_employee",
  //       [[], client_id]
  //     );

  //     const Presentemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_present_employee",
  //       [client_id]
  //     );

  //     const TotalLateemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_late_employee",
  //       [client_id]
  //     );

  //     const Ununiformendemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_uninformed_employee",
  //       [client_id]
  //     );

  //     const TodayAbsetEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_employees_no_attendance_today",
  //       [client_id]
  //     );

  //     const ApprovedLeaveOfEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_permited_employee",
  //       [client_id]
  //     );
  //     console.log("Employee Who took Permision : ", ApprovedLeaveOfEmployee)

  //     const allEmployees = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", client_id]],
  //       ["id", "name", "job_id"]
  //     );

  //     if (!allEmployees.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: "No employees found for this client_id",
  //       });
  //     }
  //     const employeeMap = {};
  //     allEmployees.forEach(emp => {
  //       employeeMap[emp.id] = {
  //         job_id: emp.job_id || null,
  //         job_name: emp.job_id ? emp.job_id[1] : null,
  //       };
  //     });

  //     const employeeIds = allEmployees.map(e => e.id);
  //     let domain = [["employee_id", "in", employeeIds]];
  //     if (date_from) domain.push(["check_in", ">=", date_from]);
  //     if (date_to) domain.push(["check_in", "<=", date_to]);

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
  //     const attendances = await odooService.searchRead(
  //       "hr.attendance",
  //       domain,
  //       FIELDS,
  //       parseInt(offset),
  //       parseInt(limit),
  //       "check_in desc"
  //     );

  //     const attendanceMap = {};
  //     attendances.forEach(a => {
  //       const empId = a.employee_id?.[0];
  //       attendanceMap[empId] = a;
  //     });

  //     const finalData = allEmployees.map(emp => {
  //       const att = attendanceMap[emp.id];

  //       return {
  //         id: att?.id || null,
  //         employee_id: [emp.id, emp.name],

  //         check_in: att?.check_in || null,
  //         checkin_lat: att?.checkin_lat || null,
  //         checkin_lon: att?.checkin_lon || null,

  //         check_out: att?.check_out || null,
  //         checkout_lat: att?.checkout_lat || null,
  //         checkout_lon: att?.checkout_lon || null,

  //         worked_hours: att?.worked_hours || null,
  //         early_out_minutes: att?.early_out_minutes || null,
  //         overtime_hours: att?.overtime_hours || null,
  //         validated_overtime_hours: att?.validated_overtime_hours || null,

  //         is_late_in: att?.is_late_in || null,
  //         late_time_display: att?.late_time_display || null,
  //         is_early_out: att?.is_early_out || null,
  //         status_code: att?.status_code || null,

  //         job_id: emp.job_id || null,
  //         job_name: emp.job_id ? emp.job_id[1] : null,
  //       };
  //     });
  //     return res.status(200).json({
  //       success: true,
  //       status: "success",
  //       successMessage: "Admin attendance records fetched",
  //       data: finalData,
  //       meta: {
  //         total: finalData.length,
  //         limit: parseInt(limit),
  //         offset: parseInt(offset),
  //         admin_partner_id: partnerId,
  //         admin_address_id: client_id,
  //         TotalEmployee: totalEmployees,
  //         Presentemployee: Presentemployee,
  //         TotalLateemployee: TotalLateemployee,
  //         Ununiformendemployee: Ununiformendemployee,
  //         TodayAbsetEmployee: TodayAbsetEmployee,
  //         ApprovedLeaveOfEmployee: ApprovedLeaveOfEmployee
  //       },
  //     });

  //   } catch (error) {
  //     console.error("🔥 Admin Attendance Error:", error);
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

    if (!user_id) {
      return res.status(400).json({
        success: false,
        status: "error",
        errorMessage: "user_id is required",
      });
    }

    console.log("🔍 Admin Attendance Fetch - user_id:", user_id);

    const partner = await odooService.searchRead(
      "res.users",
      [["id", "=", parseInt(user_id)]],
      ["id", "partner_id"]
    );

    if (!partner.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: `Partner not found for user_id: ${user_id}`,
      });
    }

    const partnerId = partner[0].partner_id?.[0];

    const adminEmployee = await odooService.searchRead(
      "hr.employee",
      [["address_id", "=", partnerId]],
      ["id", "address_id"]
    );

    if (!adminEmployee.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: `Employee not found for partner ${partnerId}`,
      });
    }

    const client_id = adminEmployee[0].address_id?.[0];
    console.log(client_id, "✔ client_id");

    // ---- custom stats calls (untouched) ----
    const totalEmployees = await odooService.callCustomMethod(
      "simple.action",
      "get_total_number_of_employee",
      [[], client_id]
    );

    const Presentemployee = await odooService.callCustomMethod(
      "simple.action",
      "get_total_present_employee",
      [client_id]
    );

    const TotalLateemployee = await odooService.callCustomMethod(
      "simple.action",
      "get_total_no_of_late_employee",
      [client_id]
    );

    const Ununiformendemployee = await odooService.callCustomMethod(
      "simple.action",
      "get_total_no_of_uninformed_employee",
      [client_id]
    );

    const TodayAbsetEmployee = await odooService.callCustomMethod(
      "simple.action",
      "get_employees_no_attendance_today",
      [client_id]
    );

    const ApprovedLeaveOfEmployee = await odooService.callCustomMethod(
      "simple.action",
      "get_total_no_of_permited_employee",
      [client_id]
    );
    console.log("Employee Who took Permision : ", ApprovedLeaveOfEmployee);

    // ---- employees fetch ----
    const allEmployees = await odooService.searchRead(
      "hr.employee",
      [["address_id", "=", client_id]],
      ["id", "name", "job_id"]
    );

    if (!allEmployees.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: "No employees found for this client_id",
      });
    }

    const employeeIds = allEmployees.map(e => e.id);

    let domain = [["employee_id", "in", employeeIds]];
    if (date_from) domain.push(["check_in", ">=", date_from]);
    if (date_to) domain.push(["check_in", "<=", date_to]);

    // ---- attendance fields ----
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

    // ---- fetch hr.attendance ----
    const attendances = await odooService.searchRead(
      "hr.attendance",
      domain,
      FIELDS,
      parseInt(offset),
      parseInt(limit),
      "check_in desc"
    );

    const attendanceMap = {};
    attendances.forEach(a => {
      const empId = a.employee_id?.[0];
      attendanceMap[empId] = a;
    });

    // --------------------------------------------------------------------
    // 🔥 NEW CODE: Fetch hr.attendance.line for break_start, break_end, break_hours
    // --------------------------------------------------------------------
    const attendanceIds = attendances.map(a => a.id);

    let breakLines = [];
    if (attendanceIds.length > 0) {
      breakLines = await odooService.searchRead(
        "hr.attendance.line",
        [["attendance_id", "in", attendanceIds]],
        ["attendance_id", "break_start", "break_end", "break_hours"]
      );
    }

    // map attendance_id → break line
    const breakMap = {};
    breakLines.forEach(line => {
      const attId = line.attendance_id?.[0];
      breakMap[attId] = line;
    });
    // --------------------------------------------------------------------

    const finalData = allEmployees.map(emp => {
      const att = attendanceMap[emp.id];
      const breakLine = att ? breakMap[att.id] : null;

      return {
        id: att?.id || null,
        employee_id: [emp.id, emp.name],

        check_in: att?.check_in || null,
        checkin_lat: att?.checkin_lat || null,
        checkin_lon: att?.checkin_lon || null,

        check_out: att?.check_out || null,
        checkout_lat: att?.checkout_lat || null,
        checkout_lon: att?.checkout_lon || null,

        worked_hours: att?.worked_hours || null,
        early_out_minutes: att?.early_out_minutes || null,
        overtime_hours: att?.overtime_hours || null,
        validated_overtime_hours: att?.validated_overtime_hours || null,

        is_late_in: att?.is_late_in || null,
        late_time_display: att?.late_time_display || null,
        is_early_out: att?.is_early_out || null,
        status_code: att?.status_code || null,

        // 🔥 break fields added correctly
        break_start: breakLine?.break_start || null,
        break_end: breakLine?.break_end || null,
        break_hours: breakLine?.break_hours || null,

        job_id: emp.job_id || null,
        job_name: emp.job_id ? emp.job_id[1] : null,
      };
    });

    return res.status(200).json({
      success: true,
      status: "success",
      successMessage: "Admin attendance records fetched",
      data: finalData,
      meta: {
        total: finalData.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        admin_partner_id: partnerId,
        admin_address_id: client_id,
        TotalEmployee: totalEmployees,
        Presentemployee: Presentemployee,
        TotalLateemployee: TotalLateemployee,
        Ununiformendemployee: Ununiformendemployee,
        TodayAbsetEmployee: TodayAbsetEmployee,
        ApprovedLeaveOfEmployee: ApprovedLeaveOfEmployee
      },
    });

  } catch (error) {
    console.error("🔥 Admin Attendance Error:", error);
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
      console.log("Payload from Frontend :", req.body)
      const toOdooUTC = dt =>
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
    const groups = await odooService.searchRead(
      "res.groups",
      [],
      ["id", "name"]
    );

    const data = groups.map(g => ({
      group_id: g.id,
      group_name: g.name
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
    const { group_id, group_name } = req.query;

    if (!group_id && !group_name) {
      return res.status(400).json({
        status: "error",
        message: "group_id or group_name is required",
      });
    }
    const domain = group_id
      ? [["id", "=", Number(group_id)]]
      : [["name", "=", group_name]];

    const groups = await odooService.searchRead(
      "res.groups",
      domain,
      ["id", "name", "users"]
    );

    if (groups.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Group not found",
      });
    }

    const group = groups[0];

    let userDetails = [];

    if (group.users && group.users.length > 0) {
      const users = await odooService.searchRead(
        "res.users",
        [["id", "in", group.users]],
        ["id", "name", "login"]
      );

      userDetails = users.map(u => ({
        user_id: u.id,
        name: u.name,
        login: u.login
      }));
    }

    return res.status(200).json({
      status: "success",
      message: "Group users fetched",
      data: {
        group_id: group.id,
        group_name: group.name,
        users: userDetails
      },
    });

  } catch (error) {
    console.error("❌ Get Group Users Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
}

}

module.exports = new ApiController();
