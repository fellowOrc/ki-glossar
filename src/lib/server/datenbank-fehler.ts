// Der Mengenbegrenzungs-Trigger in Supabase meldet sich entweder mit dem
// Check-Constraint-Code 23514 oder mit einer Meldung, die "zu viele" enthält.
export function istMengenbegrenzung(error: {
  code?: string;
  message: string;
}): boolean {
  return error.code === "23514" || /zu viele/i.test(error.message);
}
