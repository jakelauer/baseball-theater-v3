import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { StandingsPage } from "../pages/StandingsPage";

describe("StandingsPage", () => {
  it("renders stub", () => {
    render(
      <MantineProvider>
        <MemoryRouter>
          <StandingsPage />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByText("Standings")).toBeInTheDocument();
  });
});
