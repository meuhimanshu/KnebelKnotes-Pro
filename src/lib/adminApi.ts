import { supabase } from "@/lib/supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type CreateSubAdminPayload = {
  email: string;
  password: string;
  full_name: string;
  username: string;
};

export const createSubAdmin = async (payload: CreateSubAdminPayload) => {
  const { data, error } = await supabase.functions.invoke("create-sub-admin", {
    body: payload,
  });

  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const text = await error.context.text();
        if (text) {
          message = text;
        }
      } catch {
        // Ignore parse failures and fall back to default message.
      }
    }
    return { data: null, error: message };
  }

  return { data, error: undefined };
};
