import { Placement } from 'react-joyride';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  // allow 'center' placement used by our steps in addition to react-joyride Placement values
  placement?: Placement | 'center';
}

export const onboardingSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: 'Welcome to Rivo Partner',
    description: "Congratulations! Your store has been approved. Let's take a quick tour of your Vendor Portal.",
    placement: 'center',
  },
  {
    id: 'dashboard',
    target: '[data-tour-id="dashboard-menu"]',
    title: 'Dashboard',
    description: "This is your business overview. Monitor today's orders, sales, subscription, notifications and business performance.",
    placement: 'right',
  },
  {
    id: 'orders',
    target: '[data-tour-id="orders-menu"]',
    title: 'Orders Management',
    description: 'Track and update live order states efficiently. Manage Accept, Reject, Prepare, Ready, and Delivered lifecycles seamlessly.',
    placement: 'right',
  },
  {
    id: 'products',
    target: '[data-tour-id="products-menu"]',
    title: 'Products Portfolio',
    description: 'Manage items via Manual Products or Smart Import layouts. Configure item details, store categories, and base parameters.',
    placement: 'right',
  },
  {
    id: 'inventory',
    target: '[data-tour-id="inventory-menu"]',
    title: 'Inventory & Operations',
    description: 'Track stock and monitor real-time availability workflows effortlessly to avoid unexpected out-of-stock product issues.',
    placement: 'right',
  },
  {
    id: 'notifications',
    target: '[data-tour-id="notifications-menu"]',
    title: 'Real-time Alerts',
    description: 'Stay completely updated with live system notifications covering incoming orders, payments, announcements, and subscription reminders.',
    placement: 'right',
  },
  {
    id: 'subscriptions',
    target: '[data-tour-id="subscriptions-menu"]',
    title: 'Subscription Tiers',
    description: 'Review your currently assigned trial, free, or basic plan properties, view transaction parameters, and receive subscription reminders.',
    placement: 'right',
  },
  {
    id: 'store-management',
    target: '[data-tour-id="store-management-menu"]',
    title: 'Store Configuration',
    description: 'Configure vital administrative parameters including Store Name, Categories, custom Business Hours, regulatory Documents, and Bank Details.',
    placement: 'right',
  },
  {
    id: 'profile',
    target: '[data-tour-id="profile-menu"]',
    title: 'Account Profile',
    description: 'Manage your individual profile photo, owner information variables, security credentials, and preferred workspace languages.',
    placement: 'right',
  },
  {
    id: 'settings',
    target: '[data-tour-id="settings-menu"]',
    title: 'System Settings',
    description: 'Personalize core application environment properties such as Theme toggles, localized Language defaults, and feature preferences.',
    placement: 'right',
  },
  {
    id: 'finish',
    target: 'body',
    title: "You're Ready!",
    description: 'Your Vendor Portal configuration tour is complete. Start adding products and begin accepting consumer orders instantly.',
    placement: 'center',
  },
];