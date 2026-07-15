export type SettingsTabId = 'general' | 'notifications' | 'decoration' | 'tracking';

export const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'decoration', label: 'Decoration' },
  { id: 'tracking', label: 'Shipment Tracking' },
];
