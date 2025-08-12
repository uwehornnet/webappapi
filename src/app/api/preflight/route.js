const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify");

// Output headers
const OUTPUT_HEADERS = [
	"Title",
	"Body (HTML)",
	"Vendor",
	"Product Category",
	"Type",
	"Tags",
	"Published",
	"Variant Key",
	"Variant Value",
	"Variant SKU",
	"Variant Weight",
	"Variant Weight Unit",
	"Variant Inventory Tracker",
	"Variant Inventory Qty",
	"Variant Inventory Policy",
	"Variant Fulfillment Service",
	"Variant Price",
	"Variant Compare At Price",
	"Variant Requires Shipping",
	"Variant Taxable",
	"Variant Barcode",
	"Image Src",
	"SEO Title",
	"SEO Description",
	"Google Shopping / Google Product Category",
	"Google Shopping / Gender",
	"Google Shopping / Age Group",
	"Google Shopping / MPN",
	"Google Shopping / Condition",
	"Google Shopping / Custom Product",
	"Google Shopping / Custom Label 0",
	"Google Shopping / Custom Label 1",
	"Google Shopping / Custom Label 2",
	"Google Shopping / Custom Label 3",
	"Google Shopping / Custom Label 4",
	"Status",
];

const sanitizeCSV = (csvText) => {
	const lines = csvText.split(/\r?\n/);
	const fixedLines = lines.map((line) => {
		let insideQuotes = false;
		let field = "";
		let fields = [];

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				// Quote toggle (nur wenn kein Escape-Zeichen davor)
				insideQuotes = !insideQuotes;
				field += char;
			} else if (char === "," && !insideQuotes) {
				// Feldende erkannt
				fields.push(field);
				field = "";
			} else {
				field += char;
			}
		}
		fields.push(field);

		// Jetzt Felder bereinigen
		const safeFields = fields.map((f) => {
			const needsQuoting = f.includes(",") || f.includes('"');
			let content = f;

			// Doppelte Leerzeichen am Rand entfernen
			content = content.trim();

			// Falls Quotes drin → korrekt escapen
			if (content.includes('"')) {
				content = content.replace(/"/g, '""');
			}

			// Falls Komma oder Quotes drin, aber nicht gequotet → quotes setzen
			if (needsQuoting && !(content.startsWith('"') && content.endsWith('"'))) {
				content = `"${content}"`;
			}

			return content;
		});

		return safeFields.join(",");
	});

	return fixedLines.join("\n");
};

export const POST = async (request) => {
	const formData = await request.formData();
	if (!formData.has("file")) {
		return Response.json({ error: "Keine Datei hochgeladen." }, { status: 400 });
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return Response.json({ error: "Ungültige Datei." }, { status: 400 });
	}

	const csv_data = await file.text();
	const csv_data_clean = sanitizeCSV(csv_data);

	const headerRow = parse(csv_data, {
		skip_empty_lines: true,
		to_line: 1, // nur die erste Zeile parsen
		relax_column_count: true,
	});
	const csv_headers = headerRow.length > 0 ? headerRow[0].map((h) => String(h).trim()) : [];

	const records = parse(csv_data, {
		skip_empty_lines: true,
		from_line: 2, // ab der zweiten Zeile (erste Zeile sind die Header)
		columns: csv_headers,
		delimiter: ",",
		quote: '"',
		escape: '"',
		relax_column_count: true,
		relax_quotes: true,
	});

	const response = {
		output_headers: [...OUTPUT_HEADERS],
		csv_headers: csv_headers,
		records: records,
	};

	return Response.json(
		{
			message: "Datei erfolgreich verarbeitet.",
			headers: response,
		},
		{ status: 200 }
	);
};
