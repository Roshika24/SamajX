import EmptyState from '../../components/EmptyState';

export default function CompanyDashboard() {
  return (
    <div>
      <h2>Company Dashboard</h2>
      <EmptyState
        title="Sponsor Student Solutions"
        description="Browse approved projects and sponsor the ones that align with your mission."
      />
    </div>
  );
}
