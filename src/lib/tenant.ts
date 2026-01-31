import { prisma } from './prisma';
import { Tenant } from '@prisma/client';

/**
 * Tenant Configuration Cache
 * In production, use Redis for caching
 */
const tenantCache = new Map<string, Tenant>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  tenant: Tenant;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get Tenant by Host
 */
export async function getTenantByHost(host: string): Promise<Tenant | null> {
  // Normalize host (remove port, www)
  const normalizedHost = host.replace(/:\d+$/, '').replace(/^www\./, '');

  // Check cache
  const cached = cache.get(normalizedHost);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  // Query database
  const tenant = await prisma.tenant.findFirst({
    where: {
      hostnames: {
        hasSome: [normalizedHost, `www.${normalizedHost}`],
      },
      isActive: true,
    },
  });

  if (tenant) {
    cache.set(normalizedHost, { tenant, timestamp: Date.now() });
  }

  return tenant;
}

/**
 * Get Tenant by Slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  // Check cache
  const cached = cache.get(`slug:${slug}`);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tenant;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (tenant) {
    cache.set(`slug:${slug}`, { tenant, timestamp: Date.now() });
  }

  return tenant;
}

/**
 * Get Tenant Theme Config
 */
export function getTenantTheme(tenant: Tenant) {
  const defaultTheme = {
    primaryColor: '#8B5CF6', // Purple
    secondaryColor: '#EC4899', // Pink
    backgroundColor: '#0F172A', // Dark slate
    textColor: '#F1F5F9',
  };

  return {
    ...defaultTheme,
    ...(tenant.themeConfig as object),
  };
}

/**
 * Get Tenant Settings
 */
export interface TenantSettings {
  minPayout: number;
  maxPayout: number;
  payoutCooldownDays: number;
  requireKycForPayout: boolean;
  supportEmail: string;
  supportPhone?: string;
}

export function getTenantSettings(tenant: Tenant): TenantSettings {
  const defaultSettings: TenantSettings = {
    minPayout: 100,
    maxPayout: 50000,
    payoutCooldownDays: 7,
    requireKycForPayout: true,
    supportEmail: 'support@example.com',
  };

  return {
    ...defaultSettings,
    ...(tenant.settings as Partial<TenantSettings>),
  };
}

/**
 * Get Tenant Referral Config
 */
export interface ReferralConfig {
  L1: number;
  L2: number;
  L3: number;
  L4: number;
  L5: number;
  L6: number;
  L7: number;
}

export function getTenantReferralConfig(tenant: Tenant): ReferralConfig {
  const defaultConfig: ReferralConfig = {
    L1: 10,
    L2: 5,
    L3: 2,
    L4: 1,
    L5: 1,
    L6: 0.5,
    L7: 0.5,
  };

  return {
    ...defaultConfig,
    ...(tenant.referralConfig as Partial<ReferralConfig>),
  };
}

/**
 * Clear Tenant Cache
 */
export function clearTenantCache(host?: string) {
  if (host) {
    cache.delete(host);
  } else {
    cache.clear();
  }
}
