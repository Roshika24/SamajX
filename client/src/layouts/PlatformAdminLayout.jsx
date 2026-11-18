import DashboardLayout from './DashboardLayout';

// Only show destinations that are implemented in Phase 2.
// Companies, moderation, problems and audit screens belong to later phases.
const NAV_ITEMS = [
  { to: '/admin/platform', label: 'Dashboard' },
  { to: '/admin/platform/universities', label: 'Universities' },
  { to: '/admin/platform/phase4', label: 'Phase 4 workflows' },
];

export default function PlatformAdminLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="Platform Admin" />;
}
