import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } from "docx";
import Reading from "../models/Reading.js";

const SUPER_ADMIN_ROLES = ["SUPER_ADMIN_1", "SUPER_ADMIN_2"];

async function loadReadings(readingIds, user) {
  const readings = await Reading.find({ _id: { $in: readingIds } }).populate({
    path: "meter",
    populate: { path: "tenant", select: "fullName company" },
  });

  if (readings.length === 0) {
    const error = new Error("No readings found");
    error.statusCode = 404;
    throw error;
  }

  const scoped = SUPER_ADMIN_ROLES.includes(user.role)
    ? readings
    : readings.filter((r) => r.meter.site.toString() === user.site?.toString());

  if (scoped.length === 0) {
    const error = new Error("Not authorized to access these readings");
    error.statusCode = 403;
    throw error;
  }

  return scoped;
}

export async function generateInvoice(req, res, next) {
  try {
    const { readingIds, format, docType } = req.body;

    if (!readingIds || readingIds.length === 0) {
      const error = new Error("Select at least one reading");
      error.statusCode = 400;
      throw error;
    }

    const readings = await loadReadings(readingIds, req.user);
    const tenant = readings[0].meter.tenant;
    const totalAmount = readings.reduce((sum, r) => sum + r.amount, 0);
    const title = docType === "receipt" ? "Receipt" : "Invoice";
    const safeName = tenant.fullName.replace(/[^a-z0-9]+/gi, "-");

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${title}-${safeName}.pdf"`);

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).text("Kaplan Servo");
      doc.fontSize(14).text(title).moveDown();
      doc.fontSize(11).text(`Tenant: ${tenant.fullName}`);
      if (tenant.company) doc.text(`Company: ${tenant.company}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`).moveDown();
      doc.fontSize(12).text("Utility Charges", { underline: true }).moveDown(0.5);

      readings.forEach((r) => {
        const unit = r.meter.type === "energy" ? "kWh" : "m³";
        doc
          .fontSize(10)
          .text(
            `${r.meter.meterNumber} (${r.meter.type}) — ${new Date(r.readingDate).toLocaleDateString()} — ${r.consumption} ${unit} consumed — NGN ${r.amount.toLocaleString()}`
          );
      });

      doc.moveDown().fontSize(13).text(`Total: NGN ${totalAmount.toLocaleString()}`, { align: "right" });
      doc.end();
      return;
    }

    if (format === "xlsx") {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${title}-${safeName}.xlsx"`);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(title);

      sheet.addRow(["Kaplan Servo", title]);
      sheet.addRow(["Tenant", tenant.fullName]);
      sheet.addRow(["Date", new Date().toLocaleDateString()]);
      sheet.addRow([]);
      sheet.addRow(["Meter", "Type", "Reading Date", "Consumption", "Unit", "Amount (NGN)"]);

      readings.forEach((r) => {
        const unit = r.meter.type === "energy" ? "kWh" : "m³";
        sheet.addRow([
          r.meter.meterNumber,
          r.meter.type,
          new Date(r.readingDate).toLocaleDateString(),
          r.consumption,
          unit,
          r.amount,
        ]);
      });

      sheet.addRow([]);
      sheet.addRow(["", "", "", "", "Total", totalAmount]);

      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    if (format === "docx") {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${title}-${safeName}.docx"`);

      const rows = [
        new TableRow({
          children: ["Meter", "Type", "Date", "Consumption", "Amount (NGN)"].map(
            (text) =>
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })
          ),
        }),
        ...readings.map((r) => {
          const unit = r.meter.type === "energy" ? "kWh" : "m³";
          return new TableRow({
            children: [
              r.meter.meterNumber,
              r.meter.type,
              new Date(r.readingDate).toLocaleDateString(),
              `${r.consumption} ${unit}`,
              r.amount.toLocaleString(),
            ].map((text) => new TableCell({ children: [new Paragraph(String(text))] })),
          });
        }),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: "Kaplan Servo", heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ text: title, heading: HeadingLevel.HEADING_2 }),
              new Paragraph(`Tenant: ${tenant.fullName}`),
              new Paragraph(`Date: ${new Date().toLocaleDateString()}`),
              new Paragraph(""),
              new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
              new Paragraph(""),
              new Paragraph({ text: `Total: NGN ${totalAmount.toLocaleString()}` }),
            ],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);
      res.send(buffer);
      return;
    }

    const error = new Error("Invalid format — must be pdf, xlsx, or docx");
    error.statusCode = 400;
    throw error;
  } catch (err) {
    next(err);
  }
}