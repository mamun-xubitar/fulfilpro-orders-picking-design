import prisma from '@/lib/prisma.server';

const SETTINGS_ID = 'default';

const DEFAULT_EMAIL_RULE_SETTINGS = {
  loginApprovalRecipientUserIds: [] as string[],
  backInStockAdminRecipientUserIds: [] as string[],
  stockAdjustmentRecipientUserIds: [] as string[],
  fulfillmentRequestAllowedUserIds: [] as string[],
  fulfillmentRequestDefaultUserIds: [] as string[],
  pickingPackingAllowedUserIds: [] as string[],
  pickingPackingDefaultUserIds: [] as string[],
  directMessageAllowedUserIds: [] as string[],
  directMessageDefaultUserIds: [] as string[],
  backInStockRequesterUpdatesEnabled: true,
};

type RecipientScope = 'admin_only' | 'any_active';

type HiddenRule = 'login_approval' | 'back_in_stock_admin' | 'stock_adjustment';
type PickerRule = 'fulfillment_request' | 'picking_packing' | 'direct_message';

export type EmailRuleUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AppEmailSettings = {
  loginApprovalRecipientUserIds: unknown;
  backInStockAdminRecipientUserIds: unknown;
  stockAdjustmentRecipientUserIds: unknown;
  fulfillmentRequestAllowedUserIds: unknown;
  fulfillmentRequestDefaultUserIds: unknown;
  pickingPackingAllowedUserIds: unknown;
  pickingPackingDefaultUserIds: unknown;
  directMessageAllowedUserIds: unknown;
  directMessageDefaultUserIds: unknown;
  backInStockRequesterUpdatesEnabled: boolean;
};

export type EmailRulePickerOptions = {
  allowedUsers: EmailRuleUser[];
  defaultUserIds: string[];
};

export function normalizeUserIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return Array.from(new Set(ids));
}

export async function listEmailRuleUsers() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });

  return {
    activeUsers: users,
    activeAdminUsers: users.filter((user) => user.role === 'admin'),
  };
}

export async function resolveHiddenRecipientEmails(rule: HiddenRule): Promise<string[]> {
  const settings = await getEmailSettings();
  const users = await resolveHiddenRecipients(rule, settings);
  return users.map((user) => user.email);
}

export async function resolvePickerRecipientOptions(rule: PickerRule): Promise<EmailRulePickerOptions> {
  const settings = await getEmailSettings();
  return resolvePickerRecipients(rule, settings);
}

export async function isBackInStockRequesterUpdatesEnabled() {
  const settings = await getEmailSettings();
  return settings.backInStockRequesterUpdatesEnabled;
}

export function getNormalizedEmailRuleSettings(settings: AppEmailSettings | null) {
  return {
    loginApprovalRecipientUserIds: normalizeUserIdList(settings?.loginApprovalRecipientUserIds),
    backInStockAdminRecipientUserIds: normalizeUserIdList(settings?.backInStockAdminRecipientUserIds),
    stockAdjustmentRecipientUserIds: normalizeUserIdList(settings?.stockAdjustmentRecipientUserIds),
    fulfillmentRequestAllowedUserIds: normalizeUserIdList(settings?.fulfillmentRequestAllowedUserIds),
    fulfillmentRequestDefaultUserIds: normalizeUserIdList(settings?.fulfillmentRequestDefaultUserIds),
    pickingPackingAllowedUserIds: normalizeUserIdList(settings?.pickingPackingAllowedUserIds),
    pickingPackingDefaultUserIds: normalizeUserIdList(settings?.pickingPackingDefaultUserIds),
    directMessageAllowedUserIds: normalizeUserIdList(settings?.directMessageAllowedUserIds),
    directMessageDefaultUserIds: normalizeUserIdList(settings?.directMessageDefaultUserIds),
    backInStockRequesterUpdatesEnabled: settings?.backInStockRequesterUpdatesEnabled ?? DEFAULT_EMAIL_RULE_SETTINGS.backInStockRequesterUpdatesEnabled,
  };
}

async function getEmailSettings() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: {
      loginApprovalRecipientUserIds: true,
      backInStockAdminRecipientUserIds: true,
      stockAdjustmentRecipientUserIds: true,
      fulfillmentRequestAllowedUserIds: true,
      fulfillmentRequestDefaultUserIds: true,
      pickingPackingAllowedUserIds: true,
      pickingPackingDefaultUserIds: true,
      directMessageAllowedUserIds: true,
      directMessageDefaultUserIds: true,
      backInStockRequesterUpdatesEnabled: true,
    },
  });

  return getNormalizedEmailRuleSettings(settings);
}

async function resolveHiddenRecipients(rule: HiddenRule, settings: ReturnType<typeof getNormalizedEmailRuleSettings>) {
  const { ids, scope } = getHiddenRuleConfig(rule, settings);
  if (ids.length === 0) return [];
  return findActiveUsersByIds(ids, scope);
}

async function resolvePickerRecipients(rule: PickerRule, settings: ReturnType<typeof getNormalizedEmailRuleSettings>) {
  const { allowedIds, defaultIds, scope } = getPickerRuleConfig(rule, settings);
  if (allowedIds.length === 0) {
    return { allowedUsers: [], defaultUserIds: [] };
  }

  const allowedUsers = await findActiveUsersByIds(allowedIds, scope);
  const allowedUserIdSet = new Set(allowedUsers.map((user) => user.id));
  const defaultUserIds = defaultIds.filter((id) => allowedUserIdSet.has(id));

  return {
    allowedUsers: allowedUsers.sort((a, b) => {
      const byName = a.name.localeCompare(b.name);
      if (byName !== 0) return byName;
      return a.email.localeCompare(b.email);
    }),
    defaultUserIds,
  };
}

function getHiddenRuleConfig(
  rule: HiddenRule,
  settings: ReturnType<typeof getNormalizedEmailRuleSettings>
): { ids: string[]; scope: RecipientScope } {
  if (rule === 'login_approval') {
    return { ids: settings.loginApprovalRecipientUserIds, scope: 'admin_only' };
  }
  if (rule === 'back_in_stock_admin') {
    return { ids: settings.backInStockAdminRecipientUserIds, scope: 'any_active' };
  }
  return { ids: settings.stockAdjustmentRecipientUserIds, scope: 'any_active' };
}

function getPickerRuleConfig(
  rule: PickerRule,
  settings: ReturnType<typeof getNormalizedEmailRuleSettings>
): { allowedIds: string[]; defaultIds: string[]; scope: RecipientScope } {
  if (rule === 'fulfillment_request') {
    return {
      allowedIds: settings.fulfillmentRequestAllowedUserIds,
      defaultIds: settings.fulfillmentRequestDefaultUserIds,
      scope: 'admin_only',
    };
  }
  if (rule === 'picking_packing') {
    return {
      allowedIds: settings.pickingPackingAllowedUserIds,
      defaultIds: settings.pickingPackingDefaultUserIds,
      scope: 'any_active',
    };
  }
  return {
    allowedIds: settings.directMessageAllowedUserIds,
    defaultIds: settings.directMessageDefaultUserIds,
    scope: 'any_active',
  };
}

async function findActiveUsersByIds(ids: string[], scope: RecipientScope) {
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      active: true,
      ...(scope === 'admin_only' ? { role: 'admin' } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const userById = new Map(users.map((user) => [user.id, user]));
  return ids
    .map((id) => userById.get(id))
    .filter((user): user is EmailRuleUser => Boolean(user));
}
