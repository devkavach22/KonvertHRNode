const odooService = require("../services/odoo.service");
const moment = require("moment-timezone");
const { getClientFromRequest } = require("../services/plan.helper");

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseRequestBody(body) {
  if (body._parts && Array.isArray(body._parts)) {
    const parsedData = {};
    body._parts.forEach(([key, value]) => {
      parsedData[key] = value;
    });
    return parsedData;
  }
  return body;
}

function cleanBase64Image(imageString) {
  if (!imageString) {
    return false;
  }

  try {
    let cleaned = imageString.trim().replace(/\s/g, '');
    if (cleaned.startsWith('data:image')) {
      const base64Index = cleaned.indexOf('base64,');
      if (base64Index !== -1) {
        cleaned = cleaned.substring(base64Index + 7);
      }
    }
    cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');

    if (cleaned.length === 0 || cleaned.length % 4 !== 0) {
      console.warn("⚠️ Invalid base64 length");
      return false;
    }

    return cleaned;
  } catch (error) {
    console.error("🔥 Error cleaning base64:", error);
    return false;
  }
}

exports.apiAttendance = async (req, res) => {
  try {
    const parsedBody = parseRequestBody(req.body);
    let { email, Image, Latitude, Longitude, check_in, check_out, user_id } = parsedBody;
    if (!email) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Email is required",
      });
    }

    if (!Latitude || !Longitude) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Latitude & Longitude are required",
      });
    }
    const lat = parseFloat(Latitude);
    const lon = parseFloat(Longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Invalid Latitude or Longitude format",
      });
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Latitude must be between -90 and 90, Longitude must be between -180 and 180",
      });
    }
    Latitude = lat;
    Longitude = lon;

    const cleanedImage = cleanBase64Image(Image);
    const users = await odooService.searchRead(
      "res.users",
      [["login", "=", email]],
      ["id"],
      1
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        statuscode: 404,
        errorMessage: "User not found",
      });
    }

    const user = users[0];

    if (user_id) {
      const providedUserId = parseInt(user_id);

      if (user.id !== providedUserId) {
        return res.status(403).json({
          success: false,
          statuscode: 403,
          errorMessage: "User ID does not match the provided email",
        });
      }
      try {
        const { client_id } = await getClientFromRequest(req);
      } catch (error) {
        return res.status(error.status || 403).json({
          success: false,
          statuscode: error.status || 403,
          errorMessage: error.message || "Client plan validation failed",
        });
      }
    }
    const employees = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", user.id]],
      ["id", "name"],
      1
    );

    if (!employees.length) {
      return res.status(404).json({
        success: false,
        statuscode: 404,
        errorMessage: "Employee record not found",
      });
    }

    const employee = employees[0];
    const geoConfigs = await odooService.searchRead(
      "geo.config",
      [["hr_employee_ids", "in", [employee.id]]],
      ["id", "latitude", "longitude", "radius_km", "name"]
    );

    if (!geoConfigs.length) {
      return res.status(404).json({
        success: false,
        statuscode: 404,
        errorMessage: "No area defined for this employee",
      });
    }

    let withinGeofence = false;
    let matchedGeo = null;
    let calculatedDistance = null;

    for (let geo of geoConfigs) {
      const distance = haversine(
        parseFloat(Latitude),
        parseFloat(Longitude),
        geo.latitude,
        geo.longitude
      );

      if (distance <= geo.radius_km) {
        withinGeofence = true;
        matchedGeo = geo;
        calculatedDistance = distance;
        break;
      }
    }

    if (!withinGeofence) {
      return res.status(403).json({
        success: false,
        statuscode: 403,
        errorMessage: "You are outside the allowed area.",
      });
    }

    const existingCheckin = await odooService.searchRead(
      "hr.attendance",
      [
        ["employee_id", "=", employee.id],
        ["check_out", "=", false],
      ],
      ["id", "check_in", "checkout_lat", "checkout_lon", "check_out_image"],
      1
    );

    const currentTimeUTC = check_in
      ? moment(check_in).utc().format("YYYY-MM-DD HH:mm:ss")
      : moment().utc().format("YYYY-MM-DD HH:mm:ss");
    const currentTimeIST = check_in
      ? moment(check_in).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
      : moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    const location = `${Longitude}, ${Latitude}`;

    if (!existingCheckin.length) {
      const createData = {
        employee_id: employee.id,
        check_in: currentTimeUTC,
        location,
        check_in_image: cleanedImage,
        checkin_lat: parseFloat(Latitude),
        checkin_lon: parseFloat(Longitude),
        check_out: false,
        check_out_image: false,
      };

      const newRecordId = await odooService.create("hr.attendance", createData);
      await odooService.write("hr.attendance", newRecordId, {
        checkout_lat: false,
        checkout_lon: false,
        check_out_image: false,
      });

      return res.status(200).json({
        success: true,
        statuscode: 200,
        action: "CHECK_IN",
        status: "CheckedIn",
        successMessage: `Check-in successful.`,
        data: {
          check_in_time: currentTimeIST,
          location,
          distance: `${calculatedDistance.toFixed(2)} km`,
          area: matchedGeo.name,
        },
      });
    }

    const attendanceRecord = existingCheckin[0];
    if (attendanceRecord.checkout_lat || attendanceRecord.checkout_lon) {
      console.warn(
        "⚠️ WARNING: Old checkout values detected! These will be overwritten."
      );
      console.warn(
        `Old checkout_lat: ${attendanceRecord.checkout_lat}, checkout_lon: ${attendanceRecord.checkout_lon}`
      );
    }

    const checkoutTimeUTC = check_out
      ? moment(check_out).utc().format("YYYY-MM-DD HH:mm:ss")
      : moment().utc().format("YYYY-MM-DD HH:mm:ss");
    const checkoutTimeIST = check_out
      ? moment(check_out).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
      : moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

    const updateData = {
      check_out: checkoutTimeUTC,
      location,
      check_out_image: cleanedImage,
      checkout_lat: parseFloat(Latitude),
      checkout_lon: parseFloat(Longitude),
    };

    console.log("📝 Update Data:", updateData);
    await odooService.write("hr.attendance", attendanceRecord.id, updateData);

    const checkInMoment = moment.utc(attendanceRecord.check_in);
    const checkOutMoment = moment.utc(checkoutTimeUTC);
    const workedHours = checkOutMoment.diff(checkInMoment, "hours", true);

    return res.status(200).json({
      success: true,
      statuscode: 200,
      action: "CHECK_OUT",
      status: "CheckedOut",
      successMessage: `Check-out successful.`,
      data: {
        check_in_time: moment
          .utc(attendanceRecord.check_in)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss"),
        check_out_time: checkoutTimeIST,
        worked_hours: `${workedHours.toFixed(2)} hours`,
        location,
        distance: `${calculatedDistance.toFixed(2)} km`,
        area: matchedGeo.name,
      },
    });
  } catch (err) {
    console.error("🔥 ERROR in apiAttendance:", err);
    return res.status(500).json({
      success: false,
      statuscode: 500,
      errorMessage: "Something went wrong....",
    });
  }
};
exports.getAllAttendancesMobile = async (req, res) => {
  try {
    const {
      user_id,
      date_from,
      date_to,
      month,
      year,
      limit = 100,
      offset = 0,
    } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        status: "error",
        errorMessage: "user_id is required",
        statuscode: 400,
      });
    }

    console.log("🔍 Searching user in res.users:", user_id);
    const users = await odooService.searchRead(
      "res.users",
      [["id", "=", parseInt(user_id)]],
      ["id", "name", "login", "partner_id"],
      1
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: `User not found for user_id: ${user_id}`,
        statuscode: 404,
      });
    }

    const user = users[0];
    console.log("👤 Odoo User Found:", user);

    const employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", user.id]],
      ["id", "name"],
      1
    );

    if (!employee.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: `Employee not found for user_id: ${user_id}`,
        statuscode: 404,
      });
    }

    const employeeId = employee[0].id;
    let finalDateFrom = date_from;
    let finalDateTo = date_to;

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);

      const start = new Date(y, m - 1, 1, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59);

      finalDateFrom = start.toISOString().slice(0, 19).replace("T", " ");
      finalDateTo = end.toISOString().slice(0, 19).replace("T", " ");

      console.log("📅 Month-Year Filter:", finalDateFrom, finalDateTo);
    }

    let domain = [["employee_id", "=", employeeId]];

    if (finalDateFrom) domain.push(["check_in", ">=", finalDateFrom]);
    if (finalDateTo) domain.push(["check_in", "<=", finalDateTo]);
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
      "status_code",
      "check_in_image",
      "check_out_image"
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

    if ((month && year) && totalCount.length === 0) {
      const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      return res.status(200).json({
        success: false,
        status: "error",
        errorMessage: `There is no attendance for ${monthNames[month]} ${year}`,
        statuscode: 200,
        data: [],
        meta: {
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          employee_name: employee[0].name,
          employee_id: employeeId,
          filter: {
            month,
            year,
            date_from: finalDateFrom,
            date_to: finalDateTo,
          },
        },
      });
    }

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
        filter: {
          month: month || null,
          year: year || null,
          date_from: finalDateFrom || null,
          date_to: finalDateTo || null,
        },
      },
    });

  } catch (error) {
    console.error("🔥 Error fetching attendances:", error);
    return res.status(500).json({
      success: false,
      status: "error",
      errorMessage: error.message || "Failed to fetch attendances",
      statuscode: 500,
    });
  }
};

exports.apiCheckinCheckout = async (req, res) => {
  try {
    console.log("..API CheckIn CheckOut called Status ...", req.query);
    const { email } = req.query;
    
    if (!email) {
      const response = {
        success: false,
        errorMessage: "Email is required",
      };
      console.log("Response (400):", response);
      return res.status(400).json(response);
    }

    const users = await odooService.searchRead(
      "res.users",
      [["login", "=", email]],
      ["id"],
      1
    );

    if (!users.length) {
      const response = {
        success: false,
        errorMessage: "User not found",
      };
      console.log("Response (404):", response);
      return res.status(404).json(response);
    }

    const user = users[0];
    const employees = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", user.id]],
      ["id", "name"],
      1
    );

    if (!employees.length) {
      const response = {
        success: false,
        errorMessage: "Employee record not linked to user",
      };
      console.log("Response (403):", response);
      return res.status(403).json(response);
    }

    const employee = employees[0];
    const attendances = await odooService.searchRead(
      "hr.attendance",
      [["employee_id", "=", employee.id]],
      [
        "id",
        "check_in",
        "check_out",
        "check_in_image",
        "check_out_image"
      ],
      1
    );

    // Helper function to convert Odoo datetime to local timezone
    const convertToLocalTime = (odooDateTime) => {
      if (!odooDateTime) return null;
      
      // Odoo stores datetime in UTC, convert to IST (Asia/Kolkata)
      return moment.utc(odooDateTime, "YYYY-MM-DD HH:mm:ss")
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD HH:mm:ss");
    };

    let status = "";
    let message = "";
    let action_time = null;
    let action_image = null;

    if (attendances.length && !attendances[0].check_out) {
      status = "CheckedIn";
      message = "Employee is currently checked in.";
      action_time = convertToLocalTime(attendances[0].check_in);
      action_image = attendances[0].check_in_image;
    } else {
      status = "CheckedOut";
      message = "Employee is currently checked out.";
      action_time = attendances.length ? convertToLocalTime(attendances[0].check_out) : null;
      action_image = attendances.length ? attendances[0].check_out_image : null;
    }

    const response = {
      success: true,
      status,
      employee_id: employee.id,
      message,
      action_time,
      action_image
    };
        return res.status(200).json(response);
    
  } catch (err) {
    const response = {
      success: false,
      errorMessage: err.message,
    };
    console.log("Response (500):", response);
    return res.status(500).json(response);
  }
};