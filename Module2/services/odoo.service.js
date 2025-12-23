const xmlrpc = require("xmlrpc");
class OdooService {
  constructor() {
    this.url = process.env.ODOO_URL;
    this.db = process.env.ODOO_DB;
    this.username = process.env.ODOO_ADMIN;
    this.password = process.env.ODOO_ADMIN_PASSWORD;
    this.uid = null;
    this.protocol = new URL(this.url).protocol;
    console.log(this.username);
    console.log(this.password);
  }
  createClient(path) {
    const urlObj = new URL(this.url);
    const clientConfig = {
      host: urlObj.hostname,
      port: urlObj.port || (this.protocol === "https:" ? 443 : 80),
      path: path,
      allowNone: true,
    };
    if (this.protocol === "https:") {
      return xmlrpc.createSecureClient(clientConfig);
    } else {
      return xmlrpc.createClient(clientConfig);
    }
  }
  async authenticate() {
    if (this.uid) return this.uid;
    const commonClient = this.createClient("/xmlrpc/2/common");
    return new Promise((resolve, reject) => {
      commonClient.methodCall(
        "authenticate",
        [this.db, this.username, this.password, {}],
        (error, uid) => {
          if (error) reject(error);
          else {
            this.uid = uid;
            resolve(uid);
          }
        }
      );
    });
  }
  async execute(model, method, args = [], kwargs = {}, userId = null, userPassword = null) {
    await this.authenticate();
    
    const effectiveUid = userId || this.uid;
    const effectivePassword = userPassword || this.password;
    
    // console.log("🔹 Executing with UID:", effectiveUid);
    
    const objectClient = this.createClient("/xmlrpc/2/object");
    return new Promise((resolve, reject) => {
      objectClient.methodCall(
        "execute_kw",
        [this.db, effectiveUid, effectivePassword, model, method, args, kwargs],
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });
  }

  async search(model, domain = [], fields = [], limit = 0) {
    const ids = await this.execute(model, "search", [domain], { limit });
    if (ids.length === 0) return [];
    return await this.execute(model, "read", [ids, fields]);
  }

  async searchRead(model, domain = [], fields = [], limit = 0) {
    return await this.execute(model, "search_read", [domain], {
      fields,
      limit,
    });
  }
  async create(model, values, options = {}) {
    const { uid = null, userPassword = null, context = {} } = options;
    
    console.log("🔹 OdooService.create called with UID:", uid || this.uid);
    
    return await this.execute(
      model,
      "create",
      [values],
      { context },
      uid,
      userPassword 
    );
  }

  async write(model, ids, values, userId = null, userPassword = null) {
    return await this.execute(model, "write", [ids, values], {}, userId, userPassword);
  }

  async unlink(model, ids, userId = null, userPassword = null) {
    return await this.execute(model, "unlink", [ids], {}, userId, userPassword);
  }

  async callMethod(model, method, recordIds = [], context = {}, userId = null, userPassword = null) {
    return await this.execute(
      model,
      method,
      [recordIds],
      { context },
      userId,
      userPassword
    );
  }
}

module.exports = new OdooService();







