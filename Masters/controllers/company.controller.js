const odooService = require("../services/odoo.service");
class CountryAPIController {
  validateGST(gst) {
    if (!gst) return true;
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  }
  validateEmail(email) {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  validateMobile(mobile) {
    if (!mobile) return true;
    const mobileRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return mobileRegex.test(mobile.replace(/[\s-]/g, ""));
  }
  validateWebsite(website) {
    if (!website) return true;
    try {
      new URL(website);
      return true;
    } catch (error) {
      return false;
    }
  }
  async getCurrencies(req, res) {
    try {
      const currencies = await odooService.searchRead(
        "res.currency",
        ["|", ["active", "=", true], ["active", "=", false]],
        ["id", "name", "symbol", "currency_unit_label"],
        0
      );

      return res.status(200).json({
        status: "success",
        data: currencies,
      });
    } catch (error) {
      console.error("Get Currencies Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch currencies",
      });
    }
  }

  // update company --
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      const {
        vat,
        name,
        logo,
        mobile,
        cin_number,
        street,
        email,
        website,
        currency,
      } = req.body;

      if (!id) {
        return res.status(200).json({
          status: "error",
          message: "Company ID is required",
        });
      }

      const existingCompany = await odooService.searchRead(
        "res.company",
        [["id", "=", parseInt(id)]],
        ["id", "name"],
        1
      );

      if (!existingCompany.length) {
        return res.status(404).json({
          status: "error",
          message: "Company not found",
        });
      }

      if (name && name !== existingCompany[0].name) {
        const duplicateName = await odooService.searchRead(
          "res.company",
          [
            ["name", "=", name],
            ["id", "!=", parseInt(id)],
          ],
          ["id"],
          1
        );

        if (duplicateName.length > 0) {
          return res.status(200).json({
            status: "error",
            message: `Company with name "${name}" already exists`,
          });
        }
      }

      let currency_id = undefined;
      if (currency) {
        const currencyRecord = await odooService.searchRead(
          "res.currency",
          [["name", "=", currency.toUpperCase()]],
          ["id"],
          1
        );
        if (!currencyRecord.length) {
          return res.status(200).json({
            status: "error",
            message: `Invalid currency: ${currency}`,
          });
        }
        currency_id = currencyRecord[0].id;
      }

      if (vat && !this.validateGST(vat)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid GST/VAT number",
        });
      }

      if (email && !this.validateEmail(email)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid email address",
        });
      }

      if (mobile && !this.validateMobile(mobile)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid mobile number",
        });
      }

      if (website && !this.validateWebsite(website)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid website URL",
        });
      }

      const updateVals = {};
      if (name !== undefined) updateVals.name = name;
      if (vat !== undefined) updateVals.vat = vat || false;
      if (logo !== undefined) updateVals.logo = logo || false;
      if (mobile !== undefined) updateVals.mobile = mobile || false;
      if (cin_number !== undefined) updateVals.cin_number = cin_number || false;
      if (street !== undefined) updateVals.street = street || false;
      if (email !== undefined) updateVals.email = email || false;
      if (website !== undefined) updateVals.website = website || false;
      if (currency_id !== undefined) updateVals.currency_id = currency_id;

      await odooService.write("res.company", parseInt(id), updateVals);

      console.log(`Company ID ${id} updated successfully`);

      return res.status(200).json({
        status: "success",
        message: "Company updated successfully",
        data: {
          companyId: parseInt(id),
          updatedFields: Object.keys(updateVals),
        },
      });
    } catch (error) {
      console.error("Update Company Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update company",
        error: error.message,
      });
    }
  }

  async getCompany(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(200).json({
          status: "error",
          message: "Company ID is required",
        });
      }

      const company = await odooService.searchRead(
        "res.company",
        [["id", "=", parseInt(id)]],
        [
          "id",
          "name",
          "vat",
          "mobile",
          "cin_number",
          "street",
          "email",
          "website",
          "currency_id",
          "parent_id",
          "child_ids",
          "partner_id",
        ],
        1
      );

      if (!company.length) {
        return res.status(404).json({
          status: "error",
          message: "Company not found",
        });
      }

      const companyData = company[0];

      let branches = [];
      if (companyData.child_ids && companyData.child_ids.length > 0) {
        branches = await odooService.searchRead(
          "res.company",
          [["id", "in", companyData.child_ids]],
          [
            "id",
            "name",
            "vat",
            "mobile",
            "cin_number",
            "street",
            "email",
            "website",
            "parent_id",
          ]
        );
      }

      return res.status(200).json({
        status: "success",
        message: "Company fetched successfully",
        data: {
          id: companyData.id,
          name: companyData.name,
          vat: companyData.vat || null,
          mobile: companyData.mobile || null,
          cin_number: companyData.cin_number || null,
          street: companyData.street || null,
          email: companyData.email || null,
          website: companyData.website || null,
          currency: companyData.currency_id ? companyData.currency_id[1] : null,
          parent_company: companyData.parent_id
            ? companyData.parent_id[1]
            : null,
          branches: branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            vat: branch.vat || null,
            mobile: branch.mobile || null,
            cin_number: branch.cin_number || null,
            street: branch.street || null,
            email: branch.email || null,
            website: branch.website || null,
          })),
        },
      });
    } catch (error) {
      console.error("Get Company Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch company",
        error: error.message,
      });
    }
  }
  async getAllCompanies(req, res) {
    try {
      const { parent_only } = req.query;
      let domain = [];
      if (parent_only === "true") {
        domain.push(["parent_id", "=", false]);
      }

      const companies = await odooService.searchRead("res.company", domain, [
        "id",
        "name",
        "vat",
        "mobile",
        "email",
        "parent_id",
        "child_ids",
      ]);

      return res.status(200).json({
        status: "success",
        message: "Companies fetched successfully",
        count: companies.length,
        data: companies.map((company) => ({
          id: company.id,
          name: company.name,
          vat: company.vat || null,
          mobile: company.mobile || null,
          email: company.email || null,
          parent_company: company.parent_id ? company.parent_id[1] : null,
          branches_count: company.child_ids ? company.child_ids.length : 0,
        })),
      });
    } catch (error) {
      console.error("Get All Companies Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch companies",
        error: error.message,
      });
    }
  }

  async archiveCompany(req, res) {
    try {
      const { id } = req.params;
      const { force } = req.query;

      if (!id) {
        return res.status(200).json({
          status: "error",
          message: "Company ID is required",
        });
      }

      const company = await odooService.searchRead(
        "res.company",
        [["id", "=", parseInt(id)]],
        ["id", "name", "child_ids"],
        1
      );

      if (!company.length) {
        return res.status(404).json({
          status: "error",
          message: "Company not found",
        });
      }

      const companyData = company[0];

      if (companyData.child_ids && companyData.child_ids.length > 0) {
        if (force !== "true") {
          return res.status(200).json({
            status: "error",
            message: `Company has ${companyData.child_ids.length} branch(es). Use force=true to archive company with all branches`,
            branchCount: companyData.child_ids.length,
          });
        }

        console.log(`Archiving ${companyData.child_ids.length} branches...`);
        for (const branchId of companyData.child_ids) {
          try {
            await odooService.write("res.company", branchId, { active: false });
            console.log(`Branch ID ${branchId} archived`);
          } catch (branchError) {
            console.error(`Error archiving branch ${branchId}:`, branchError);
          }
        }
      }

      // Archive the company
      await odooService.write("res.company", parseInt(id), { active: false });
      console.log(`Company ID ${id} archived successfully`);

      return res.status(200).json({
        status: "success",
        message:
          companyData.child_ids && companyData.child_ids.length > 0
            ? "Company and its branches archived successfully"
            : "Company archived successfully",
        data: {
          companyId: parseInt(id),
          companyName: companyData.name,
          branchesArchived: companyData.child_ids
            ? companyData.child_ids.length
            : 0,
        },
      });
    } catch (error) {
      console.error("Archive Company Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to archive company",
        error: error.message,
      });
    }
  }

  async createCompany(req, res) {
    try {
      const loggedInUserId = req.userId;

      if (!loggedInUserId) {
        return res.status(401).json({
          status: "error",
          message: "User not authenticated. Please login first.",
        });
      }
      const {
        vat,
        name,
        logo,
        mobile,
        cin_number,
        street,
        email,
        website,
        currency,
        branches,
      } = req.body;

      if (!name) {
        return res.status(200).json({
          status: "error",
          message: "Company Name is required",
        });
      }
      const existingCompany = await odooService.searchRead(
        "res.company",
        [["name", "=", name]],
        ["id", "name"],
        1
      );

      if (existingCompany.length > 0) {
        return res.status(200).json({
          status: "error",
          message: `Company with name "${name}" already exists`,
          existingCompanyId: existingCompany[0].id,
          suggestion: "Please use a different company name",
        });
      }

      let currency_id = false;
      if (currency) {
        const currencyRecord = await odooService.searchRead(
          "res.currency",
          [["name", "=", currency.toUpperCase()]],
          ["id"],
          1
        );
        if (!currencyRecord.length) {
          return res.status(200).json({
            status: "error",
            message: `Invalid currency: ${currency}. Please use valid currency code like INR, USD, EUR`,
          });
        }
        currency_id = currencyRecord[0].id;
      }

      if (vat && !this.validateGST(vat)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid GST/VAT number. Format: 22AAAAA0000A1Z5",
        });
      }

      if (email && !this.validateEmail(email)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid email address",
        });
      }

      if (mobile && !this.validateMobile(mobile)) {
        return res.status(200).json({
          status: "error",
          message:
            "Invalid mobile number. Use format: +91XXXXXXXXXX or 10 digits starting with 6-9",
        });
      }

      if (website && !this.validateWebsite(website)) {
        return res.status(200).json({
          status: "error",
          message: "Invalid website URL. Include http:// or https://",
        });
      }

      if (branches && Array.isArray(branches)) {
        for (let i = 0; i < branches.length; i++) {
          const branch = branches[i];

          if (!branch.name) {
            return res.status(200).json({
              status: "error",
              message: `Branch at index ${i} is missing required field: name`,
            });
          }

          const existingBranch = await odooService.searchRead(
            "res.company",
            [["name", "=", branch.name]],
            ["id", "name"],
            1
          );

          if (existingBranch.length > 0) {
            return res.status(200).json({
              status: "error",
              message: `Branch with name "${branch.name}" already exists`,
              existingBranchId: existingBranch[0].id,
              suggestion: "Please use a different branch name",
            });
          }

          if (branch.email && !this.validateEmail(branch.email)) {
            return res.status(200).json({
              status: "error",
              message: `Invalid email for branch: ${branch.name}`,
            });
          }

          if (branch.mobile && !this.validateMobile(branch.mobile)) {
            return res.status(200).json({
              status: "error",
              message: `Invalid mobile for branch: ${branch.name}`,
            });
          }

          if (branch.vat && !this.validateGST(branch.vat)) {
            return res.status(200).json({
              status: "error",
              message: `Invalid GST/VAT for branch: ${branch.name}`,
            });
          }
        }
      }

      const companyVals = {
        name,
        vat: vat || false,
        logo: logo || false,
        mobile: mobile || false,
        cin_number: cin_number || false,
        street: street || false,
        email: email || false,
        website: website || false,
        currency_id: currency_id,
      };

      const companyId = await odooService.create("res.company", companyVals);
      console.log("✅ Parent company created with ID:", companyId);

      const createdBranches = [];
      const branchIds = [];

      if (branches && Array.isArray(branches) && branches.length > 0) {
        for (const branch of branches) {
          try {
            const branchVals = {
              name: branch.name,
              vat: branch.vat || false,
              logo: branch.logo || false,
              mobile: branch.mobile || false,
              cin_number: branch.cin_number || false,
              street: branch.street || false,
              email: branch.email || false,
              website: branch.website || false,
              currency_id: currency_id || false,
              parent_id: companyId,
            };

            const branchId = await odooService.create(
              "res.company",
              branchVals
            );
            console.log(
              `✅ Branch "${branch.name}" created with ID:`,
              branchId
            );

            createdBranches.push(branch.name);
            branchIds.push(branchId);
          } catch (branchError) {
            console.error(
              `❌ Error creating branch "${branch.name}":`,
              branchError
            );
          }
        }
      }

      console.log("✅ All branches created successfully");
      console.log("📋 Branch IDs:", branchIds);

      try {
        console.log("🔄 Assigning company to user...");

        const currentUser = await odooService.searchRead(
          "res.users",
          [["id", "=", loggedInUserId]],
          ["company_ids", "company_id"]
        );

        if (currentUser && currentUser.length > 0) {
          const existingCompanyIds = currentUser[0].company_ids || [];
          console.log("📊 User's existing companies:", existingCompanyIds);

          const allCompanyIds = [companyId, ...branchIds];
          console.log("📊 New companies to assign:", allCompanyIds);

          const updatedCompanyIds = [
            ...new Set([...existingCompanyIds, ...allCompanyIds]),
          ];
          console.log("📊 Updated company list:", updatedCompanyIds);

          await odooService.write("res.users", loggedInUserId, {
            company_ids: [[6, 0, updatedCompanyIds]],
            company_id: companyId,
          });

          console.log(
            `✅ User ${loggedInUserId} successfully assigned to company ${companyId}`
          );
        }
      } catch (assignError) {
        console.error("❌ Error assigning company to user:", assignError);
      }

      return res.status(201).json({
        status: "success",
        message:
          branches && branches.length > 0
            ? "Company and branches created successfully and assigned to user"
            : "Company created successfully and assigned to user",
        data: {
          companyId: companyId,
          companyName: name,
          branchesCreated: createdBranches.length,
          branchNames: createdBranches,
          branchIds: branchIds,
          assignedToUserId: loggedInUserId,
        },
      });
    } catch (error) {
      console.error("❌ Create Company Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create company",
        error: error.message,
      });
    }
  }
}

module.exports = new CountryAPIController();
