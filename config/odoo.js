import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

export const odooRPC = async (service, method, args) => {
  const url = `${process.env.ODOO_URL}/jsonrpc`;
  const payload = {
    jsonrpc: "2.0",
    method: "call",
    params: { service, method, args },   
    id: Math.floor(Math.random() * 1000),
  };

  try {
    const response = await axios.post(url, payload);
    if (response.data.error) {
      console.error("Odoo RPC Error:", response.data.error);
      throw new Error(JSON.stringify(response.data.error));
    }
    return response.data.result;
  } catch (error) {
    console.error("Odoo Connection Error:", error.message);
    throw error;
  }
};

// Helper methods for CRUD operations
export const odooHelpers = {
  // Get Admin UID
  getAdminUid: async () => {
    const uid = await odooRPC("common", "authenticate", [
      process.env.ODOO_DB,
      process.env.ODOO_ADMIN,
      process.env.ODOO_ADMIN_PASSWORD,
      {},
    ]);
    return uid;
  },

  // Create record
  create: async (model, values) => {
    const uid = await odooHelpers.getAdminUid();
    return await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "create",
      [values],
    ]);
  },

  // Search + Read
  searchRead: async (model, domain = [], fields = []) => {
    const uid = await odooHelpers.getAdminUid();
    return await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "search_read",
      [domain],
      { fields },
    ]);
  },

  // Write record
  write: async (model, id, values) => {
    const uid = await odooHelpers.getAdminUid();
    return await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "write",
      [[id], values], 
    ]);
  },

  // Delete record
  unlink: async (model, ids) => {
    const uid = await odooHelpers.getAdminUid();
    return await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "unlink",
      [ids],
    ]);
  },

  // Call any custom method on a model
  callMethod: async (model, method, recordIds = [], context = {}) => {
    const uid = await odooHelpers.getAdminUid();
    return await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      method,
      [recordIds],
      { context },
    ]);
  },
};

