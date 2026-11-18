import DashboardLayout from './DashboardLayout';

const NAV_ITEMS = [
  { to: '/citizen', label: 'Dashboard' },
  { to: '/citizen/problems', label: 'Problem Feed' },
  { to: '/citizen/report', label: 'Report Problem' },
  { to: '/citizen/reports', label: 'My Reports' },
];

export default function CitizenLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="Citizen" />;
}
