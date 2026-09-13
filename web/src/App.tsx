import { MantineProvider, createTheme } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { AppShellLayout } from "./layout/AppShellLayout.js";
import { AppRoutes } from "./routes.js";

/**
 * Five-token brand palette (VISUAL-DESIGN §3-4): Primary anchors Mantine's
 * `primaryColor`; Accent / Accent 2 are named theme colors so components say
 * `color="accent"` / `color="accent2"`, never a hex. Each 10-shade scale is
 * generated around the true brand hex at index 6 — lighter tints toward
 * white below it, darker shades toward black above it.
 *
 * No `headings.fontFamily` override: Mantine defaults headings to the theme's
 * `fontFamily`, so headings and body both land on IBM Plex Sans — Fraunces is
 * gone, not replaced with another heading-only font.
 */
const theme = createTheme({
	primaryColor: "primary",
	colors: {
		primary: [
			"#fbecec",
			"#f3c4c4",
			"#eb9c9c",
			"#e27373",
			"#da4b4b",
			"#d22323",
			"#ce0f0f",
			"#b40d0d",
			"#9b0b0b",
			"#810909",
		],
		accent: [
			"#fef8ed",
			"#fdebc7",
			"#fbdda1",
			"#f9cf7c",
			"#f8c256",
			"#f6b430",
			"#f5ad1d",
			"#d69719",
			"#b88216",
			"#996c12",
		],
		accent2: [
			"#f4fcf6",
			"#dcf6e4",
			"#c5efd1",
			"#ade9bf",
			"#95e3ad",
			"#7edc9a",
			"#72d991",
			"#64be7f",
			"#56a36d",
			"#47885b",
		],
	},
	fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
	defaultRadius: "md",
});

export function App()
{
	return (
		<MantineProvider theme={theme} defaultColorScheme="auto">
			<BrowserRouter>
				<AppShellLayout>
					<AppRoutes />
				</AppShellLayout>
			</BrowserRouter>
		</MantineProvider>
	);
}
