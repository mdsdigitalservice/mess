export type Pack = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price_cents: number;
  tracks_count: number;
  cover_key: string | null;
  preview_key: string | null;
  bundle_key: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = 'uploading' | 'pending' | 'approved' | 'rejected';

export type PackOrder = {
  id: string;
  public_token: string;
  pack_id: string;
  customer_name: string;
  email: string;
  whatsapp: string;
  status: OrderStatus;
  proof_key: string;
  download_count: number;
  created_at: string;
  approved_at: string | null;
  pack_title?: string;
  price_cents?: number;
};
