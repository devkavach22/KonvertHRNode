const odooService = require("../services/odoo.service");
const { getClientFromRequest } = require("../services/plan.helper");
class BankController {
  async createBank(req, res) {
    console.log("Bank API Called.Created One ....")
    try {
      const {
        name,
        bic,
        swift_code,
        micr_code,
        phone,
        street,
        street2,
        city,
        state,
        zip,
        country,
        email
      } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Bank name is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      const existing = await odooService.searchRead(
        "res.bank",
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
          message: `Bank with name '${name}' already exists for this client`,
        });
      }

      const data = {
        name: name.trim(),
        bic: bic || "",
        swift_code: swift_code || "",
        micr_code: micr_code || "",
        phone: phone || "",
        street: street || "",
        street2: street2 || "",
        city: city || "",
        state: state || null,
        zip: zip || "",
        country: country || null,
        client_id,
        email,
      };

      const id = await odooService.create("res.bank", data);
      console.log("My Payload", data)
      return res.status(201).json({
        status: "success",
        message: "Bank created successfully",
        bank: { id, ...data },
      });
    } catch (error) {
      console.error("Create Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create bank",
      });
    }
  }
  async getAllBanks(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const banks = await odooService.searchRead(
        "res.bank",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "bic",
          "swift_code",
          "micr_code",
          "phone",
          "email",
          "street",
          "street2",
          "city",
          "state",
          "zip",
          "country"
        ]
      );

      return res.status(200).json({
        status: "success",
        banks,
      });
    } catch (error) {
      console.error("Get Banks Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch banks",
      });
    }
  }
  async updateBank(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        bic,
        swift_code,
        micr_code,
        phone,
        street,
        street2,      // Added
        city,         // Added
        state,        // Added
        zip,          // Added
        country,      // Added
        email         // Added
      } = req.body;

      const { client_id } = await getClientFromRequest(req);

      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Bank name is required",
        });
      }

      const existingBank = await odooService.searchRead(
        "res.bank",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );

      if (!existingBank.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank not found or does not belong to your client",
        });
      }

      const duplicate = await odooService.searchRead(
        "res.bank",
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
          message: `Bank with name '${name}' already exists for this client`,
        });
      }

      const data = {
        name: name.trim(),
        bic: bic || "",
        swift_code: swift_code || "",
        micr_code: micr_code || "",
        phone: phone || "",
        street: street || "",
        street2: street2 || "",        // Added
        city: city || "",              // Added
        state: state || null,          // Added
        zip: zip || "",                // Added
        country: country || null,      // Added
        email: email || "",            // Added
      };

      await odooService.write("res.bank", [parseInt(id)], data);

      return res.status(200).json({
        status: "success",
        message: "Bank updated successfully",
      });
    } catch (error) {
      console.error("Update Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update bank",
      });
    }
  }
  async deleteBank(req, res) {
    try {
      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);
      const existingBank = await odooService.searchRead(
        "res.bank",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );
      if (!existingBank.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank not found or does not belong to your client",
        });
      }
      await odooService.unlink("res.bank", [parseInt(id)]);
      return res.status(200).json({
        status: "success",
        message: "Bank deleted successfully",
      });
    } catch (error) {
      console.error("Delete Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete bank",
      });
    }
  }
  async createBankAccount(req, res) {
    try {
      const {
        bank_id: input_bank_id,
        bank_name,
        partner_name,
        acc_number,
        bank_swift_code,
        bank_iafc_code,
        currency,
      } = req.body;

      if (!acc_number) {
        return res.status(400).json({
          status: "error",
          message: "acc_number is required",
        });
      }

      const { client_id } = await getClientFromRequest(req);

      // 1. Check for Archived or Active duplicates
      const existingAccounts = await odooService.searchRead(
        "res.partner.bank",
        [["acc_number", "=", acc_number.trim()], ["active", "in", [true, false]]],
        ["id", "active"],
        1
      );

      if (existingAccounts.length) {
        const isArchived = !existingAccounts[0].active;
        // ✅ Status changed to 409 (Conflict)
        return res.status(409).json({
          status: "error",
          message: isArchived
            ? `Bank account '${acc_number}' is archived. Please unarchive it.`
            : `Bank account '${acc_number}' already exists.`
        });
      }

      // ... [Bank, Partner, and Currency Resolution logic remains same] ...
      let final_bank_id = input_bank_id ? parseInt(input_bank_id) : false;
      if (!final_bank_id && bank_name) {
        const bankRecords = await odooService.searchRead("res.bank", [["name", "=", bank_name.trim()], ["client_id", "=", client_id]], ["id"], 1);
        if (bankRecords.length) final_bank_id = bankRecords[0].id;
      }

      let final_partner_id = parseInt(client_id);
      if (partner_name) {
        const partnerRecords = await odooService.searchRead("res.partner", [["name", "=", partner_name.trim()]], ["id"], 1);
        if (partnerRecords.length) final_partner_id = partnerRecords[0].id;
      }

      let final_currency_id = false;
      if (currency) {
        const currencyRecords = await odooService.searchRead("res.currency", [["name", "=", currency.toUpperCase()]], ["id"], 1);
        if (currencyRecords.length) final_currency_id = currencyRecords[0].id;
      }

      const data = {
        bank_id: final_bank_id,
        partner_id: final_partner_id,
        acc_number: acc_number.trim(),
        bank_swift_code: bank_swift_code || "",
        bank_iafc_code: bank_iafc_code || "",
        currency_id: final_currency_id,
        client_id: parseInt(client_id),
        allow_out_payment: true,
      };

      const id = await odooService.create("res.partner.bank", data);

      return res.status(201).json({
        status: "success",
        message: "Bank account created successfully",
        bank_account: { id, ...data },
      });

    } catch (error) {
      const errorStr = error.message || error.faultString || "";

      // ✅ Catch block also updated to return 409 for duplicate/archived errors
      if (errorStr.includes("already exists") || errorStr.includes("archived")) {
        return res.status(409).json({
          status: "error",
          message: errorStr.replace("XML-RPC fault: ", "")
        });
      }

      return res.status(500).json({
        status: "error",
        message: errorStr || "Internal Server Error"
      });
    }
  }

  async getAllBankAccounts(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);

      const bankAccounts = await odooService.searchRead(
        "res.partner.bank",
        [["client_id", "=", client_id]],
        [
          "id",
          "partner_id",
          "acc_number",
          "bank_id",
          "bank_swift_code",
          "bank_iafc_code",
          "currency_id",
          // "allow_out_payment" ko yahan se hata diya gaya hai
        ]
      );

      // Data ko format karna taaki Many2One arrays [id, name] simple objects ban jayein
      const formattedData = bankAccounts.map(account => {
        return {
          id: account.id,
          acc_number: account.acc_number || "",
          bank_swift_code: account.bank_swift_code || "",
          bank_iafc_code: account.bank_iafc_code || "",
          // IDs aur Names ko alag alag extract karna
          bank_id: account.bank_id ? account.bank_id[0] : false,
          bank_name: account.bank_id ? account.bank_id[1] : "",
          partner_id: account.partner_id ? account.partner_id[0] : false,
          partner_name: account.partner_id ? account.partner_id[1] : "",
          currency_id: account.currency_id ? account.currency_id[0] : false,
          currency_name: account.currency_id ? account.currency_id[1] : ""
        };
      });

      return res.status(200).json({
        status: "success",
        count: formattedData.length,
        bank_accounts: formattedData,
      });
    } catch (error) {
      console.error("Get Bank Accounts Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch bank accounts",
      });
    }
  }
  async updateBankAccount(req, res) {
    try {
      const { id } = req.params;
      const {
        bank_id: direct_bank_id, // Extract direct bank_id from body
        bank_name,
        partner_name,
        acc_number,
        bank_swift_code,
        bank_iafc_code,
        currency,
        allow_out_payment,
      } = req.body;

      const { client_id } = await getClientFromRequest(req);

      if (!id) {
        return res.status(400).json({
          status: "error",
          message: "Bank account ID is required",
        });
      }

      // 1. Check if the bank account exists
      const existingBankAccount = await odooService.searchRead(
        "res.partner.bank",
        [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
        ["id", "acc_number"]
      );

      if (!existingBankAccount.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank account not found or does not belong to your client",
        });
      }

      // 2. Check for duplicate account number (if being changed)
      if (acc_number) {
        const duplicate = await odooService.searchRead(
          "res.partner.bank",
          [
            ["acc_number", "=", acc_number.trim()],
            ["client_id", "=", client_id],
            ["id", "!=", parseInt(id)],
          ],
          ["id"],
          1
        );

        if (duplicate.length) {
          return res.status(409).json({
            status: "error",
            message: `Bank account with number '${acc_number}' already exists`,
          });
        }
      }

      // 3. Logic for Bank ID (Direct ID or search by Name)
      let bank_id_to_update = false;
      if (direct_bank_id) {
        bank_id_to_update = parseInt(direct_bank_id);
      } else if (bank_name) {
        const bankRecords = await odooService.searchRead(
          "res.bank",
          [["name", "=", bank_name.trim()], ["client_id", "=", client_id]],
          ["id"],
          1
        );

        if (!bankRecords.length) {
          return res.status(404).json({
            status: "error",
            message: `Bank '${bank_name}' not found for your client`,
          });
        }
        bank_id_to_update = bankRecords[0].id;
      }

      // 4. Logic for Partner Name
      let partner_id_to_update = false;
      if (partner_name) {
        const partnerRecords = await odooService.searchRead(
          "res.partner",
          [["name", "=", partner_name.trim()]],
          ["id"],
          1
        );

        if (!partnerRecords.length) {
          return res.status(404).json({
            status: "error",
            message: `Partner '${partner_name}' not found`,
          });
        }
        partner_id_to_update = partnerRecords[0].id;
      }

      // 5. Logic for Currency
      let currency_id_to_update = false;
      if (currency) {
        const allowedCurrencies = ["USD", "INR"];
        if (!allowedCurrencies.includes(currency.toUpperCase())) {
          return res.status(400).json({
            status: "error",
            message: `Currency must be one of: ${allowedCurrencies.join(", ")}`,
          });
        }

        const currencyRecords = await odooService.searchRead(
          "res.currency",
          [["name", "=", currency.toUpperCase()]],
          ["id"],
          1
        );

        if (!currencyRecords.length) {
          return res.status(404).json({
            status: "error",
            message: `Currency '${currency}' not found`,
          });
        }
        currency_id_to_update = currencyRecords[0].id;
      }

      // 6. Construct Update Data
      const data = {
        ...(bank_id_to_update && { bank_id: bank_id_to_update }),
        ...(partner_id_to_update && { partner_id: partner_id_to_update }),
        ...(acc_number && { acc_number: acc_number.trim() }),
        ...(bank_swift_code && { bank_swift_code }),
        ...(bank_iafc_code && { bank_iafc_code }),
        ...(currency_id_to_update && { currency_id: currency_id_to_update }),
        ...(allow_out_payment !== undefined && { allow_out_payment: !!allow_out_payment }),
      };

      // 7. Perform Update
      await odooService.write("res.partner.bank", [parseInt(id)], data);

      return res.status(200).json({
        status: "success",
        message: "Bank account updated successfully",
        updated_fields: data,
      });
    } catch (error) {
      console.error("Update Bank Account Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update bank account",
      });
    }
  }
  async deleteBankAccount(req, res) {
    try {
      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);
      const existingBankAccount = await odooService.searchRead(
        "res.partner.bank",
        [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
        ["id"]
      );

      if (!existingBankAccount.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank account not found or does not belong to your client",
        });
      }

      await odooService.unlink("res.partner.bank", [parseInt(id)]);

      return res.status(200).json({
        status: "success",
        message: "Bank account deleted successfully",
      });
    } catch (error) {
      console.error("Delete Bank Account Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete bank account",
      });
    }
  }
}
module.exports = new BankController();
