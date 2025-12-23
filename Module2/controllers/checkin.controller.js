const odooService = require("../services/odoo.service");
const moment = require("moment-timezone");
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
exports.apiAttendance = async (req, res) => {
  try {
    console.log(
      "\n================ UNIFIED ATTENDANCE API CALLED ================"
    );
    console.log("🔹 Raw Body:", req.body);

    const parsedBody = parseRequestBody(req.body);
    console.log("🔹 Parsed Body:", parsedBody);

    let { email, Image, Latitude, Longitude, check_in, check_out } = parsedBody;
    if (!Latitude || !Longitude) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Latitude & Longitude are required",
      });
    }

    console.log("📍 Latitude type:", typeof Latitude, "| Value:", Latitude);
    console.log("📍 Longitude type:", typeof Longitude, "| Value:", Longitude);

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

    if (!email) {
      return res.status(400).json({
        success: false,
        statuscode: 400,
        errorMessage: "Email is required",
      });
    }

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
      console.log("✨ Creating NEW check-in record...");

      const createData = {
        employee_id: employee.id,
        check_in: currentTimeUTC,
        location,
        check_in_image: Image || false,
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
      check_out_image: Image || false,
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

exports.apiCheckinCheckout = async (req, res) => {
  try {
    console.log("API CheckIn CheckOut called", req.query);

    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        successMessage: "",
        errorMessage: "Email is required",
      });
    }

    const users = await odooService.searchRead(
      "res.users",
      [["login", "=", email]],
      ["id"],
      1
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        successMessage: "",
        errorMessage: "User not found",
      });
    }

    const user = users[0];

    const employees = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", user.id]],
      ["id", "name"],
      1
    );

    if (!employees.length) {
      return res.status(403).json({
        success: false,
        successMessage: "",
        errorMessage: "Employee record not linked to user",
      });
    }

    const employee = employees[0];
    console.log("Employee found:", employee);

    const attendances = await odooService.searchRead(
      "hr.attendance",
      [["employee_id", "=", employee.id]],
      ["id", "check_in", "check_out"],
      1,
      "check_in desc"
    );

    let status = "";
    let message = "";

    if (attendances.length && !attendances[0].check_out) {
      status = "CheckedIn";
      message = "Employee is currently checked in.";
    } else {
      status = "CheckedOut";
      message = "Employee is currently checked out.";
    }

    return res.status(200).json({
      success: true,
      status: status,
      employee_id: employee.id,
      message: message,
    });
  } catch (err) {
    console.error("🔥 ERROR in apiCheckinCheckout:", err);
    return res.status(500).json({
      success: false,
      errorMessage: err.message,
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
        successMessage: "",
        statuscode: 400,
      });
    }

    console.log("🔍 Searching employee for user_id:", user_id);

    const employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", parseInt(user_id)]],
      ["id", "name"],
      1
    );

    if (!employee.length) {
      return res.status(404).json({
        success: false,
        status: "error",
        errorMessage: `No employee found for user_id: ${user_id}`,
        successMessage: "",
        statuscode: 404,
      });
    }

    const employeeId = employee[0].id;
    console.log("✅ Employee found:", employee[0]);

    let finalDateFrom = date_from;
    let finalDateTo = date_to;

    // Month-Year Filter
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);

      const start = new Date(y, m - 1, 1, 0, 0, 0);
      const end = new Date(y, m, 0, 23, 59, 59);

      finalDateFrom = start.toISOString().slice(0, 19).replace("T", " ");
      finalDateTo = end.toISOString().slice(0, 19).replace("T", " ");

      console.log("📅 Month-Year Filter Applied:", finalDateFrom, finalDateTo);
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
      "status_code"
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

    // 🔥 NEW: If month-year filter applied & no attendance found
    if ((month && year) && totalCount.length === 0) {
      const monthNames = [
        "", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[parseInt(month)];

      return res.status(200).json({
        success: false,
        status: "error",
        errorMessage: `There is no attendance for ${monthName} ${year}`,
        successMessage: "",
        statuscode: 200,
        data: [],
        meta: {
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          employee_name: employee[0].name,
          employee_id: employeeId,
          filter: {
            month: month,
            year: year,
            date_from: finalDateFrom,
            date_to: finalDateTo,
          },
        },
      });
    }

    // Normal success response
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
      successMessage: "",
      statuscode: 500,
    });
  }
};

