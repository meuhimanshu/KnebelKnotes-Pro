import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InitiationOfTreatment from "@/pages/InitiationOfTreatment";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe("InitiationOfTreatment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("shows treatment rows to anonymous visitors without edit controls", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      session: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        {
          id: "drug-1",
          category_id: "category-1",
          drug_name: "Sertraline",
          medication_type: "monotherapy",
          frequency: "daily",
          line_of_treatment: 1,
          initiation_dose_mg: 50,
          therapeutic_min_dose_mg: 50,
          therapeutic_max_dose_mg: 200,
          max_dose_mg: 200,
          updated_at: "2026-03-16T12:00:00.000Z",
          is_active: true,
        },
      ],
      error: null,
    } as never);

    render(
      <MemoryRouter>
        <InitiationOfTreatment categoryId="category-1" categoryName="Depression" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Initiation of Treatment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Line 1" }));

    await waitFor(() => {
      expect(screen.getByText("Sertraline")).toBeInTheDocument();
    });

    expect(screen.queryByText("Approve + direct edit access")).not.toBeInTheDocument();
    expect(screen.getByText("Select line of treatment")).toBeInTheDocument();
    expect(screen.getByText("Factors to consider")).toBeInTheDocument();
    expect(screen.getByText("Pick a starting dose and titration schedule")).toBeInTheDocument();
    expect(screen.getByText("Patient education")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse medication table" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in to make changes" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Updated" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Propose change" })).not.toBeInTheDocument();
  });
});
