export const PERIODS = [
  { label: 'All Time', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
] as const;

export const SYNC_PERIODS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 15 days', value: 15 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
] as const;

export const TRACKING_STATUSES = [
  { label: 'Delivered', value: 'Delivered' },
  { label: 'In Transit', value: 'InTransit' },
  { label: 'Out for Delivery', value: 'OutForDelivery' },
  { label: 'Available for Pickup', value: 'AvailableForPickup' },
  { label: 'Info Received', value: 'InfoReceived' },
  { label: 'Not Found', value: 'NotFound' },
  { label: 'Expired', value: 'Expired' },
  { label: 'Delivery Failure', value: 'DeliveryFailure' },
  { label: 'Exception', value: 'Exception' },
] as const;
