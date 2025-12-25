const odooService = require("../services/odoo.service");

class ContactController {
  gstOptions = [
    { value: "regular", label: "Registered Business - Regular" },
    { value: "composition", label: "Registered Business - Composition" },
    { value: "unregistered", label: "Unregistered Business" },
    { value: "consumer", label: "Consumer" },
    { value: "overseas", label: "Overseas" },
    { value: "special_economic_zone", label: "Special Economic Zone" },
    { value: "deemed_export", label: "Deemed Export" },
    { value: "uin_holders", label: "UIN Holders" },
  ];

  languageOptions = [
    { value: "en_IN", label: "English (IN)" },
    { value: "en_US", label: "English (US)" },
    { value: "gu_IN", label: "Gujarati / ગુજરાતી" },
    { value: "hi_IN", label: "Hindi / हिंदी" },
  ];

  companyTypeOptions = [
    { value: "proprietary", label: "Proprietary" },
    { value: "partnership", label: "Partnership" },
    { value: "pvt_ltd", label: "Pvt. Ltd." },
    { value: "public_ltd", label: "Public Ltd." },
    { value: "llp", label: "LLP" },
    { value: "government_under_taking", label: "Govt. Undertaking" },
    { value: "other", label: "Other (specify)" },
  ];
  natureOfBusinessOptions = [
    { value: "manufacturer", label: "Manufacturer" },
    { value: "distributor", label: "Distributor" },
    { value: "trader", label: "Trader" },
    { value: "service_provider", label: "Service Provider" },
    { value: "contractor", label: "Contractor" },
    { value: "consultant", label: "Consultant" },
  ];
  isoCertificationOptions = [
    { value: "iso_9001", label: "ISO 9001" },
    { value: "iso_14001", label: "ISO 14001" },
    { value: "iso_45001", label: "ISO 45001" },
    { value: "OHSAS", label: "OHSAS" },
    { value: "other", label: "Other" },
  ];
  payment_term_options = [
    { value: "1", label: "Immediate Payment" },
    { value: "2", label: "15 Days" },
    { value: "3", label: "21 Days" },
    { value: "4", label: "30 Days" },
    { value: "5", label: "45 Days" },
    { value: "6", label: "End of Following Month" },
    { value: "7", label: "10 Days after End of Next Month" },
    { value: "8", label: "30% Now, Balance 60 Days" },
    { value: "9", label: "2/7 Net 30" },
    { value: "10", label: "90 days, on the 10th" },
    { value: "11", label: "30% Advance End of Following Month" },
  ];
  currencyOptions = [
    { value: 1, label: "INR" },
    { value: 2, label: "USD" },
  ];

  paymentMethodOptions = [
    { value: 10, label: "Manual Payment (Bank)" },
    { value: 11, label: "Manual Payment (Cash)" },
  ];

  eInvoiceFormatOptions = [
    { value: "facturx", label: "France (FacturX)" },
    { value: "ubl_bis3", label: "EU Standard (Peppol Bis 3.0)" },
    { value: "xrechnung", label: "Germany (XRechnung)" },
    { value: "nlcius", label: "Netherlands (NLCIUS)" },
    { value: "ubl_a_nz", label: "Australia BIS Billing 3.0 A-NZ" },
    { value: "ubl_sg", label: "Singapore BIS Billing 3.0 SG" },
  ];

  invoiceSendingOptions = [
    { value: "manual", label: "Download" },
    { value: "email", label: "By Email" },
    { value: "snailmail", label: "By Post" },
  ];
  async getFormOptions(req, res) {
    return res.status(200).json({
      status: "success",
      gst_options: this.gstOptions,
      language_options: this.languageOptions,
      company_type_options: this.companyTypeOptions,
      nature_of_business_options: this.natureOfBusinessOptions,
      payment_term_options: this.payment_term_options,
      currency_options: this.currencyOptions,
      payment_method_options: this.paymentMethodOptions,
      eInvoice_format_options: this.eInvoiceFormatOptions,
      invoice_sending_options: this.invoiceSendingOptions,
    });
  }
async createContact(req, res) {
  try {
    let { parent_company, company_id } = req.body; // Fixed typo

    // Auto-assign company if not provided
    if (!parent_company && !company_id && req.userId) {
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

      company_id = userRecord[0].company_id[0]; // Fixed: assign to company_id
    }

    // If parent_company is provided, use it as company_id
    if (parent_company && !company_id) {
      company_id = parent_company;
    }

    const {
      name,
      email,
      mobile,
      phone,
      phone_res,
      website,
      function: job_position,
      l10n_in_pan,
      l10n_in_gst_treatment,
      vat,
      cin_no,
      pf_no,
      type_of_company,
      lang,
      street,
      city,
      state_id,
      country_id,
      zip,
      street2,
      title_id,
      category_ids,
      vendor_performance,
      comm_street,
      comment,
      year_of_establishment,
      nature_of_bussiness,
      no_of_permenent_employee,
      no_of_contract_employee,
      year1,
      year2,
      year3,
      amount1,
      amount2,
      amount3,
      major_project_executed,
      product_or_services_offered,
      major_customer,
      ssi_msme_udyam_reg_no,
      esi_no,
      professional_tax_no,
      tan_no,
      shops_and_estblishment_no,
      labour_lic_no,
      past_blck_listing_by_gov,
      past_blck_listing_by_gov_reason,
      iso_cretification,
      other_cretification,
      hse_policy,
      csr_sustainbility,
      bussiness_ref_ids,
      property_supplier_payment_term_id,
      buyer_id,
      receipt_reminder_email,
      property_purchase_currency_id,
      property_outbound_payment_method_line_id,
      user_id,
      property_payment_term_id,
      property_inbound_payment_method_line_id,
      ref,
      company_registry,
      barcode,
      property_account_position_id,
      invoice_edi_format,
      invoice_sending_method,
      bank_accounts,
      other_licenses,
      image_1920,
      type,
    } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Official Email Address is required",
      });
    }

    const partnerData = {
      name,
      email,
      mobile,
      phone,
      phone_res,
      website,
      function: job_position,
      l10n_in_pan,
      l10n_in_gst_treatment,
      vat,
      cin_no,
      pf_no,
      type_of_company,
      lang,
      street,
      street2,
      city,
      zip,
      state_id: state_id ? parseInt(state_id) : false,
      country_id: country_id ? parseInt(country_id) : false,
      is_company: false,
      title: title_id ? parseInt(title_id) : false,
      company_id: company_id ? parseInt(company_id) : false, // Fixed: use company_id instead of parent_compnay
      category_id:
        category_ids && category_ids.length > 0
          ? [[6, 0, category_ids.map((id) => parseInt(id))]]
          : [],
      vendor_performance: vendor_performance
        ? {
            low: "0",
            medium: "1",
            high: "2",
            "very high": "3",
          }[vendor_performance.toLowerCase()] ?? null
        : null,
      comm_street,
      year_of_establishment,
      nature_of_bussiness,
      no_of_permenent_employee: no_of_permenent_employee
        ? parseInt(no_of_permenent_employee)
        : 0,
      no_of_contract_employee: no_of_contract_employee
        ? parseInt(no_of_contract_employee)
        : 0,
      year1,
      year2,
      year3,
      amount1: amount1 ? parseFloat(amount1) : 0,
      amount2: amount2 ? parseFloat(amount2) : 0,
      amount3: amount3 ? parseFloat(amount3) : 0,
      major_project_executed,
      product_or_services_offered,
      major_customer,
      ssi_msme_udyam_reg_no,
      esi_no,
      professional_tax_no,
      tan_no,
      shops_and_estblishment_no,
      labour_lic_no,
      past_blck_listing_by_gov: past_blck_listing_by_gov ?? false,
      past_blck_listing_by_gov_reason: past_blck_listing_by_gov
        ? past_blck_listing_by_gov_reason
        : "",
      iso_cretification,
      other_cretification:
        iso_cretification === "other" ? other_cretification : "",
      hse_policy: hse_policy ?? false,
      csr_sustainbility: csr_sustainbility ?? false,
      buyer_id: buyer_id ? parseInt(buyer_id) : false,
      receipt_reminder_email: receipt_reminder_email ?? false,
      property_purchase_currency_id: property_purchase_currency_id
        ? parseInt(property_purchase_currency_id)
        : false,
      property_outbound_payment_method_line_id: property_outbound_payment_method_line_id
        ? parseInt(property_outbound_payment_method_line_id)
        : false,
      user_id: user_id ? parseInt(user_id) : false,
      property_payment_term_id: property_payment_term_id
        ? parseInt(property_payment_term_id)
        : false,
      property_inbound_payment_method_line_id: property_inbound_payment_method_line_id
        ? parseInt(property_inbound_payment_method_line_id)
        : false,
      ref,
      company_registry,
      barcode,
      property_account_position_id: property_account_position_id
        ? parseInt(property_account_position_id)
        : false,
      invoice_edi_format: invoice_edi_format || false,
      invoice_sending_method: invoice_sending_method || false,
      comment,
      other_licenses,
    };

    if (req.files?.image_1920) {
      partnerData.image_1920 = req.files.image_1920[0].buffer.toString("base64");
    } else if (image_1920) {
      partnerData.image_1920 = image_1920;
    }

    const partnerId = await odooService.create("res.partner", partnerData);

    // Business references
    if (bussiness_ref_ids && bussiness_ref_ids.length > 0) {
      for (const ref of bussiness_ref_ids) {
        await odooService.create("bussiness.ref", {
          company_name: ref.company_name,
          phone: ref.phone,
          contact_person: ref.contact_person,
          email: ref.email,
          partner_id: partnerId,
        });
      }
    }

    // Child contact
    if (type === "contact") {
      const childPartnerData = {
        parent_id: partnerId,
        name,
        email,
        mobile,
        phone,
        phone_res,
        website,
        type: "contact",
        street,
        street2,
        city,
        zip,
        state_id: state_id ? parseInt(state_id) : false,
        country_id: country_id ? parseInt(country_id) : false,
        company_id: company_id ? parseInt(company_id) : false, // Also assign company to child
      };
      await odooService.create("res.partner", childPartnerData);
    }

    // Bank accounts
    if (bank_accounts && bank_accounts.length > 0) {
      for (const account of bank_accounts) {
        const existing = await odooService.searchRead(
          "res.partner.bank",
          [["acc_number", "=", account.acc_number]],
          ["id"]
        );
        if (existing.length > 0) continue;

        let bankId = account.bank_id;
        if (!bankId && account.bank_name) {
          const banks = await odooService.searchRead(
            "res.bank",
            [["name", "=", account.bank_name]],
            ["id"]
          );
          if (banks.length > 0) {
            bankId = banks[0].id;
          } else {
            bankId = await odooService.create("res.bank", { name: account.bank_name });
          }
        }

        await odooService.create("res.partner.bank", {
          partner_id: partnerId,
          bank_id: bankId ? parseInt(bankId) : false,
          acc_number: account.acc_number,
          allow_out_payment: account.allow_out_payment ?? false,
        });
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Contact created successfully",
      id: partnerId,
    });
  } catch (error) {
    console.error("Create Contact Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create contact",
      error: error.message,
    });
  }
}


  async updateContact(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Contact ID is required",
        });
      }

      let updateData = { ...req.body };
      if (req.files?.image_1920) {
        updateData.image_1920 =
          req.files.image_1920[0].buffer.toString("base64");
      }

      Object.keys(updateData).forEach((key) => {
        if (
          updateData[key] === "" ||
          updateData[key] === null ||
          updateData[key] === undefined
        ) {
          delete updateData[key];
        }
      });

      // Convert many2one IDs
      const intFields = [
        "state_id",
        "country_id",
        "title_id",
        "buyer_id",
        "property_payment_term_id",
        "property_account_position_id",
      ];

      intFields.forEach((field) => {
        if (updateData[field]) {
          updateData[field] = parseInt(updateData[field]);
        }
      });

      // Handle category_ids (many2many)
      if (updateData.category_ids && updateData.category_ids.length > 0) {
        updateData.category_id = [[6, 0, updateData.category_ids.map(Number)]];
        delete updateData.category_ids;
      }

      // Handle vendor performance mapping safely
      const performanceMap = {
        low: "0",
        medium: "1",
        high: "2",
        "very high": "3",
      };

      if (updateData.vendor_performance) {
        const val =
          performanceMap[updateData.vendor_performance.toLowerCase()] ?? null;

        updateData.vendor_performance = val;
      }

      // Prevent invalid GST treatment error
      if (updateData.l10n_in_gst_treatment) {
        const allowed = ["regular", "composition", "unregistered", "consumer"];

        if (!allowed.includes(updateData.l10n_in_gst_treatment)) {
          return res.status(400).json({
            status: "error",
            message: "Invalid GST Treatment option, choose from dropdown",
          });
        }
      }

      // Perform update
      await odooService.write("res.partner", [parseInt(id)], updateData);

      return res.status(200).json({
        status: "success",
        message: "Contact updated successfully",
      });
    } catch (error) {
      console.error("Update Contact Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update contact",
        error: error.message,
      });
    }
  }

  async getContactList(req, res) {
    try {
      const contacts = await odooService.searchRead(
        "res.partner",
        [["is_company", "=", false]],
        [
          "id",
          "name",
          "email",
          "mobile",
          "phone",
          "l10n_in_pan",
          "l10n_in_gst_treatment",
          "vat",
          "cin_no",
          "pf_no",
          "lang",
          "type_of_company",
          "website",
          "function",
        ]
      );

      return res.status(200).json({
        status: "success",
        data: contacts,
      });
    } catch (err) {
      return res.status(500).json({
        status: "error",
        message: "Unable to fetch contacts",
      });
    }
  }

  async getAllTitles(req, res) {
    try {
      const titles = await odooService.searchRead(
        "res.partner.title",
        [],
        ["id", "name", "shortcut"]
      );

      return res.status(200).json({
        status: "success",
        titles,
      });
    } catch (error) {
      console.error("Get Titles Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to fetch titles",
      });
    }
  }

  async createTitle(req, res) {
    try {
      const { name, shortcut } = req.body;

      if (!name)
        return res.status(400).json({
          status: "error",
          message: "Title name is required",
        });

      const data = { name, shortcut: shortcut || "" };

      const id = await odooService.create("res.partner.title", data);

      return res.status(200).json({
        status: "success",
        message: "Title created",
        title: { id, name, shortcut },
      });
    } catch (error) {
      console.error("Create Title Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to create title",
      });
    }
  }
  async getAllCategories(req, res) {
    try {
      const categories = await odooService.searchRead(
        "res.partner.category",
        [],
        ["id", "name", "parent_id", "color"]
      );

      return res.status(200).json({
        status: "success",
        categories,
      });
    } catch (error) {
      console.error("Get Categories Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to fetch categories",
      });
    }
  }
  
}

module.exports = new ContactController();
