import DashboardLayout from './DashboardLayout';

// Destinations for platform administration
const NAV_ITEMS = [
  { to: '/admin/platform', label: 'Dashboard' },
  { to: '/admin/platform/universities', label: 'Universities' },
  { to: '/admin/platform/workflows', label: 'Lifecycle Workflows' },
];

export default function PlatformAdminLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="Platform Admin" />;
}
