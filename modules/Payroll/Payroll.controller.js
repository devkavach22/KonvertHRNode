const odooService = require("../../Masters/services/odoo.service.js");
const {
    getClientFromRequest,
} = require("../../Masters/services/plan.helper.js");

class PayrollController {
    async createStructureType(req, res) {
        try {
            console.log("API Called createStructureType");
            const {
                name,
                default_schedule_pay,
                wage_type,
                country_id,
                default_work_entry_type_id,
                default_resource_calendar_id,
                default_struct_id,
            } = req.body;
            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Structure Type (name) is required",
                });
            }
            if (!wage_type) {
                return res.status(400).json({
                    status: "error",
                    message: "wage_type is required",
                });
            }

            if (!default_work_entry_type_id) {
                return res.status(400).json({
                    status: "error",
                    message: "default_work_entry_type_id is required",
                });
            }
            const existing = await odooService.searchRead(
                "hr.payroll.structure.type",
                [["name", "=", name]],
                ["id"],
                1
            );
            if (existing.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Structure Type '${name}' already exists`,
                });
            }
            const vals = {
                name,
                wage_type,
                default_schedule_pay: default_schedule_pay || false,
                country_id: country_id || false,
                default_work_entry_type_id,
                default_resource_calendar_id: default_resource_calendar_id || false,
                default_struct_id: default_struct_id || false,
            };
            const structTypeId = await odooService.create(
                "hr.payroll.structure.type",
                vals
            );
            return res.status(200).json({
                status: "success",
                message: "Payroll Structure Type created successfully",
                structTypeId,
            });
        } catch (error) {
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create payroll structure type",
            });
        }
    }
    async getStructureTypes(req, res) {
        try {
            console.log("API Called getStructureTypes");
            const count = await odooService.execute(
                "hr.payroll.structure.type",
                "search_count",
                [[]]
            );

            if (count === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: [],
                    message: "No structure types found"
                });
            }
            const ids = await odooService.execute(
                "hr.payroll.structure.type",
                "search",
                [[]],
                { limit: 1000 }
            );

            const fields = [
                "id",
                "name",
                "default_schedule_pay",
                "wage_type",
                "country_id",
                "default_work_entry_type_id",
                "default_resource_calendar_id",
                "default_struct_id",
            ];

            const records = await odooService.execute(
                "hr.payroll.structure.type",
                "read",
                [ids, fields]
            );


            return res.status(200).json({
                status: "success",
                count: records.length,
                data: records,
            });

        } catch (error) {
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to fetch payroll structure types",
            });
        }
    }
    async createSalaryRuleCategory(req, res) {
        try {
            console.log("API Called createSalaryRuleCategory");

            const {
                name,
                code,
                parent_id,
                note
            } = req.body;
            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Name is required",
                });
            }

            if (!code) {
                return res.status(400).json({
                    status: "error",
                    message: "Code is required",
                });
            }
            const existingCode = await odooService.searchRead(
                "hr.salary.rule.category",
                [["code", "=", code]],
                ["id"],
                1
            );

            if (existingCode.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Salary Rule Category with code '${code}' already exists`,
                });
            }
            const existingName = await odooService.searchRead(
                "hr.salary.rule.category",
                [["name", "=", name]],
                ["id"],
                1
            );

            if (existingName.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Salary Rule Category with name '${name}' already exists`,
                });
            }
            if (parent_id) {
                const parentExists = await odooService.searchRead(
                    "hr.salary.rule.category",
                    [["id", "=", parent_id]],
                    ["id"],
                    1
                );

                if (!parentExists.length) {
                    return res.status(404).json({
                        status: "error",
                        message: `Parent category with ID ${parent_id} not found`,
                    });
                }
            }
            const vals = {
                name,
                code,
                parent_id: parent_id || false,
                note: note || false,
            };
            const categoryId = await odooService.create(
                "hr.salary.rule.category",
                vals
            );
            const createdRecord = await odooService.searchRead(
                "hr.salary.rule.category",
                [["id", "=", categoryId]],
                ["id", "name", "code", "parent_id", "note"],
                1
            );
            return res.status(201).json({
                status: "success",
                message: "Salary Rule Category created successfully",
                data: createdRecord[0] || { id: categoryId },
            });

        } catch (error) {
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create salary rule category",
            });
        }
    }
    async getSalaryRuleCategories(req, res) {
        try {
            console.log("API Called getSalaryRuleCategories");
            const count = await odooService.execute(
                "hr.salary.rule.category",
                "search_count",
                [[]]
            );
            if (count === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: [],
                    message: "No salary rule categories found"
                });
            }
            const ids = await odooService.execute(
                "hr.salary.rule.category",
                "search",
                [[]],
                { limit: 1000 }
            );

            if (!ids || ids.length === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: [],
                    message: "No accessible salary rule categories"
                });
            }

            try {
                const minimalRecords = await odooService.execute(
                    "hr.salary.rule.category",
                    "read",
                    [ids, ["id", "name", "code"]]
                );
                const records = await odooService.execute(
                    "hr.salary.rule.category",
                    "read",
                    [ids, ["id", "name", "code", "parent_id", "note"]]
                );

                return res.status(200).json({
                    status: "success",
                    count: records.length,
                    data: records,
                });

            } catch (readError) {
                console.error("Read error:", readError);
                const recordsWithoutNote = await odooService.execute(
                    "hr.salary.rule.category",
                    "read",
                    [ids, ["id", "name", "code", "parent_id"]]
                );

                return res.status(200).json({
                    status: "success",
                    count: recordsWithoutNote.length,
                    data: recordsWithoutNote,
                    warning: "Note field not available"
                });
            }

        } catch (error) {
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to fetch salary rule categories",
                error_type: error.constructor.name
            });
        }
    }
    async createSalaryRule(req, res) {
        try {
            console.log("API Called createSalaryRule");

            const {
                name,
                active = true,
                appears_on_payslip = false,
                appears_on_employee_cost_dashboard = false,
                appears_on_payroll_report = false,
                category_id,
                code,
                sequence,
                condition_select = "none",
                quantity = "1",
                partner_id,
                amount_fix,
                amount_select = "fix",
                note,
                struct_id
            } = req.body;

            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Name is required",
                });
            }

            if (!category_id) {
                return res.status(400).json({
                    status: "error",
                    message: "Category is required",
                });
            }

            if (!code) {
                return res.status(400).json({
                    status: "error",
                    message: "Code is required",
                });
            }

            if (sequence === undefined || sequence === null) {
                return res.status(400).json({
                    status: "error",
                    message: "Sequence is required",
                });
            }

            if (!condition_select) {
                return res.status(400).json({
                    status: "error",
                    message: "Condition select is required",
                });
            }

            if (!amount_select) {
                return res.status(400).json({
                    status: "error",
                    message: "Amount type is required",
                });
            }
            if (!struct_id) {
                return res.status(400).json({
                    status: "error",
                    message: "Salary Structure (struct_id) is required",
                });
            }

            const validConditions = ["none", "range", "input", "python"];
            if (!validConditions.includes(condition_select)) {
                return res.status(400).json({
                    status: "error",
                    message: `Invalid condition_select. Must be one of: ${validConditions.join(", ")}`,
                });
            }
            const validAmountTypes = ["percentage", "fix", "input", "code"];
            if (!validAmountTypes.includes(amount_select)) {
                return res.status(400).json({
                    status: "error",
                    message: `Invalid amount_select. Must be one of: ${validAmountTypes.join(", ")}`,
                });
            }

            if (amount_select === "fix" && (amount_fix === undefined || amount_fix === null)) {
                return res.status(400).json({
                    status: "error",
                    message: "Fixed amount is required when amount type is 'fix'",
                });
            }

            if (!["code", "input"].includes(amount_select) && !quantity) {
                return res.status(400).json({
                    status: "error",
                    message: "Quantity is required for this amount type",
                });
            }

            const existingCode = await odooService.execute(
                "hr.salary.rule",
                "search",
                [[["code", "=", code]]],
                { limit: 1 }
            );

            if (existingCode.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Salary Rule with code '${code}' already exists`,
                });
            }

            const categoryExists = await odooService.execute(
                "hr.salary.rule.category",
                "search",
                [[["id", "=", category_id]]],
                { limit: 1 }
            );

            if (!categoryExists.length) {
                return res.status(404).json({
                    status: "error",
                    message: `Category with ID ${category_id} not found`,
                });
            }

            const structureExists = await odooService.execute(
                "hr.payroll.structure",
                "search",
                [[["id", "=", struct_id]]],
                { limit: 1 }
            );

            if (!structureExists.length) {
                return res.status(404).json({
                    status: "error",
                    message: `Salary Structure with ID ${struct_id} not found`,
                });
            }

            if (partner_id) {
                const partnerExists = await odooService.execute(
                    "res.partner",
                    "search",
                    [[["id", "=", partner_id]]],
                    { limit: 1 }
                );

                if (!partnerExists.length) {
                    return res.status(404).json({
                        status: "error",
                        message: `Partner with ID ${partner_id} not found`,
                    });
                }
            }

            const vals = {
                name,
                active,
                appears_on_payslip,
                appears_on_employee_cost_dashboard,
                appears_on_payroll_report,
                category_id,
                code,
                sequence,
                condition_select,
                amount_select,
                struct_id,
            };

            if (!["code", "input"].includes(amount_select)) {
                vals.quantity = quantity;
            }

            if (amount_select === "fix") {
                vals.amount_fix = amount_fix;
            }

            if (partner_id) {
                vals.partner_id = partner_id;
            }

            if (note) {
                vals.note = note;
            }


            const ruleId = await odooService.create("hr.salary.rule", vals);

            const createdRecord = await odooService.execute(
                "hr.salary.rule",
                "read",
                [[ruleId], [
                    "id",
                    "name",
                    "active",
                    "appears_on_payslip",
                    "appears_on_employee_cost_dashboard",
                    "appears_on_payroll_report",
                    "category_id",
                    "code",
                    "sequence",
                    "condition_select",
                    "quantity",
                    "partner_id",
                    "amount_fix",
                    "amount_select",
                    "note",
                    "struct_id"
                ]]
            );

            return res.status(201).json({
                status: "success",
                message: "Salary Rule created successfully",
                data: createdRecord[0] || { id: ruleId },
            });

        } catch (error) {
            console.error("Create Salary Rule Error:", error);
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to create salary rule",
            });
        }
    }
    async getSalaryRules(req, res) {
        try {
            const ids = await odooService.execute(
                "hr.salary.rule",
                "search",
                [[]],
                { limit: 1000, order: 'sequence asc' }
            );
            if (!ids || ids.length === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: []
                });
            }

            const fields = [
                "id",
                "name",
                "active",
                "appears_on_payslip",
                "appears_on_employee_cost_dashboard",
                "appears_on_payroll_report",
                "category_id",
                "code",
                "sequence",
                "condition_select",
                "quantity",
                "partner_id",
                "amount_fix",
                "amount_select",
                "note",
                "struct_id"
            ];

            const records = await odooService.execute(
                "hr.salary.rule",
                "read",
                [ids, fields]
            );

            return res.status(200).json({
                status: "success",
                count: records.length,
                data: records,
            });

        } catch (error) {
            console.error("Get Salary Rules Error:", error);
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to fetch salary rules",
            });
        }
    }

    async createSalaryStructure(req, res) {
        try {
            // const client = await getClientFromRequest(req);

            const {
                name,
                typeId,
                countryId,
                hideBasicOnPdf,
                schedulePay,
                reportId,
                useWorkedDayLines,
                ytdComputation,
                payslipName,
            } = req.body;

            // 🔒 Required field validation
            if (!name || !typeId) {
                return res.status(400).json({
                    success: false,
                    message: "Name and Type are required fields",
                });
            }

            /* ------------------------------------------------------------------
            ✅ SAFELY RESOLVE MANY2ONE RECORDS (NO MISSING ID ERRORS)
            ------------------------------------------------------------------ */

            // 1️⃣ Validate Payroll Structure Type (REQUIRED)
            const typeExists = await odooService.searchCount(
                "hr.payroll.structure.type",
                [["id", "=", typeId]],
                //   client
            );

            if (!typeExists) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Payroll Structure Type",
                });
            }

            // 2️⃣ Validate Country (OPTIONAL)
            let safeCountryId = false;
            if (countryId) {
                const countryExists = await odooService.searchCount(
                    "res.country",
                    [["id", "=", countryId]],
                    // client
                );
                if (countryExists) safeCountryId = countryId;
            }

            // 3️⃣ Validate Report Template (OPTIONAL)
            let safeReportId = false;
            if (reportId) {
                const reportExists = await odooService.searchCount(
                    "ir.actions.report",
                    [["id", "=", reportId]],
                    // client
                );
                if (reportExists) safeReportId = reportId;
            }

            /* ------------------------------------------------------------------
            🧱 PAYLOAD (EXACTLY MATCHES hr.payroll.structure)
            ------------------------------------------------------------------ */
            const payload = {
                name: name,
                type_id: typeId,                     // ✅ guaranteed valid
                country_id: safeCountryId,            // ✅ safe
                hide_basic_on_pdf: !!hideBasicOnPdf,
                schedule_pay: schedulePay || false,   // readonly but creatable
                report_id: safeReportId,              // ✅ safe
                use_worked_day_lines: useWorkedDayLines ?? true,
                ytd_computation: !!ytdComputation,
                payslip_name: payslipName || false,
            };

            const structureId = await odooService.create(
                "hr.payroll.structure",
                payload,
                //   client
            );

            return res.status(201).json({
                success: true,
                message: "Salary Structure created successfully",
                data: {
                    id: structureId,
                },
            });

        } catch (error) {
            console.error("Create Salary Structure Error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to create Salary Structure",
                error: error.message,
            });
        }
    }

    async getSalaryStructure(req, res) {
        try {
            // const client = await getClientFromRequest(req);
            const { id } = req.params; // optional

            const domain = [];
            if (id) {
                domain.push(["id", "=", Number(id)]);
            }

            const records = await odooService.searchRead(
                "hr.payroll.structure",
                domain,
                [
                    "id",
                    "name",
                    "type_id",
                    "country_id",
                    "hide_basic_on_pdf",
                    "schedule_pay",
                    "report_id",
                    "use_worked_day_lines",
                    "ytd_computation",
                    "payslip_name",
                    "create_date"
                ],
                // client
            );

            if (id && (!records || records.length === 0)) {
                return res.status(404).json({
                    success: false,
                    message: "Salary structure not found"
                });
            }

            const formattedData = records.map((rec) => ({
                id: rec.id,
                name: rec.name,
                typeId: rec.type_id ? rec.type_id[0] : null,
                typeName: rec.type_id ? rec.type_id[1] : null,
                countryId: rec.country_id ? rec.country_id[0] : null,
                countryName: rec.country_id ? rec.country_id[1] : null,
                hideBasicOnPdf: rec.hide_basic_on_pdf,
                schedulePay: rec.schedule_pay,
                reportId: rec.report_id ? rec.report_id[0] : null,
                reportName: rec.report_id ? rec.report_id[1] : null,
                useWorkedDayLines: rec.use_worked_day_lines,
                ytdComputation: rec.ytd_computation,
                payslipName: rec.payslip_name,
                createdAt: rec.create_date,
            }));

            return res.status(200).json({
                success: true,
                message: id ? "Salary Structure fetched successfully"
                    : "Salary Structures fetched successfully",
                data: id ? formattedData[0] : formattedData,
            });
        }
        catch (error) {
            console.error("Get Salary Structure Error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch Salary Structure",
                error: error.message
            });
        }
    }
}
module.exports = new PayrollController();
