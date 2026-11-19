import DashboardLayout from './DashboardLayout';

const NAV_ITEMS = [
  { to: '/leader', label: 'Dashboard' },
  { to: '/leader/team', label: 'My Team' },
  { to: '/leader/problems', label: 'Browse Problems' },
  { to: '/leader/applications', label: 'Applications' },
  { to: '/leader/certificates', label: 'Certificates' },
];

export default function LeaderLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="Team Leader" />;
}
