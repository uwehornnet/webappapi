"use client";

import { useState } from "react";

import styles from "./page.module.css";

export default function Home() {
	const [outputHeaders, setOutputHeaders] = useState([]);
	const [csvHeaders, setCsvHeaders] = useState([]);
	const [additionalHeaders, setAdditionalHeaders] = useState([]);
	const [mappedHeaders, setMappedHeaders] = useState([]);
	const [records, setRecords] = useState([]);
	const [output, setOutput] = useState("");

	const handleSubmit = async (event) => {
		event.preventDefault();

		try {
			const formData = new FormData(event.target);
			const response = await fetch("/api/preflight", {
				method: "POST",
				body: formData,
			});

			const data = await response.json();
			if (response.ok) {
				setOutputHeaders(data.headers.output_headers);
				setCsvHeaders(data.headers.csv_headers);
				setRecords(data.headers.records);
				setMappedHeaders(data.headers.csv_headers.map((header) => ({ header, mapping: "" })));
			} else {
				alert(data.error || "Fehler beim Verarbeiten der Datei.");
			}
		} catch (error) {
			alert("Fehler beim Verarbeiten der Datei.");
		}
	};

	const handleUpload = async () => {
		const headers = [...mappedHeaders, ...additionalHeaders];

		const req = await fetch("/api/convert", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ records, headers }),
		});

		const res = await req.text();

		if (req.ok) {
			setOutput(res);
		} else {
			alert(data.error || "Fehler beim Verarbeiten der Datei.");
		}
	};

	const handleCsvDownload = () => {
		try {
			const blob = new Blob([output], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.setAttribute("download", "converted_data.csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// message to indicate download started
			alert("Download fertiggestellt: converted_data.csv");
		} catch (error) {
			alert("Fehler beim Download der Datei.");
		}
	};

	return (
		<div className={styles.page}>
			<main className={styles.main}>
				<svg
					viewBox="0 0 32 23"
					fill="currentColor"
					xmlns="http://www.w3.org/2000/svg"
					style={{ width: "100px", height: "auto" }}
				>
					{" "}
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M9.64709 22.9973V22.9973C4.31625 22.9973 0 18.6818 0 13.3509V0.299617C0 0.136256 0.131128 0 0.291559 0C5.6224 0 9.94304 4.32137 9.94304 9.64929V22.7013C9.94304 22.8669 9.80752 22.9973 9.64709 22.9973"
					></path>{" "}
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M11.2947 22.9973V22.9973C16.6204 22.9973 20.9411 18.6818 20.9411 13.3509V0.299617C20.9411 0.136256 20.8048 0 20.6451 0C15.3136 0 10.998 4.32137 10.998 9.64929V22.7013C10.998 22.8669 11.1284 22.9973 11.2947 22.9973"
					></path>{" "}
					<path
						fillRule="evenodd"
						clipRule="evenodd"
						d="M31.7037 22.9973V22.9973C26.3473 22.9973 22.0068 18.6561 22.0068 13.3011V7.88385C22.0068 7.71829 22.1372 7.58789 22.3035 7.58789C27.6593 7.58789 31.9997 11.929 31.9997 17.2841V22.7013C31.9997 22.8669 31.87 22.9973 31.7037 22.9973"
					></path>{" "}
				</svg>
			</main>
		</div>
	);
}
