
import DashboardLayout from './DashboardLayout';

const NAV_ITEMS = [
  { to: '/admin/university', label: 'Dashboard' },
  { to: '/admin/university/teams', label: 'Teams' },
  { to: '/admin/university/problems', label: 'Problems' },
  { to: '/admin/university/applications', label: 'Applications' },
  { to: '/admin/university/evidence', label: 'Evidence Queue' },
];

export default function UniversityLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="University" />;
}
