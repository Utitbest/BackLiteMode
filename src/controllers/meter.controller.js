import Meter from "../models/Meter.js";
import Reading from "../models/Reading.js";
import Tariff from "../models/Tariff.js";
import Expense from "../models/Expense.js";


const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

function scopeFilter(user) {
  return SUPER_ADMIN_ROLES.includes(user.role) ? {} : { site: user.site };
}

export function getMeters(req, res, next) {
  const filter = { ...scopeFilter(req.user) };
  if (req.query.type) filter.type = req.query.type;

  Meter.find(filter)
    .populate("tenant", "fullName")
    .sort({ createdAt: -1 })
    .then((meters) => {
      return Reading.aggregate([
        { $match: { meter: { $in: meters.map((m) => m._id) } } },
        { $sort: { readingDate: -1 } },
        {
          $group: {
            _id: "$meter",
            readingCount: { $sum: 1 },
            lastValue: { $first: "$value" },
            lastReadingDate: { $first: "$readingDate" },
          },
        },
      ]).then((stats) => {
        const statsMap = new Map(stats.map((s) => [s._id.toString(), s]));
        const withStats = meters.map((meter) => {
          const stat = statsMap.get(meter._id.toString());
          return {
            ...meter.toObject(),
            readingCount: stat?.readingCount || 0,
            lastValue: stat?.lastValue ?? meter.initialReading,
            lastReadingDate: stat?.lastReadingDate || null,
          };
        });
        res.status(200).json({ success: true, data: withStats });
      });
    })
    .catch(next);
}

export function createMeter(req, res, next) {
  const { meterNumber, type, tenant, spaceArea, location, initialReading, notes, siteId } = req.body;
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(req.user.role);
  const site = isSuperAdmin ? siteId : req.user.site;

  if (!site) {
    const error = new Error(isSuperAdmin ? "Please select a site" : "You are not assigned to a site");
    error.statusCode = 400;
    return next(error);
  }

  Meter.create({
    meterNumber,
    type,
    tenant,
    spaceArea,
    location,
    initialReading: initialReading || 0,
    notes,
    site,
    createdBy: req.user._id,
  })
    .then((meter) => res.status(201).json({ success: true, data: meter }))
    .catch(next);
}

export function getMeterById(req, res, next) {
  Meter.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .populate("tenant", "fullName")
    .then((meter) => {
      if (!meter) {
        const error = new Error("Meter not found");
        error.statusCode = 404;
        throw error;
      }

      return Reading.find({ meter: meter._id })
        .sort({ readingDate: -1 })
        .then((readings) => {
          res.status(200).json({ success: true, data: { meter, readings } });
        });
    })
    .catch(next);
}

export function recordReading(req, res, next) {
  const { readingDate, value, comment } = req.body;
  let meterRef;
  let readingRef;

  Meter.findOne({ _id: req.params.id, ...scopeFilter(req.user) })
    .then((meter) => {
      if (!meter) {
        const error = new Error("Meter not found");
        error.statusCode = 404;
        throw error;
      }
      meterRef = meter;
      return Promise.all([
        Reading.findOne({ meter: meter._id }).sort({ readingDate: -1 }),
        Tariff.findOne({ site: meter.site }),
      ]);
    })
    .then(([lastReading, tariff]) => {
      const previousValue = lastReading ? lastReading.value : meterRef.initialReading;
      const numericValue = Number(value);
      const consumption = numericValue - previousValue;

      if (consumption < 0) {
        const error = new Error(
          `New reading (${numericValue}) can't be lower than the previous reading (${previousValue})`
        );
        error.statusCode = 400;
        throw error;
      }

      const energyRate = tariff?.energyRate || 0;
      const waterRate = tariff?.waterRate || 0;
      const rateApplied = meterRef.type === "energy" ? energyRate : waterRate;
      const spaceAreaApplied = meterRef.type === "energy" ? meterRef.spaceArea : null;
      const amount =
        meterRef.type === "energy"
          ? consumption * rateApplied * meterRef.spaceArea
          : consumption * rateApplied;

      return Reading.create({
        meter: meterRef._id,
        readingDate,
        value: numericValue,
        previousValue,
        consumption,
        rateApplied,
        spaceAreaApplied,
        amount,
        comment,
        createdBy: req.user._id,
      });
    })
    .then((reading) => {
      readingRef = reading;
      const unitLabel = meterRef.type === "energy" ? "kWh" : "m³";
      const description = `${meterRef.type === "energy" ? "Energy" : "Water"} consumption — Meter ${meterRef.meterNumber} (${reading.consumption} ${unitLabel}${reading.spaceAreaApplied ? ` × ${reading.spaceAreaApplied}m²` : ""})`;

      return Expense.create({
        tenant: meterRef.tenant,
        description,
        category: "Utilities",
        amount: reading.amount,
        status: "pending",
        date: reading.readingDate,
        autoGenerated: true,
        note: `Auto-generated from utility reading on ${new Date(reading.readingDate).toISOString().slice(0, 10)}`,
        createdBy: req.user._id,
      });
    })
    .then((expense) => {
      readingRef.billed = true;
      readingRef.billedAt = new Date();
      readingRef.expense = expense._id;
      return readingRef.save();
    })
    .then((reading) => res.status(201).json({ success: true, data: reading }))
    .catch(next);
}

export function getDashboardStats(req, res, next) {
  const filter = { ...scopeFilter(req.user) };
  if (req.query.type) filter.type = req.query.type;

  Meter.find(filter)
    .then((meters) => {
      const meterIds = meters.map((m) => m._id);
      return Reading.find({ meter: { $in: meterIds } })
        .sort({ readingDate: 1 })
        .then((readings) => {
          const totalConsumed = readings.reduce((sum, r) => sum + r.consumption, 0);
          const billed = readings.filter((r) => r.billed).reduce((sum, r) => sum + r.amount, 0);
          const unbilled = readings.filter((r) => !r.billed).reduce((sum, r) => sum + r.amount, 0);

          const trend = readings.map((r) => ({
            date: r.readingDate,
            consumption: r.consumption,
          }));

          res.status(200).json({
            success: true,
            data: {
              totalMeters: meters.length,
              activeMeters: meters.filter((m) => m.status === "active").length,
              totalReadings: readings.length,
              totalConsumed,
              billed,
              unbilled,
              trend,
            },
          });
        });
    })
    .catch(next);
}


export function getTenantsUtilitySummary(req, res, next) {
  Meter.find(scopeFilter(req.user))
    .populate("tenant", "fullName company")
    .then((meters) => {
      const meterIds = meters.map((m) => m._id);
      return Reading.find({ meter: { $in: meterIds } }).then((readings) => {
        const readingsByMeter = new Map();
        readings.forEach((r) => {
          const key = r.meter.toString();
          if (!readingsByMeter.has(key)) readingsByMeter.set(key, []);
          readingsByMeter.get(key).push(r);
        });

        const tenantMap = new Map();
        meters.forEach((meter) => {
          const tenantId = meter.tenant._id.toString();
          if (!tenantMap.has(tenantId)) {
            tenantMap.set(tenantId, {
              tenant: meter.tenant,
              energyMeters: 0,
              waterMeters: 0,
              billed: 0,
              unbilled: 0,
            });
          }
          const entry = tenantMap.get(tenantId);
          if (meter.type === "energy") entry.energyMeters += 1;
          else entry.waterMeters += 1;

          const meterReadings = readingsByMeter.get(meter._id.toString()) || [];
          meterReadings.forEach((r) => {
            if (r.billed) entry.billed += r.amount;
            else entry.unbilled += r.amount;
          });
        });

        res.status(200).json({ success: true, data: Array.from(tenantMap.values()) });
      });
    })
    .catch(next);
}

export function getTenantUtilityHistory(req, res, next) {
  Meter.find({ tenant: req.params.tenantId, ...scopeFilter(req.user) })
    .then((meters) => {
      const meterIds = meters.map((m) => m._id);
      return Reading.find({ meter: { $in: meterIds } })
        .populate("meter", "meterNumber type spaceArea")
        .sort({ readingDate: -1 })
        .then((readings) => {
          const energyUsed = readings
            .filter((r) => r.meter.type === "energy")
            .reduce((sum, r) => sum + r.consumption, 0);
          const waterUsed = readings
            .filter((r) => r.meter.type === "water")
            .reduce((sum, r) => sum + r.consumption, 0);
          const totalBilled = readings.filter((r) => r.billed).reduce((sum, r) => sum + r.amount, 0);
          const totalUnbilled = readings.filter((r) => !r.billed).reduce((sum, r) => sum + r.amount, 0);

          res.status(200).json({
            success: true,
            data: { readings, energyUsed, waterUsed, totalBilled, totalUnbilled },
          });
        });
    })
    .catch(next);
}
export function editReading(req, res, next) {
  const { readingDate, value, comment } = req.body;

  Reading.findOne({ _id: req.params.readingId, meter: req.params.id })
    .then((reading) => {
      if (!reading) {
        const error = new Error("Reading not found");
        error.statusCode = 404;
        throw error;
      }

      return Reading.findOne({ meter: req.params.id }).sort({ readingDate: -1 }).then((latest) => {
        if (!latest || latest._id.toString() !== reading._id.toString()) {
          const error = new Error(
            "Only the most recent reading can be edited. Editing an older reading would affect every reading after it."
          );
          error.statusCode = 400;
          throw error;
        }
        return reading;
      });
    })
    .then((reading) => {
      const numericValue = Number(value);
      const consumption = numericValue - reading.previousValue;

      if (consumption < 0) {
        const error = new Error(
          `New reading (${numericValue}) can't be lower than the previous reading (${reading.previousValue})`
        );
        error.statusCode = 400;
        throw error;
      }

      // Recompute using the SAME rate/area that was originally applied — not the current tariff,
      // so editing a typo doesn't accidentally reprice the bill against today's rates
      const amount =
        reading.spaceAreaApplied != null
          ? consumption * reading.rateApplied * reading.spaceAreaApplied
          : consumption * reading.rateApplied;

      reading.value = numericValue;
      reading.consumption = consumption;
      reading.amount = amount;
      if (readingDate) reading.readingDate = readingDate;
      if (comment !== undefined) reading.comment = comment;

      return reading.save();
    })
    .then((reading) => {
      if (!reading.expense) return reading;

      return Expense.findById(reading.expense).then((expense) => {
        if (expense) {
          expense.amount = reading.amount;
          expense.date = reading.readingDate;
          return expense.save().then(() => reading);
        }
        return reading;
      });
    })
    .then((reading) => res.status(200).json({ success: true, data: reading }))
    .catch(next);
}