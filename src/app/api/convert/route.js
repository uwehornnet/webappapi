const fs = require("fs");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify");

const OUTPUT_HEADERS = [
	"Title",
	"Body (HTML)",
	"URL handle",
	"Vendor",
	"Product Category",
	"Type",
	"Tags",
	"Published",
	"Option1 Name",
	"Option1 Value",
	"Option2 Name",
	"Option2 Value",
	"Option3 Name",
	"Option3 Value",
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
	"Image Position",
	"Image Alt Text",
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

const createRow = ({ handle, record }) => {
	let row = [];
	OUTPUT_HEADERS.forEach((header) => {
		if (header in record) {
			row.push(`"${record[header]}"`);
		} else {
			if (header === "Variant Inventory Tracker") {
				row.push('"shopify"');
			} else if (header === "Variant Fulfillment Service") {
				row.push('"manual"');
			} else if (header === "Variant Inventory Policy") {
				row.push('"deny"');
			} else if (header === "Status") {
				row.push('"draft"');
			} else if (header === "URL handle") {
				row.push(`"${handle}"`);
			} else {
				row.push('""');
			}
		}
	});
	return row.join(",");
};

const createURLHandle = (title) => {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
};

const cleanTitle = (title) => {
	return title.split(/\s*[^a-zA-Z0-9äöüÄÖÜß\s].*$/)[0].trim();
};

export const POST = async (request) => {
	try {
		const json = await request.json();

		const records = json.records;
		const headers = json.headers;

		const mappedRecords = records.map((record) => {
			const mappedRecord = {};
			for (const header of headers) {
				if (header.mapping === "") {
					continue; // Skip if no mapping is set
				}

				if (mappedRecord[header.mapping]) {
					// If the mapping already exists, append next string comma separated
					mappedRecord[header.mapping] += `,${record[header.header]}`;
				} else {
					if (header.mapping.toLowerCase().includes("title")) {
						mappedRecord[header.mapping] = cleanTitle(record[header.header]);
					} else {
						mappedRecord[header.mapping] = record[header.header];
					}
				}
			}
			return mappedRecord;
		});

		const grouped_by_title = [];
		mappedRecords.forEach((record) => {
			const title = record["Title"];
			if (!grouped_by_title[title]) {
				grouped_by_title[title] = {
					...record,
					variants: [],
				};
			} else {
				grouped_by_title[title].variants.push(record);
			}
		});

		let csv = OUTPUT_HEADERS.join(",") + "\n";
		Object.values(grouped_by_title).forEach((record) => {
			const variants = record.variants || [];
			const title = cleanTitle(record["Title"]);
			const handle = createURLHandle(title);
			const images = record["Image Src"]
				? record["Image Src"]
						.split(",")
						.map((img) => img.trim())
						.filter(Boolean)
				: [];
			if (variants.length > 0) {
				const grouped_variants = [];
				variants.forEach((variant, index) => {
					const key = variant["Variant Key"];

					if (!grouped_variants[key]) {
						grouped_variants[key] = [];
					}
					const variantResponse = {
						"Variant Name": key,
						"Variant Value": variant["Variant Value"],
						"Variant SKU": variant["Variant SKU"],
						"Variant Price": variant["Variant Price"],
					};
					grouped_variants[key].push(variantResponse);
				});

				Object.values(grouped_variants).forEach((variantGroup, idx) => {
					const optionKeys = variantGroup[0]["Variant Name"].split(",").filter(Boolean);
					const optionValues = variantGroup[0]["Variant Value"].split(",").filter(Boolean);

					const firstVariantRow = {
						...record,
						Title: title,
						"Variant SKU": variantGroup[0]["Variant SKU"],
						"Variant Price": variantGroup[0]["Variant Price"],
					};

					optionKeys.forEach((key, i) => {
						firstVariantRow[`Option${i + 1} Name`] = key;
						firstVariantRow[`Option${i + 1} Value`] = optionValues[i] || "";
					});

					if (images.length > 0) {
						firstVariantRow["Image Src"] = images[0];
						firstVariantRow["Image Position"] = 1;
						firstVariantRow["Image Alt Text"] = `${title} - Bild 1`;
					}

					csv += createRow({ handle: handle, record: firstVariantRow }) + "\n";

					variantGroup.forEach((variant, i) => {
						if (i === 0) return; // Skip the first variant as it's already included in the main row

						const optionKeys = variant["Variant Name"].split(",").filter(Boolean);
						const optionValues = variant["Variant Value"].split(",").filter(Boolean);

						const variantRow = {
							"Variant SKU": variant["Variant SKU"],
							"Variant Price": variant["Variant Price"],
						};
						optionKeys.forEach((key, j) => {
							variantRow[`Option${j + 1} Name`] = i == 0 ? key : "";
							variantRow[`Option${j + 1} Value`] = optionValues[j] || "";
						});

						csv += createRow({ handle: handle, record: variantRow }) + "\n";
					});

					if (images.length > 0) {
						images.forEach((image, index) => {
							if (index === 0) return; // Skip the first image as it's already included in the main row
							csv +=
								createRow({
									handle: handle,
									record: {
										"Image Src": image,
										"Image Position": index + 1,
										"Image Alt Text": `${title} - Bild ${index + 1}`,
									},
								}) + "\n";
						});
					}
				});
			} else {
				if (images.length > 0) {
					record["Image Src"] = images[0];
					record["Image Position"] = 1;
					record["Image Alt Text"] = `${title} - Bild 1`;
				}
				csv += createRow({ handle: handle, record: record }) + "\n";

				if (images.length > 0) {
					images.forEach((image, index) => {
						if (index === 0) return; // Skip the first image as it's already included in the main row
						csv +=
							createRow({
								handle: handle,
								record: {
									"Image Src": image,
									"Image Position": index + 1,
									"Image Alt Text": `${title} - Bild ${index + 1}`,
								},
							}) + "\n";
					});
				}
			}
		});

		return new Response(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
			},
		});
	} catch (error) {
		console.error("Error processing CSV:", error);
		return new Response(JSON.stringify({ error: "Fehler beim Verarbeiten der CSV-Datei." }), {
			status: 500,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
		});
	}
};
