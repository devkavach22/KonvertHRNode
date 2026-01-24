const odooService = require("../../Masters/services/odoo.service.js");
const {
    getClientFromRequest,
} = require("../../Masters/services/plan.helper.js");

class PayrollController {
    async createStructureType(req, res) {
        try {
            const {
                name,
                default_schedule_pay,
                wage_type,
                country_id,
                default_work_entry_type_id,
                default_resource_calendar_id,
                default_struct_id,
            } = req.body;

            console.log("📥 Create Structure Type Request Body:", JSON.stringify(req.body, null, 2));

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

            const { client_id } = await getClientFromRequest(req);
            console.log("🏢 Client ID:", client_id);
            const workEntryExists = await odooService.searchRead(
                "hr.work.entry.type",
                [["id", "=", default_work_entry_type_id]],
                ["id", "name"]
            );

            console.log("🔍 Work Entry Type Validation:", workEntryExists);

            if (!workEntryExists.length) {
                return res.status(400).json({
                    status: "error",
                    message: `Invalid Work Entry Type ID: ${default_work_entry_type_id}`,
                });
            }

            let safeCountryId = false;
            if (country_id) {
                const countryExists = await odooService.searchRead(
                    "res.country",
                    [["id", "=", country_id]],
                    ["id", "name"]
                );
                console.log("🌍 Country Validation:", countryExists);
                if (countryExists.length) {
                    safeCountryId = country_id;
                } else {
                    console.log("⚠️ Warning: Invalid country_id, setting to false");
                }
            }

            let safeResourceCalendarId = false;
            if (default_resource_calendar_id) {
                const calendarExists = await odooService.searchRead(
                    "resource.calendar",
                    [["id", "=", default_resource_calendar_id]],
                    ["id", "name"]
                );
                console.log("📅 Resource Calendar Validation:", calendarExists);
                if (calendarExists.length) {
                    safeResourceCalendarId = default_resource_calendar_id;
                } else {
                    console.log("⚠️ Warning: Invalid resource_calendar_id, setting to false");
                }
            }

            let safeStructId = false;
            if (default_struct_id) {
                const structExists = await odooService.searchRead(
                    "hr.payroll.structure",
                    [
                        ["id", "=", default_struct_id],
                        ["client_id", "=", client_id]
                    ],
                    ["id", "name"]
                );
                console.log("💰 Salary Structure Validation:", structExists);
                if (structExists.length) {
                    safeStructId = default_struct_id;
                } else {
                    console.log("⚠️ Warning: Invalid or unauthorized struct_id, setting to false");
                }
            }

            // 5️⃣ Check if Structure Type already exists
            const existing = await odooService.searchRead(
                "hr.payroll.structure.type",
                [
                    ["name", "=", name],
                    ["client_id", "=", client_id],
                ],
                ["id", "name"]
            );

            console.log("🔍 Existing Structure Type Check:", existing);

            if (existing.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Structure Type '${name}' already exists for this organization`,
                    existing_id: existing[0].id,
                });
            }
            const vals = {
                name,
                wage_type,
                default_schedule_pay: default_schedule_pay || false,
                country_id: safeCountryId,
                default_work_entry_type_id,
                default_resource_calendar_id: safeResourceCalendarId,
                default_struct_id: safeStructId,
                client_id,
            };

            console.log("📦 Final Payload:", JSON.stringify(vals, null, 2));
            const structTypeId = await odooService.create(
                "hr.payroll.structure.type",
                vals
            );

            console.log("✅ Structure Type Created - ID:", structTypeId);
            const createdStructType = await odooService.searchRead(
                "hr.payroll.structure.type",
                [["id", "=", structTypeId]],
                [
                    "name",
                    "wage_type",
                    "default_schedule_pay",
                    "country_id",
                    "default_work_entry_type_id",
                    "default_resource_calendar_id",
                    "default_struct_id",
                ]
            );

            console.log("📋 Created Structure Type Details:", JSON.stringify(createdStructType, null, 2));

            return res.status(201).json({
                status: "success",
                message: "Payroll Structure Type created successfully",
                data: createdStructType[0] || { id: structTypeId },
            });

        } catch (error) {
            console.error("❌ Create Structure Type Error:", error);
            console.error("🔥 Error Stack:", error.stack);
            console.error("🔥 Error Details:", JSON.stringify(error, null, 2));

            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create payroll structure type",
                error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }
    async getStructureTypes(req, res) {
        try {
            console.log("API Called getStructureTypes");
            const { client_id } = await getClientFromRequest(req);
            const count = await odooService.execute(
                "hr.payroll.structure.type",
                "search_count",
                [[["client_id", "=", client_id]]]
            );
            if (count === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: [],
                    message: "No structure types found",
                });
            }
            const ids = await odooService.execute(
                "hr.payroll.structure.type",
                "search",
                [[["client_id", "=", client_id]]],
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
            const { name, parent_id, note } = req.body;

            // 1. Get client_id from request
            const { client_id } = await getClientFromRequest(req);

            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Name is required",
                });
            }

            // Generate Base Code
            let baseCode = name
                .toUpperCase()
                .replace(/[^A-Z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '_');

            // Check if Code exists within the same Client
            const checkCodeExists = async (code) => {
                const existing = await odooService.searchRead(
                    "hr.salary.rule.category",
                    [
                        ["code", "=", code],
                        ["client_id", "=", client_id] // Filter by client_id
                    ],
                    ["id", "name", "code"]
                );
                return existing.length > 0;
            };

            let uniqueCode = baseCode;
            let counter = 1;

            // Loop to generate unique code for this client
            while (await checkCodeExists(uniqueCode)) {
                uniqueCode = `${baseCode}_${counter}`;
                counter++;
            }

            // 2. Check if Name already exists for this Client
            const existingByName = await odooService.searchRead(
                "hr.salary.rule.category",
                [
                    ["name", "=", name],
                    ["client_id", "=", client_id] // Filter by client_id
                ],
                ["id", "name", "code"]
            );

            if (existingByName.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Salary Rule Category with name '${name}' already exists for this client`,
                    existing_id: existingByName[0].id,
                    existing_code: existingByName[0].code,
                });
            }

            // 3. Prepare values with client_id
            const vals = {
                name,
                code: uniqueCode,
                parent_id: parent_id ? parseInt(parent_id) : false,
                note: note || false,
                client_id, // Added client_id here
            };

            const categoryId = await odooService.create(
                "hr.salary.rule.category",
                vals
            );

            const createdRecord = await odooService.searchRead(
                "hr.salary.rule.category",
                [["id", "=", categoryId]],
                ["id", "name", "code", "parent_id", "note", "client_id"]
            );

            return res.status(201).json({
                status: "success",
                message: "Salary Rule Category created successfully",
                data: createdRecord[0] || { id: categoryId },
            });

        } catch (error) {
            console.error("Create Salary Rule Category Error:", error);
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create salary rule category",
                error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }
    async getSalaryRuleCategories(req, res) {
        try {
            console.log("API Called getSalaryRuleCategories");

            const { client_id } = await getClientFromRequest(req);

            if (!client_id) {
                return res.status(400).json({
                    status: "error",
                    message: "client_id not found in request context",
                });
            }

            const records = await odooService.searchRead(
                "hr.salary.rule.category",
                [["client_id", "=", client_id]],
                ["id", "name", "code", "parent_id", "note"]
            );

            if (!records || records.length === 0) {
                return res.status(200).json({
                    status: "success",
                    count: 0,
                    data: [],
                    message: "No salary rule categories found for this client",
                });
            }

            return res.status(200).json({
                status: "success",
                count: records.length,
                data: records,
            });

        } catch (error) {
            console.error("Get Salary Rule Categories Error:", error);

            try {
                const { client_id } = await getClientFromRequest(req);
                const fallbackRecords = await odooService.searchRead(
                    "hr.salary.rule.category",
                    [["client_id", "=", client_id]],
                    ["id", "name", "code", "parent_id"]
                );

                return res.status(200).json({
                    status: "success",
                    count: fallbackRecords.length,
                    data: fallbackRecords,
                    warning: "Note field not available or an error occurred during full fetch",
                });
            } catch (innerError) {
                return res.status(error.status || 500).json({
                    status: "error",
                    message: error.message || "Failed to fetch salary rule categories",
                });
            }
        }
    }
    async createSalaryRule(req, res) {
        try {
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
                condition_range,
                condition_range_min,
                condition_range_max,
                condition_python,
                condition_other_input_id,
                quantity = "1",
                partner_id,
                amount_fix,
                amount_select = "fix",
                amount_percentage_base,
                amount_percentage,
                amount_other_input_id,
                amount_python_compute,
                note,
                struct_id
            } = req.body;

            let { client_id } = await getClientFromRequest(req);
            if (typeof client_id === 'string') {
                client_id = parseInt(client_id, 10);
            }

            if (!name) return res.status(400).json({ status: "error", message: "Name is required" });
            if (!category_id) return res.status(400).json({ status: "error", message: "Category is required" });
            if (!code) return res.status(400).json({ status: "error", message: "Code is required" });
            if (sequence === undefined || sequence === null) return res.status(400).json({ status: "error", message: "Sequence is required" });
            if (!struct_id) return res.status(400).json({ status: "error", message: "Salary Structure (struct_id) is required" });

            const validConditions = ["none", "range", "input", "python"];
            if (!validConditions.includes(condition_select)) {
                return res.status(400).json({ status: "error", message: `Invalid condition_select. Must be: ${validConditions.join(", ")}` });
            }

            if (condition_select === "range") {
                if (!condition_range || condition_range_min === undefined || condition_range_max === undefined) {
                    return res.status(400).json({ status: "error", message: "Range Based on, Minimum, and Maximum are required for 'Range' condition" });
                }
            }

            if (condition_select === "python" && !condition_python) {
                return res.status(400).json({ status: "error", message: "Python Condition code is required" });
            }

            if (condition_select === "input" && !condition_other_input_id) {
                return res.status(400).json({ status: "error", message: "Condition Other Input is required" });
            }

            const validAmountTypes = ["percentage", "fix", "input", "code"];
            if (!validAmountTypes.includes(amount_select)) {
                return res.status(400).json({ status: "error", message: `Invalid amount_select. Must be: ${validAmountTypes.join(", ")}` });
            }

            if (amount_select === "fix" && (amount_fix === undefined || amount_fix === null)) {
                return res.status(400).json({ status: "error", message: "Fixed amount is required" });
            }

            if (amount_select === "percentage") {
                if (!amount_percentage_base || amount_percentage === undefined) {
                    return res.status(400).json({ status: "error", message: "Percentage base and value are required" });
                }
            }

            if (amount_select === "input" && !amount_other_input_id) {
                return res.status(400).json({ status: "error", message: "Amount Other Input is required" });
            }

            if (amount_select === "code" && !amount_python_compute) {
                return res.status(400).json({ status: "error", message: "Python Code for computation is required" });
            }
            const existingCode = await odooService.searchRead(
                "hr.salary.rule",
                [
                    ["code", "=", code],
                    ["client_id", "=", client_id]
                ],
                ["id"],
                1
            );

            if (existingCode.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Salary Rule with code '${code}' already exists for this client`
                });
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
                client_id,
                note
            };

            if (condition_select === "range") {
                vals.condition_range = condition_range;
                vals.condition_range_min = parseFloat(condition_range_min);
                vals.condition_range_max = parseFloat(condition_range_max);
            } else if (condition_select === "python") {
                vals.condition_python = condition_python;
            } else if (condition_select === "input") {
                vals.condition_other_input_id = condition_other_input_id;
            }

            if (!["code", "input"].includes(amount_select)) vals.quantity = quantity;
            if (amount_select === "fix") vals.amount_fix = amount_fix;
            if (amount_select === "percentage") {
                vals.amount_percentage_base = amount_percentage_base;
                vals.amount_percentage = amount_percentage;
            }
            if (amount_select === "input") vals.amount_other_input_id = amount_other_input_id;
            if (amount_select === "code") vals.amount_python_compute = amount_python_compute;
            if (partner_id) vals.partner_id = partner_id;
            const ruleId = await odooService.create("hr.salary.rule", vals);
            try {
                await odooService.execute(
                    "hr.salary.rule",
                    "write",
                    [[ruleId], { client_id: client_id }]
                );
            } catch (writeError) {
            }

            const createdRecord = await odooService.execute(
                "hr.salary.rule",
                "read",
                [[ruleId], [
                    "id", "name", "code", "sequence", "condition_select",
                    "condition_range", "condition_range_min", "condition_range_max",
                    "condition_python", "condition_other_input_id",
                    "amount_select", "amount_fix", "amount_percentage", "struct_id",
                    "client_id"
                ]]
            );
            return res.status(201).json({
                status: "success",
                message: "Salary Rule created successfully",
            });

        } catch (error) {
            console.error("Create Salary Rule Error:", error);
            console.error("Error stack:", error.stack);
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create salary rule"
            });
        }
    }
    async getSalaryRules(req, res) {
        try {
            const { client_id } = await getClientFromRequest(req);

            const ids = await odooService.execute(
                "hr.salary.rule",
                "search",
                [[["client_id", "=", client_id]]],
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
                "struct_id",
                "client_id"
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
            return res.status(error.status || 500).json({
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
    async createContracts(req, res) {
        try {
            console.log("API called for Contract creation");
            const {
                name, // Contract Reference (MANDATORY)
                employee_code,
                employee_id,
                job_id, // Job Position
                date_start,
                date_end,

                resource_calendar_id,
                work_entry_source,
                structure_type_id, // Salary Structure Type
                department_id,
                contract_type_id,

                wage_type,
                schedule_pay,
                wage,

                conveyance_allowances,
                skill_allowances,
                food_allowances,
                washing_allowances,
                special_allowances,
                medical_allowances,
                uniform_allowances,
                child_eduction_allowances,
                other_allowances,
                variable_pay,
                gratuity,
                professional_tax,
                lta
            } = req.body;
            console.log(req.body);

            /* ───────── 1. GET client_id FROM AUTH ───────── */
            const { client_id } = await getClientFromRequest(req);

            const client = await odooService.searchRead(
                "res.partner",
                [["id", "=", client_id]],
                ["id"],
                1
            );

            if (!client.length) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid client_id"
                });
            }

            /* ───────── 2. MANDATORY VALIDATION ───────── */
            const missingFields = [];
            if (!name) missingFields.push("name (Contract Reference)");
            if (!employee_code) missingFields.push("employee_code");
            if (!employee_id) missingFields.push("employee_id");
            if (!date_start) missingFields.push("date_start");
            if (!structure_type_id) missingFields.push("structure_type_id (Salary Structure Type)");
            if (!work_entry_source) missingFields.push("work_entry_source");
            if (!wage) missingFields.push("wage");

            if (missingFields.length) {
                return res.status(400).json({
                    status: "error",
                    message: `Missing required fields: ${missingFields.join(", ")}`
                });
            }

            /* ───────── 3. VALIDATE EMPLOYEE (GET COMPANY & COUNTRY) ───────── */
            const employee = await odooService.searchRead(
                "hr.employee",
                [["id", "=", employee_id]],
                ["id", "name"],
                1
            );

            if (!employee.length) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid employee_id"
                });
            }

            // const employeeCompanyId = employee[0].company_id?.[0] || false;
            // const employeeCountryId = employee[0].country_id?.[0] || false;

            /* ───────── 4. VALIDATE JOB POSITION ───────── */
            if (job_id) {
                const job = await odooService.searchRead(
                    "hr.job",
                    [["id", "=", job_id]],
                    ["id", "name"],
                    1
                );
                if (!job.length) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid job_id"
                    });
                }
            }

            /* ───────── 5. VALIDATE SALARY STRUCTURE TYPE (CRITICAL FIX) ───────── */
            // let validStructureTypeId = false;

            if (structure_type_id) {
                const structureType = await odooService.searchRead(
                    "hr.payroll.structure.type",
                    [["id", "=", structure_type_id]],
                    ["id", "name"],
                    1
                );
                // const structureType = await odooService.searchRead(
                // "hr.payroll.structure.type",
                // [
                // ["id", "=", structure_type_id],
                // "|", ["company_id", "=", false], ["company_id", "=", employeeCompanyId],
                // "|", ["country_id", "=", false], ["country_id", "=", employeeCountryId]
                // ],
                // ["id", "name"],
                // 1
                // );

                if (!structureType.length) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid Salary Structure Type for this employee"
                    });
                }

                // validStructureTypeId = structure_type_id;
            }

            /* ───────── 6. VALIDATE WORK ENTRY SOURCE ───────── */
            const validWorkEntrySources = ["calendar", "attendance"];
            if (!validWorkEntrySources.includes(work_entry_source)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid work_entry_source"
                });
            }

            if (work_entry_source === "calendar" && !resource_calendar_id) {
                return res.status(400).json({
                    status: "error",
                    message: "resource_calendar_id is required when work_entry_source is calendar"
                });
            }

            if (resource_calendar_id) {
                const calendar = await odooService.searchRead(
                    "resource.calendar",
                    [["id", "=", resource_calendar_id]],
                    ["id", "name"],
                    1
                );
                if (!calendar.length) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid resource_calendar_id"
                    });
                }
            }

            /* ───────── 7. VALIDATE OTHER MANY2ONE FIELDS ───────── */
            const many2oneChecks = [
                { id: department_id, model: "hr.department", field: "department_id" },
                { id: contract_type_id, model: "hr.contract.type", field: "contract_type_id" }
            ];

            for (const item of many2oneChecks) {
                if (item.id) {
                    const record = await odooService.searchRead(
                        item.model,
                        [["id", "=", item.id]],
                        ["id"],
                        1
                    );
                    if (!record.length) {
                        return res.status(400).json({
                            status: "error",
                            message: `Invalid ${item.field}`
                        });
                    }
                }
            }

            /* ───────── 8. VALIDATE SELECTION FIELDS ───────── */
            const validWageTypes = ["monthly", "hourly", "daily_attendance"];
            if (wage_type && !validWageTypes.includes(wage_type)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid wage_type"
                });
            }

            const validSchedulePay = [
                "annually", "semi-annually", "quarterly",
                "bi-monthly", "monthly", "semi-monthly",
                "bi-weekly", "weekly", "daily"
            ];
            if (schedule_pay && !validSchedulePay.includes(schedule_pay)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid schedule_pay"
                });
            }

            /* ───────── 9. CONSTRUCT PAYLOAD (ODOO FINAL) ───────── */
            const vals = {
                name,
                state: "draft", // New → Running → Expired → Cancelled
                client_id,

                employee_code,
                employee_id,
                job_id: job_id || false,

                date_start,
                date_end: date_end || false,

                work_entry_source,
                resource_calendar_id: resource_calendar_id || false,

                structure_type_id: structure_type_id || false,
                department_id: department_id || false,
                contract_type_id: contract_type_id || false,

                wage_type: wage_type || "monthly",
                schedule_pay: schedule_pay || "monthly",
                wage,

                conveyance_allowances: conveyance_allowances || 0,
                skill_allowances: skill_allowances || 0,
                food_allowances: food_allowances || 0,
                washing_allowances: washing_allowances || 0,
                special_allowances: special_allowances || 0,
                medical_allowances: medical_allowances || 0,
                uniform_allowances: uniform_allowances || 0,
                child_eduction_allowances: child_eduction_allowances || 0,
                other_allowances: other_allowances || 0,
                variable_pay: variable_pay || 0,
                gratuity: gratuity || 0,
                professional_tax: professional_tax || 0,
                lta: lta || 0
            };

            console.log("Payload sending to Odoo:", vals);

            /* ───────── 10. CREATE CONTRACT ───────── */
            const contractId = await odooService.create("hr.contract", vals);

            /* ───────── 11. FETCH CREATED CONTRACT ───────── */
            const rec = await odooService.searchRead(
                "hr.contract",
                [["id", "=", contractId]],
                [
                    "id",
                    "name",
                    "employee_code",
                    "employee_id",
                    "job_id",
                    "department_id",
                    "contract_type_id",
                    "structure_type_id",
                    "wage_type",
                    "schedule_pay",
                    "wage",
                    "work_entry_source",
                    "resource_calendar_id",
                    "conveyance_allowances",
                    "skill_allowances",
                    "food_allowances",
                    "washing_allowances",
                    "special_allowances",
                    "medical_allowances",
                    "uniform_allowances",
                    "child_eduction_allowances",
                    "other_allowances",
                    "variable_pay",
                    "gratuity",
                    "professional_tax",
                    "lta",
                    "date_start",
                    "date_end",
                    "state",
                    "client_id"
                ],
                1
            );

            // const contractData = createdContract.length ? createdContract[0] : null;

            const c = rec[0];

            return res.status(201).json({
                status: "success",
                message: "Contract created successfully",
                data: {
                    contract_id: c.id,
                    name: c.name,
                    state: c.state,
                    client: c.client_id,

                    employee_code: c.employee_code,
                    employee: c.employee_id,
                    job_position: c.job_id,
                    department: c.department_id,
                    contract_type: c.contract_type_id,

                    date_start: c.date_start,
                    date_end: c.date_end,

                    salary_structure_type: c.structure_type_id,
                    wage_type: c.wage_type,
                    schedule_pay: c.schedule_pay,
                    wage: c.wage,

                    work_entry_source: c.work_entry_source,
                    working_schedule: c.resource_calendar_id,

                    allowances: {
                        conveyance: c.conveyance_allowances,
                        skill: c.skill_allowances,
                        food: c.food_allowances,
                        washing: c.washing_allowances,
                        special: c.special_allowances,
                        medical: c.medical_allowances,
                        uniform: c.uniform_allowances,
                        child_education: c.child_eduction_allowances,
                        other: c.other_allowances,
                        variable_pay: c.variable_pay,
                        gratuity: c.gratuity,
                        professional_tax: c.professional_tax,
                        lta: c.lta
                    },

                    meta: {
                        created_at: c.create_date,
                        updated_at: c.write_date
                    }
                }
            });

            // return res.status(201).json({
            // status: "success",
            // message: "Contract created successfully",
            // data: createdContract[0] || null
            // });

        } catch (error) {
            console.error("❌ Create Contract Error:", error);
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to create contract"
            });
        }
    }
    async getContracts(req, res) {
        try {
            console.log("API called for Get Contracts");

            const {
                employee_id,
                job_id,
                state,
                date_from,
                date_to,
                limit = 10,
                offset = 0
            } = req.query;
            console.log(req.query);

            /* ───────── 1. GET client_id FROM AUTH ───────── */
            const { client_id } = await getClientFromRequest(req);

            /* ───────── 2. BUILD DOMAIN ───────── */
            const domain = [["client_id", "=", client_id]];

            if (employee_id) {
                domain.push(["employee_id", "=", Number(employee_id)]);
            }

            if (job_id) {
                domain.push(["job_id", "=", Number(job_id)]);
            }

            if (state) {
                domain.push(["state", "=", state]);
            }

            if (date_from) {
                domain.push(["date_start", ">=", date_from]);
            }

            if (date_to) {
                domain.push(["date_start", "<=", date_to]);
            }

            /* ───────── 3. FETCH CONTRACTS ───────── */
            const records = await odooService.searchRead(
                "hr.contract",
                domain,
                [
                    "id",
                    "name",
                    "state",
                    "client_id",

                    "employee_code",
                    "employee_id",
                    "job_id",
                    "department_id",
                    "contract_type_id",

                    "date_start",
                    "date_end",

                    "structure_type_id",
                    "wage_type",
                    "schedule_pay",
                    "wage",

                    "work_entry_source",
                    "resource_calendar_id",

                    "conveyance_allowances",
                    "skill_allowances",
                    "food_allowances",
                    "washing_allowances",
                    "special_allowances",
                    "medical_allowances",
                    "uniform_allowances",
                    "child_eduction_allowances",
                    "other_allowances",
                    "variable_pay",
                    "gratuity",
                    "professional_tax",
                    "lta",

                    "create_date",
                    "write_date"
                ],
                Number(limit),
                Number(offset),
                "create_date desc"
            );

            /* ───────── 4. FORMAT RESPONSE ───────── */
            const data = records.map(c => ({
                contract_id: c.id,
                name: c.name,
                state: c.state,
                client: c.client_id,

                employee_code: c.employee_code,
                employee: c.employee_id,
                job_position: c.job_id,
                department: c.department_id,
                contract_type: c.contract_type_id,

                date_start: c.date_start,
                date_end: c.date_end,

                salary_structure_type: c.structure_type_id,
                wage_type: c.wage_type,
                schedule_pay: c.schedule_pay,
                wage: c.wage,

                work_entry_source: c.work_entry_source,
                working_schedule: c.resource_calendar_id,

                allowances: {
                    conveyance: c.conveyance_allowances,
                    skill: c.skill_allowances,
                    food: c.food_allowances,
                    washing: c.washing_allowances,
                    special: c.special_allowances,
                    medical: c.medical_allowances,
                    uniform: c.uniform_allowances,
                    child_education: c.child_eduction_allowances,
                    other: c.other_allowances,
                    variable_pay: c.variable_pay,
                    gratuity: c.gratuity,
                    professional_tax: c.professional_tax,
                    lta: c.lta
                },

                meta: {
                    created_at: c.create_date,
                    updated_at: c.write_date
                }
            }));

            /* ───────── 5. RESPONSE ───────── */
            return res.status(200).json({
                status: "success",
                message: "Contracts fetched successfully",
                data,
                meta: {
                    total: data.length,
                    limit: Number(limit),
                    offset: Number(offset)
                }
            });

        } catch (error) {
            console.error("❌ Get Contracts Error:", error);
            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to fetch contracts"
            });
        }
    }

    async createInputType(req, res) {
        try {
            const {
                name,
                country_id,
                available_in_attachments,
                struct_ids,
                is_quantity,
                default_no_end_date,
            } = req.body;

            const { client_id } = await getClientFromRequest(req);

            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Name is required",
                });
            }

            let baseCode = name
                .toUpperCase()
                .replace(/[^A-Z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '_');

            const checkCodeExists = async (code) => {
                const existing = await odooService.searchRead(
                    "hr.payslip.input.type",
                    [
                        ["code", "=", code],
                        ["client_id", "=", client_id]
                    ],
                    ["id", "name", "code"]
                );
                return existing.length > 0;
            };

            let uniqueCode = baseCode;
            let counter = 1;

            while (await checkCodeExists(uniqueCode)) {
                uniqueCode = `${baseCode}_${counter}`;
                counter++;
            }

            const existingByName = await odooService.searchRead(
                "hr.payslip.input.type",
                [
                    ["name", "=", name],
                    ["client_id", "=", client_id]
                ],
                ["id", "name", "code"]
            );

            if (existingByName.length) {
                return res.status(409).json({
                    status: "error",
                    message: `Input Type with name '${name}' already exists`,
                    existing_id: existingByName[0].id,
                    existing_code: existingByName[0].code,
                });
            }

            let safeCountryId = false;
            if (country_id) {
                const countryExists = await odooService.searchRead(
                    "res.country",
                    [["id", "=", country_id]],
                    ["id", "name"]
                );

                if (countryExists.length) {
                    safeCountryId = country_id;
                } else {
                    return res.status(400).json({
                        status: "error",
                        message: `Invalid Country ID: ${country_id}`,
                    });
                }
            }

            let safeStructIds = [];
            if (struct_ids && Array.isArray(struct_ids) && struct_ids.length > 0) {
                const structsExist = await odooService.searchRead(
                    "hr.payroll.structure",
                    [["id", "in", struct_ids]],
                    ["id", "name"]
                );

                if (structsExist.length !== struct_ids.length) {
                    const foundIds = structsExist.map(s => s.id);
                    const invalidIds = struct_ids.filter(id => !foundIds.includes(id));
                    return res.status(400).json({
                        status: "error",
                        message: `Invalid Payroll Structure IDs: ${invalidIds.join(', ')}`,
                    });
                }

                safeStructIds = [[6, 0, struct_ids]];
            }

            const payload = {
                name,
                code: uniqueCode,
                country_id: safeCountryId,
                available_in_attachments: !!available_in_attachments,
                client_id
            };

            if (available_in_attachments && safeStructIds.length > 0) {
                payload.struct_ids = safeStructIds;
            }

            if (available_in_attachments) {
                payload.is_quantity = !!is_quantity;
                payload.default_no_end_date = !!default_no_end_date;
            }

            const inputTypeId = await odooService.create(
                "hr.payslip.input.type",
                payload
            );

            const createdInputType = await odooService.searchRead(
                "hr.payslip.input.type",
                [["id", "=", inputTypeId]],
                [
                    "name",
                    "code",
                    "country_id",
                    "available_in_attachments",
                    "struct_ids",
                    "is_quantity",
                    "default_no_end_date",
                ]
            );

            return res.status(201).json({
                status: "success",
                message: "Payroll Input Type created successfully",
                data: createdInputType[0] || { id: inputTypeId },
            });

        } catch (error) {
            console.error("Create Input Type Error:", error);
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to create payroll input type",
                error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    async getInputTypes(req, res) {
        try {
            const {
                limit = 100,
                offset = 0,
            } = req.query;

            // ✅ Get client_id from request
            const { client_id } = await getClientFromRequest(req);

            const fields = [
                "id",
                "name",
                "code",
                "country_id",
                "available_in_attachments",
                "struct_ids",
                "is_quantity",
                "default_no_end_date",
            ];

            // ✅ Apply client_id filter in domain
            const domain = [["client_id", "=", client_id]];

            const inputTypes = await odooService.searchRead(
                "hr.payslip.input.type",
                domain,
                fields,
                parseInt(offset),
                parseInt(limit),
                "name asc"
            );

            // ✅ Count only for specific client
            const totalCount = await odooService.searchCount(
                "hr.payslip.input.type",
                domain
            );

            return res.status(200).json({
                status: "success",
                message: "Input types fetched successfully",
                data: inputTypes,
                meta: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    returned: inputTypes.length,
                },
            });

        } catch (error) {
            return res.status(error.status || 500).json({
                status: "error",
                message: error.message || "Failed to fetch input types",
                error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }
    async createPayslip(req, res) {
        try {
            const {
                employee_id,
                contract_id,
                payslip_run_id,
                struct_id,
                date_from,
                date_to,
                employee_code,
                name, // Add name field
            } = req.body;

            // Validate required fields
            if (!employee_id) {
                return res.status(400).json({
                    status: "error",
                    message: "Employee ID is required",
                });
            }

            if (!struct_id) {
                return res.status(400).json({
                    status: "error",
                    message: "Structure ID is required",
                });
            }

            if (!date_from) {
                return res.status(400).json({
                    status: "error",
                    message: "Date From is required",
                });
            }

            if (!name) {
                return res.status(400).json({
                    status: "error",
                    message: "Payslip Name is required",
                });
            }

            // Validate date format and validity
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

            if (!dateRegex.test(date_from)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid date_from format. Use YYYY-MM-DD format",
                });
            }

            if (date_to && !dateRegex.test(date_to)) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid date_to format. Use YYYY-MM-DD format",
                });
            }

            // Validate date_from is a valid date
            const dateFromObj = new Date(date_from);
            if (isNaN(dateFromObj.getTime())) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid date_from. Please provide a valid date",
                });
            }

            // Validate date_to is a valid date (if provided)
            if (date_to) {
                const dateToObj = new Date(date_to);
                if (isNaN(dateToObj.getTime())) {
                    return res.status(400).json({
                        status: "error",
                        message: "Invalid date_to. Please provide a valid date",
                    });
                }

                // Check if date_to is after date_from
                if (dateToObj < dateFromObj) {
                    return res.status(400).json({
                        status: "error",
                        message: "date_to must be greater than or equal to date_from",
                    });
                }

                // Validate that the date actually exists (e.g., no April 31)
                const [year, month, day] = date_to.split('-').map(Number);
                const reconstructedDate = new Date(year, month - 1, day);

                if (
                    reconstructedDate.getFullYear() !== year ||
                    reconstructedDate.getMonth() !== month - 1 ||
                    reconstructedDate.getDate() !== day
                ) {
                    return res.status(400).json({
                        status: "error",
                        message: `Invalid date_to: ${date_to}. This date does not exist in the calendar`,
                    });
                }
            }

            // Validate date_from exists in calendar
            const [yearFrom, monthFrom, dayFrom] = date_from.split('-').map(Number);
            const reconstructedDateFrom = new Date(yearFrom, monthFrom - 1, dayFrom);

            if (
                reconstructedDateFrom.getFullYear() !== yearFrom ||
                reconstructedDateFrom.getMonth() !== monthFrom - 1 ||
                reconstructedDateFrom.getDate() !== dayFrom
            ) {
                return res.status(400).json({
                    status: "error",
                    message: `Invalid date_from: ${date_from}. This date does not exist in the calendar`,
                });
            }

            // Get client_id from request
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

            // Verify employee belongs to this client using address_id
            const employeeExists = await odooService.searchRead(
                "hr.employee",
                [
                    ["id", "=", employee_id],
                    ["address_id", "=", client_id],
                ],
                ["id"],
                1
            );

            if (!employeeExists || employeeExists.length === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "Employee not found or does not belong to this client",
                });
            }

            // Verify contract if provided
            if (contract_id) {
                const contractExists = await odooService.searchRead(
                    "hr.contract",
                    [
                        ["id", "=", contract_id],
                        ["employee_id", "=", employee_id],
                    ],
                    ["id"],
                    1
                );

                if (!contractExists || contractExists.length === 0) {
                    return res.status(404).json({
                        status: "error",
                        message: "Contract not found or does not belong to this employee",
                    });
                }
            }

            // Verify payslip run if provided
            if (payslip_run_id) {
                const payslipRunExists = await odooService.searchRead(
                    "hr.payslip.run",
                    [
                        ["id", "=", payslip_run_id],
                        ["company_id", "=", client_id],
                    ],
                    ["id"],
                    1
                );

                if (!payslipRunExists || payslipRunExists.length === 0) {
                    return res.status(404).json({
                        status: "error",
                        message: "Payslip run not found or does not belong to this company",
                    });
                }
            }

            // Prepare payslip values
            const vals = {
                name, // Required field
                employee_id,
                struct_id,
                date_from,
                client_id,
            };

            // Add optional fields
            if (contract_id) vals.contract_id = contract_id;
            if (payslip_run_id) vals.payslip_run_id = payslip_run_id;
            if (date_to) vals.date_to = date_to;
            if (employee_code) vals.employee_code = employee_code;

            // Create payslip
            const payslipId = await odooService.create("hr.payslip", vals);

            return res.status(201).json({
                status: "success",
                message: "Payslip created successfully",
                payslip_id: payslipId,
            });
        } catch (error) {
            console.error("❌ Create Payslip Error:", error);

            // Handle specific Odoo errors and return 400 for validation errors
            const errorMessage = error.message || error.faultString || "";

            if (errorMessage.includes("mandatory field is not set")) {
                // Extract field name from error message
                const fieldMatch = errorMessage.match(/Field: ([^\n]+)/);
                const fieldName = fieldMatch ? fieldMatch[1] : "A required field";

                return res.status(400).json({
                    status: "error",
                    message: `${fieldName} is required`,
                });
            }

            if (errorMessage.includes("DatetimeFieldOverflow")) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid date provided. Please check date_from and date_to values",
                });
            }

            if (errorMessage.includes("Invalid field")) {
                return res.status(400).json({
                    status: "error",
                    message: "Invalid field in request",
                });
            }

            if (errorMessage.includes("does not exist")) {
                return res.status(404).json({
                    status: "error",
                    message: "Referenced record does not exist",
                });
            }

            return res.status(500).json({
                status: "error",
                message: error.message || "Failed to create payslip",
            });
        }
    }

    async computePayslip(req, res) {
        try {
            const payslip_id = req.params.id; 

            if (!payslip_id) {
                return res.status(400).json({
                    status: "error",
                    message: "Payslip ID is required",
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

            const payslipExists = await odooService.searchRead(
                "hr.payslip",
                [
                    ["id", "=", Number(payslip_id)],
                    ["client_id", "=", client_id],
                ],
                ["id", "state"],
                1
            );

            if (!payslipExists || payslipExists.length === 0) {
                return res.status(404).json({
                    status: "error",
                    message: "Payslip not found or does not belong to this client",
                });
            }

            const currentState = payslipExists[0].state;
            if (currentState !== "draft") {
                return res.status(400).json({
                    status: "error",
                    message: `Cannot compute payslip. Payslip must be in 'draft' state, current state is '${currentState}'`,
                });
            }

            console.log("🔄 Computing payslip...");

            const computeResult = await odooService.callCustomMethod(
                "hr.payslip",
                "compute_sheet",
                [[Number(payslip_id)]]
            );

            console.log("✅ Payslip computed:", JSON.stringify(computeResult, null, 2));

            const updatedPayslip = await odooService.searchRead(
                "hr.payslip",
                [["id", "=", Number(payslip_id)]],
                ["id", "name", "state", "line_ids"],
                1
            );

            return res.status(200).json({
                status: "success",
                message: "Payslip computed successfully",
                data: {
                    payslip_id: Number(payslip_id),
                    state: updatedPayslip[0]?.state || "draft",
                    line_ids: updatedPayslip[0]?.line_ids || [],
                    name: updatedPayslip[0]?.name || "",
                },
            });

        } catch (error) {
            console.error("❌ Compute Payslip Error:", error);

            const errorMessage = error.message || error.faultString || "";

            // Handle specific Odoo errors
            if (errorMessage.includes("state != 'draft'")) {
                return res.status(400).json({
                    status: "error",
                    message: "Payslip must be in draft state to compute",
                });
            }

            if (errorMessage.includes("does not exist")) {
                return res.status(404).json({
                    status: "error",
                    message: "Payslip not found",
                });
            }

            return res.status(500).json({
                status: "error",
                message: errorMessage || "Failed to compute payslip",
            });
        }
    }
}
module.exports = new PayrollController();
