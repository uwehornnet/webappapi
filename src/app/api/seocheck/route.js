// app/api/seo-check/route.js
import * as cheerio from "cheerio";

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const targetUrl = searchParams.get("url");

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: "No URL provided" }), { status: 400 });
	}

	const headers = {
		"Access-Control-Allow-Origin": "*", // in Produktion besser nur deine Domain
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};

	try {
		// HTTPS Check
		const isHttps = targetUrl.startsWith("https://");

		// Fetch HTML
		const response = await fetch(targetUrl, {
			headers: { "User-Agent": "Mozilla/5.0 (SEO-Checker Bot)" },
		});
		if (!response.ok) {
			return new Response(JSON.stringify({ error: `Failed to fetch ${targetUrl}` }), { status: response.status });
		}
		const html = await response.text();
		const $ = cheerio.load(html);

		// --- Meta & Title ---
		const title = $("title").text().trim();
		const metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
		const metaRobots = $('meta[name="robots"]').attr("content") || "";
		const canonical = $('link[rel="canonical"]').attr("href") || "";

		const ogTitle = $('meta[property="og:title"]').attr("content") || "";
		const ogDescription = $('meta[property="og:description"]').attr("content") || "";
		const twitterTitle = $('meta[name="twitter:title"]').attr("content") || "";
		const twitterDescription = $('meta[name="twitter:description"]').attr("content") || "";

		const viewport = $('meta[name="viewport"]').attr("content") || "";

		// --- Headings ---
		const headings = [];
		let lastLevel = 0;
		let hierarchyOk = true;
		$("h1, h2, h3, h4, h5, h6").each((_, el) => {
			const tag = el.tagName.toLowerCase();
			const level = parseInt(tag.replace("h", ""), 10);
			const text = $(el).text().trim();

			headings.push({ tag, level, text });

			if (lastLevel && level > lastLevel + 1) hierarchyOk = false;
			lastLevel = level;
		});

		// --- Keywords (aus Title, H1, H2/H3) ---
		const stopwords = [
			"und",
			"oder",
			"der",
			"die",
			"das",
			"the",
			"and",
			"for",
			"mit",
			"auf",
			"von",
			"in",
			"im",
			"ein",
			"eine",
		];
		const cleanText = (text) =>
			text
				.toLowerCase()
				.replace(/[^a-z0-9äöüß\s]/g, "")
				.split(/\s+/)
				.filter((w) => w.length > 2 && !stopwords.includes(w));

		const titleWords = cleanText(title);
		const h1Words = cleanText(
			headings
				.filter((h) => h.tag === "h1")
				.map((h) => h.text)
				.join(" ")
		);
		const h2h3Words = cleanText(
			headings
				.filter((h) => h.tag === "h2" || h.tag === "h3")
				.map((h) => h.text)
				.join(" ")
		);

		const primaryKeywords = Array.from(new Set([...titleWords, ...h1Words]));
		const secondaryKeywords = Array.from(new Set(h2h3Words));

		// Body Text for keyword density
		const bodyText = $("body").text().toLowerCase();
		const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 2).length;

		// Keyword stats (counts in body)
		const keywordStats = {};
		[...primaryKeywords, ...secondaryKeywords].forEach((kw) => {
			const regex = new RegExp(`\\b${kw}\\b`, "g");
			const matches = bodyText.match(regex) || [];
			keywordStats[kw] = {
				count: matches.length,
				density: ((matches.length / wordCount) * 100).toFixed(2) + "%",
				inTitle: title.toLowerCase().includes(kw),
				inH1: h1Words.includes(kw),
				inH2H3: h2h3Words.includes(kw),
				inMetaDescription: metaDescription.toLowerCase().includes(kw),
			};
		});

		// --- Images ---
		const allImgs = $("img");
		const imgsWithoutAlt = allImgs.filter((_, el) => !$(el).attr("alt")).length;
		const imgsWithSrcset = allImgs.filter((_, el) => $(el).attr("srcset")).length;

		const pictureElements = $("picture");
		const picturesWithSource = pictureElements.filter((_, el) => $(el).find("source").length > 0).length;

		const totalImages = allImgs.length;
		const responsiveImagesCount = imgsWithSrcset + picturesWithSource;
		const nonResponsiveImages = totalImages - responsiveImagesCount;

		// --- Links ---
		const baseDomain = new URL(targetUrl).hostname;
		const links = $("a[href]");
		const internalLinks = [];
		const externalLinks = [];
		const badLinkTexts = [];

		links.each((_, el) => {
			const href = $(el).attr("href");
			const text = $(el).text().trim().toLowerCase();

			if (!href) return;

			if (href.startsWith("/") || href.includes(baseDomain)) internalLinks.push(href);
			else externalLinks.push(href);

			if (!text || ["hier klicken", "mehr", "link"].includes(text)) badLinkTexts.push({ href, text });
		});

		// --- Rich Snippets ---
		const jsonLdScripts = $('script[type="application/ld+json"]');
		const richSnippets = [];
		jsonLdScripts.each((_, el) => {
			try {
				const data = JSON.parse($(el).html());
				if (Array.isArray(data)) data.forEach((d) => richSnippets.push(d["@type"] || "unknown"));
				else richSnippets.push(data["@type"] || "unknown");
			} catch {}
		});

		// --- Report ---
		const report = {
			url: targetUrl,
			https: isHttps,
			meta: {
				title,
				titleLength: title.length,
				metaDescription,
				metaDescriptionLength: metaDescription.length,
				metaRobots,
				canonical,
				openGraph: { title: ogTitle, description: ogDescription },
				twitterCard: { title: twitterTitle, description: twitterDescription },
				viewport,
			},
			headings: {
				total: headings.length,
				hierarchyOk,
				list: headings,
			},
			keywords: {
				primaryKeywords,
				secondaryKeywords,
				keywordStats,
				wordCount,
			},
			images: {
				total: totalImages,
				withoutAlt: imgsWithoutAlt,
				responsive: responsiveImagesCount,
				nonResponsive: nonResponsiveImages,
			},
			links: {
				internal: internalLinks.length,
				external: externalLinks.length,
				badLinkTexts,
			},
			richSnippets: Array.from(new Set(richSnippets)),
		};

		return new Response(JSON.stringify(report), {
			status: 200,
			headers,
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: err.message }), { status: 500 });
	}
}
