import DashboardLayout from './DashboardLayout';

const NAV_ITEMS = [
  { to: '/company', label: 'Dashboard' },
  { to: '/company/projects', label: 'Project Gallery' },
  { to: '/company/sponsorships', label: 'My Sponsorships' },
];

export default function CompanyLayout() {
  return <DashboardLayout navItems={NAV_ITEMS} title="Company" />;
}
