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
			// Deutsch
			"aber",
			"alle",
			"allem",
			"allen",
			"aller",
			"alles",
			"als",
			"also",
			"am",
			"an",
			"ander",
			"andere",
			"anderem",
			"anderen",
			"anderer",
			"anderes",
			"anderm",
			"andern",
			"anderr",
			"anders",
			"auch",
			"auf",
			"aus",
			"bei",
			"bin",
			"bis",
			"bist",
			"da",
			"damit",
			"dann",
			"der",
			"den",
			"des",
			"dem",
			"die",
			"das",
			"daß",
			"derselbe",
			"derselben",
			"denselben",
			"desselben",
			"demselben",
			"dieselbe",
			"dieselben",
			"dasselbe",
			"dazu",
			"dein",
			"deine",
			"deinem",
			"deinen",
			"deiner",
			"deines",
			"denn",
			"derer",
			"dessen",
			"dich",
			"dir",
			"du",
			"dies",
			"diese",
			"diesem",
			"diesen",
			"dieser",
			"dieses",
			"doch",
			"dort",
			"durch",
			"ein",
			"eine",
			"einem",
			"einen",
			"einer",
			"eines",
			"einig",
			"einige",
			"einigem",
			"einigen",
			"einiger",
			"einiges",
			"einmal",
			"er",
			"ihn",
			"ihm",
			"es",
			"etwas",
			"euer",
			"eure",
			"eurem",
			"euren",
			"eurer",
			"eures",
			"für",
			"gegen",
			"gewesen",
			"hab",
			"habe",
			"haben",
			"hat",
			"hatte",
			"hatten",
			"hier",
			"hin",
			"hinter",
			"ich",
			"mich",
			"mir",
			"ihr",
			"ihre",
			"ihrem",
			"ihren",
			"ihrer",
			"ihres",
			"euch",
			"im",
			"in",
			"indem",
			"ins",
			"ist",
			"jede",
			"jedem",
			"jeden",
			"jeder",
			"jedes",
			"jene",
			"jenem",
			"jenen",
			"jener",
			"jenes",
			"jetzt",
			"kann",
			"kein",
			"keine",
			"keinem",
			"keinen",
			"keiner",
			"keines",
			"können",
			"könnte",
			"machen",
			"man",
			"manche",
			"manchem",
			"manchen",
			"mancher",
			"manches",
			"mein",
			"meine",
			"meinem",
			"meinen",
			"meiner",
			"meines",
			"mit",
			"muss",
			"musste",
			"nach",
			"nicht",
			"nichts",
			"noch",
			"nun",
			"nur",
			"ob",
			"oder",
			"ohne",
			"sehr",
			"sein",
			"seine",
			"seinem",
			"seinen",
			"seiner",
			"seines",
			"selbst",
			"sich",
			"sie",
			"ihnen",
			"sind",
			"so",
			"solche",
			"solchem",
			"solchen",
			"solcher",
			"solches",
			"soll",
			"sollte",
			"sondern",
			"sonst",
			"über",
			"um",
			"und",
			"uns",
			"unsere",
			"unserem",
			"unseren",
			"unserer",
			"unseres",
			"unter",
			"viel",
			"vom",
			"von",
			"vor",
			"während",
			"war",
			"waren",
			"warst",
			"was",
			"weg",
			"weil",
			"weiter",
			"welche",
			"welchem",
			"welchen",
			"welcher",
			"welches",
			"wenn",
			"werde",
			"werden",
			"wie",
			"wieder",
			"will",
			"wir",
			"wird",
			"wirst",
			"wo",
			"wollen",
			"wollte",
			"würde",
			"würden",
			"zu",
			"zum",
			"zur",
			"zwar",
			"zwischen",

			// Englisch
			"a",
			"about",
			"above",
			"after",
			"again",
			"against",
			"all",
			"am",
			"an",
			"and",
			"any",
			"are",
			"aren't",
			"as",
			"at",
			"be",
			"because",
			"been",
			"before",
			"being",
			"below",
			"between",
			"both",
			"but",
			"by",
			"can't",
			"cannot",
			"could",
			"couldn't",
			"did",
			"didn't",
			"do",
			"does",
			"doesn't",
			"doing",
			"don't",
			"down",
			"during",
			"each",
			"few",
			"for",
			"from",
			"further",
			"had",
			"hadn't",
			"has",
			"hasn't",
			"have",
			"haven't",
			"having",
			"he",
			"he'd",
			"he'll",
			"he's",
			"her",
			"here",
			"here's",
			"hers",
			"herself",
			"him",
			"himself",
			"his",
			"how",
			"how's",
			"i",
			"i'd",
			"i'll",
			"i'm",
			"i've",
			"if",
			"in",
			"into",
			"is",
			"isn't",
			"it",
			"it's",
			"its",
			"itself",
			"let's",
			"me",
			"more",
			"most",
			"mustn't",
			"my",
			"myself",
			"no",
			"nor",
			"not",
			"of",
			"off",
			"on",
			"once",
			"only",
			"or",
			"other",
			"ought",
			"our",
			"ours",
			"ourselves",
			"out",
			"over",
			"own",
			"same",
			"shan't",
			"she",
			"she'd",
			"she'll",
			"she's",
			"should",
			"shouldn't",
			"so",
			"some",
			"such",
			"than",
			"that",
			"that's",
			"the",
			"their",
			"theirs",
			"them",
			"themselves",
			"then",
			"there",
			"there's",
			"these",
			"they",
			"they'd",
			"they'll",
			"they're",
			"they've",
			"this",
			"those",
			"through",
			"to",
			"too",
			"under",
			"until",
			"up",
			"very",
			"was",
			"wasn't",
			"we",
			"we'd",
			"we'll",
			"we're",
			"we've",
			"were",
			"weren't",
			"what",
			"what's",
			"when",
			"when's",
			"where",
			"where's",
			"which",
			"while",
			"who",
			"who's",
			"whom",
			"why",
			"why's",
			"with",
			"won't",
			"would",
			"wouldn't",
			"you",
			"you'd",
			"you'll",
			"you're",
			"you've",
			"your",
			"yours",
			"yourself",
			"yourselves",
		];

		const cleanText = (text) =>
			text
				.toLowerCase()
				.replace(/[^a-z0-9äöüß\s]/g, "")
				.split(/\s+/)
				.filter((w) => w.length > 2 && !stopwords.includes(w));

		// Hilfsfunktion für N-Grams
		const generateNGrams = (words, n) => {
			const ngrams = [];
			for (let i = 0; i < words.length - n + 1; i++) {
				ngrams.push(words.slice(i, i + n).join(" "));
			}
			return ngrams;
		};

		// Wörter bereinigen
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

		// Unigrams + N-Grams erzeugen
		const expandKeywords = (words) => [...words, ...generateNGrams(words, 2), ...generateNGrams(words, 3)];

		// Keywords
		const primaryKeywords = Array.from(new Set(expandKeywords([...titleWords, ...h1Words])));
		const secondaryKeywords = Array.from(new Set(expandKeywords(h2h3Words)));

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
				inH1: h1Words.join(" ").includes(kw),
				inH2H3: h2h3Words.join(" ").includes(kw),
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
