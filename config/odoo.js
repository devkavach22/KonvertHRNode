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

export const odooHelpers = {
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

  updateAuditFields: async (tableName, recordIds, createUid, writeUid) => {
    const uid = await odooHelpers.getAdminUid();
    try {
      let finalCreateUid = createUid;
      let finalWriteUid = writeUid;
            if (!createUid || createUid === null) {
        const modelName = tableName.replace(/_/g, '.');
        const currentData = await odooRPC("object", "execute_kw", [
          process.env.ODOO_DB,
          uid,
          process.env.ODOO_ADMIN_PASSWORD,
          modelName,
          "search_read",
          [[['id', 'in', recordIds]]],
          { fields: ['create_uid'] }
        ]);
        
        if (currentData.length > 0 && currentData[0].create_uid) {
          finalCreateUid = Array.isArray(currentData[0].create_uid) 
            ? currentData[0].create_uid[0] 
            : currentData[0].create_uid;
        }
      }   
      if (!finalWriteUid) {
        finalWriteUid = uid; 
      }
      
      console.log("Updating audit fields with args:", [tableName, recordIds, finalCreateUid, finalWriteUid]);
      
      return await odooRPC("object", "execute_kw", [
        process.env.ODOO_DB,
        uid,
        process.env.ODOO_ADMIN_PASSWORD,
        "odoo.audit.sql.utils",
        "update_create_and_write_uid",
        [tableName, recordIds, finalCreateUid, finalWriteUid]
      ]);
    } catch (error) {
      console.error("Error updating audit fields:", error.message);
      throw error;
    }
  },

  createWithCustomUid: async (model, values, customUid) => {
    const uid = await odooHelpers.getAdminUid();
    
    const recordId = await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "create",
      [values],
    ]);

    console.log("Record created with ID:", recordId);

    if (customUid && recordId) {
      try {
        const tableName = model.replace(/\./g, '_');
        
        await odooHelpers.updateAuditFields(
          tableName,
          [recordId],
          customUid,
          customUid
        );
        
        console.log(`Successfully updated create_uid and write_uid to ${customUid} for record ${recordId}`);
      } catch (auditError) {
        console.error("Failed to update audit fields:", auditError.message);
        console.log("Record created but audit fields could not be updated.");
      }
    }

    return recordId;
  },

  writeWithCustomUid: async (model, id, values, customWriteUid) => {
    const uid = await odooHelpers.getAdminUid();
    
    const result = await odooRPC("object", "execute_kw", [
      process.env.ODOO_DB,
      uid,
      process.env.ODOO_ADMIN_PASSWORD,
      model,
      "write",
      [[id], values],
    ]);

    console.log("Record updated with ID:", id);

    if (customWriteUid && id) {
      try {
        const tableName = model.replace(/\./g, '_');
        
        await odooHelpers.updateAuditFields(
          tableName,
          [id],
          null, 
          customWriteUid
        );
        
        console.log(`Successfully updated write_uid to ${customWriteUid} for record ${id}`);
      } catch (auditError) {
        console.error("Failed to update write_uid:", auditError.message);
        console.log("Record updated but write_uid could not be updated.");
      }
    }

    return result;
  },

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
