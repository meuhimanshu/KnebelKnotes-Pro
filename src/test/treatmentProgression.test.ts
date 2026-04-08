import { describe, expect, it } from "vitest";
import {
  buildDoseOptionsMg,
  buildProgressionRecommendation,
  formatDoseMg,
  formatDoseRangeMg,
  inferDoseStepMg,
} from "@/lib/treatmentProgression";

const sertraline = {
  drug_name: "Sertraline",
  line_of_treatment: 1,
  initiation_dose_mg: 25,
  therapeutic_min_dose_mg: 50,
  therapeutic_max_dose_mg: 200,
  max_dose_mg: 200,
};

const brexpiprazole = {
  drug_name: "Brexpiprazole",
  line_of_treatment: 1,
  initiation_dose_mg: 0.5,
  therapeutic_min_dose_mg: 0.5,
  therapeutic_max_dose_mg: 2,
  max_dose_mg: 3,
};

describe("treatment progression helpers", () => {
  it("formats dose values with mg suffix", () => {
    expect(formatDoseMg(25)).toBe("25 mg");
    expect(formatDoseRangeMg(50, 200)).toBe("50-200 mg");
    expect(formatDoseMg(0.5)).toBe("0.5 mg");
    expect(formatDoseRangeMg(0.5, 2)).toBe("0.5-2 mg");
  });

  it("infers a dose step and generates dropdown options", () => {
    expect(inferDoseStepMg(sertraline)).toBe(25);
    expect(buildDoseOptionsMg(sertraline)).toEqual([0, 25, 50, 75, 100, 125, 150, 175, 200]);
  });

  it("supports decimal dose steps", () => {
    expect(inferDoseStepMg(brexpiprazole)).toBe(0.5);
    expect(buildDoseOptionsMg(brexpiprazole)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
  });

  it("recommends titration when the dose is below therapeutic range", () => {
    const recommendation = buildProgressionRecommendation(sertraline, {
      currentDoseMg: 25,
      weeksAtDose: 1,
      response: "none",
      tolerability: "tolerating",
    });

    expect(recommendation.title).toBe("Increase toward the therapeutic range");
    expect(recommendation.nextDoseMg).toBe(50);
  });

  it("recommends maintaining when response is adequate", () => {
    const recommendation = buildProgressionRecommendation(sertraline, {
      currentDoseMg: 100,
      weeksAtDose: 6,
      response: "adequate",
      tolerability: "tolerating",
    });

    expect(recommendation.title).toBe("Maintain the current regimen");
    expect(recommendation.nextDoseMg).toBeNull();
  });

  it("blocks escalation when the dose is not tolerated", () => {
    const recommendation = buildProgressionRecommendation(sertraline, {
      currentDoseMg: 100,
      weeksAtDose: 2,
      response: "partial",
      tolerability: "intolerable",
    });

    expect(recommendation.title).toBe("Do not escalate");
    expect(recommendation.nextDoseMg).toBe(75);
  });
});
