import { supabase } from "@/lib/supabaseClient";

export type MedicationSearchResult = {
  drug_name: string;
  category_id: string;
  category_name: string;
  category_short_code: string;
  line_numbers: number[];
};

export const formatTreatmentLines = (lineNumbers: number[]) => {
  if (lineNumbers.length === 0) {
    return "Line not set";
  }

  return `${lineNumbers.length === 1 ? "Line" : "Lines"} ${lineNumbers.join(", ")}`;
};

export const searchTreatmentMedications = async (query: string) => {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return { data: [] as MedicationSearchResult[], error: null };
  }

  const { data, error } = await supabase.rpc("search_treatment_medications", {
    p_query: trimmedQuery,
  });

  return {
    data: (data as MedicationSearchResult[] | null) ?? [],
    error: error?.message ?? null,
  };
};
