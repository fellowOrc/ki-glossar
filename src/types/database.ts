export type Category = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  description: string | null;
};

export type TermStatus = "draft" | "published";

export type Term = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  short_explanation: string | null;
  definition: string | null;
  business_relevance: string | null;
  status: TermStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  moderation_status: ModerationStatus;
  moderation_notes: string | null;
  moderation_checked_at: string | null;
};

export type ModerationStatus = "unchecked" | "ok" | "flagged";

export type Rolle = "member" | "editor" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  role: Rolle;
  created_at: string;
};

export type Source = {
  id: string;
  term_id: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  year: number | null;
  url: string | null;
};

export type TermRelation = {
  term_id: string;
  related_term_id: string;
};

export type TermWithCategory = Term & {
  category: Category | null;
};
