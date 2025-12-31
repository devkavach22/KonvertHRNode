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
        ]
      );

      products = products.map((p) => ({
        ...p,
        description: p.description
          ? p.description.replace(/<[^>]*>/g, "")
          : "",
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
};
