import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173,
		// Bind all interfaces so the dev server is reachable from another device
		// on the LAN (phone, tablet) — Vite's default is loopback only.
		host: true,
		// Vite 403s any request whose Host header isn't allow-listed (DNS-rebinding
		// protection). `.local` permits mDNS hostnames like `jake-macbook-m5.local`
		// without disabling the check outright.
		allowedHosts: [".local"],
		proxy: {
			"/api": {
				target: "http://localhost:8787",
				changeOrigin: true,
			},
			"/health": {
				target: "http://localhost:8787",
				changeOrigin: true,
			},
		},
	},
});
