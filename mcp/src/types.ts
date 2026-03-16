/**
 * Relay API response types
 *
 * Hand-written from the Relay API blueprints (app/blueprints/relay/api/helium/).
 * Covers every field returned by the Rails Blueprinter serializers.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pagination envelope
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  current_page: number;
  total_pages: number;
  total_count: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — Maker
// ─────────────────────────────────────────────────────────────────────────────

export interface Maker {
  id: string;
  name: string;
  address: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — Hotspot
// ─────────────────────────────────────────────────────────────────────────────

export interface HotspotIotInfo {
  location: number | null;
  elevation: number | null;
  gain: number | null;
  is_full_hotspot: boolean | null;
  num_location_asserts: number | null;
  is_active: boolean | null;
  dc_onboarding_fee_paid: number | null;
}

export interface HotspotMobileInfo {
  location: number | null;
  is_full_hotspot: boolean | null;
  num_location_asserts: number | null;
  is_active: boolean | null;
  dc_onboarding_fee_paid: number | null;
  device_type: string | null;
  antenna: string | null;
  azimuth: number | null;
  mechanical_down_tilt: number | null;
  electrical_down_tilt: number | null;
}

export interface Hotspot {
  id: string;
  asset_id: string | null;
  ecc_key: string | null;
  owner: string | null;
  networks: string[];
  name: string | null;
  maker: Maker | null;
  iot_info: HotspotIotInfo | null;
  mobile_info: HotspotMobileInfo | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — IoT Reward Share
// ─────────────────────────────────────────────────────────────────────────────

export interface IotRewardShare {
  id: string;
  hotspot_key: string | null;
  reward_type: string | null;
  beacon_amount: number;
  witness_amount: number;
  dc_transfer_amount: number;
  amount: number;
  end_period: string;
  start_period: string | null;
}

export interface IotRewardTotals {
  total_beacon_amount: number;
  total_witness_amount: number;
  total_dc_transfer_amount: number;
  total_amount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — Mobile Reward Share
// ─────────────────────────────────────────────────────────────────────────────

export interface MobileRewardShare {
  id: string;
  hotspot_key: string | null;
  reward_type: string | null;
  dc_transfer_reward: number;
  poc_reward: number;
  subscriber_reward: number;
  discovery_location_amount: number;
  service_provider_amount: number;
  matched_amount: number;
  offloaded_bytes: number;
  end_period: string;
  start_period: string | null;
}

export interface MobileRewardTotals {
  total_dc_transfer_reward: number;
  total_poc_reward: number;
  total_subscriber_reward: number;
  total_discovery_location_amount: number;
  total_service_provider_amount: number;
  total_matched_amount: number;
  total_offloaded_bytes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — Account
// ─────────────────────────────────────────────────────────────────────────────

export interface L1Account {
  id: string;
  address: string | null;
  balance: number | null;
  nonce: number | null;
  dc_balance: number | null;
  sec_balance: number | null;
  block: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — Gateway
// ─────────────────────────────────────────────────────────────────────────────

export interface L1Gateway {
  id: string;
  address: string | null;
  owner_address: string | null;
  payer_address: string | null;
  name: string | null;
  location_hex: string | null;
  mode: string | null;
  gain: number | null;
  elevation: number | null;
  block: number | null;
  block_added: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — Transaction
// ─────────────────────────────────────────────────────────────────────────────

export interface L1Transaction {
  id: string;
  transaction_hash: string | null;
  type: string | null;
  block: number | null;
  time: string | null;
  fields: Record<string, unknown> | null;
}
