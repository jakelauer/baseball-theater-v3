import { MantineProvider, createTheme } from "@mantine/core";
import { BrowserRouter } from "react-router-dom";
import { AppShellLayout } from "./layout/AppShellLayout";
import { AppRoutes } from "./routes";

const theme = createTheme({
  primaryColor: "teal",
  fontFamily: "IBM Plex Sans, Segoe UI, sans-serif",
  headings: { fontFamily: "Fraunces, Georgia, serif" },
  defaultRadius: "md",
});

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <BrowserRouter>
        <AppShellLayout>
          <AppRoutes />
        </AppShellLayout>
      </BrowserRouter>
    </MantineProvider>
  );
}
