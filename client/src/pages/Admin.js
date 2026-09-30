import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import { TabList, TabPanel } from '../components/ui/Tabs';
import useDocumentTitle from '../hooks/useDocumentTitle';
import AppointmentsTab from './admin/AppointmentsTab';
import DoctorsTab from './admin/DoctorsTab';
import OverviewTab from './admin/OverviewTab';
import UsersTab from './admin/UsersTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'doctors', label: 'Doctors', icon: Stethoscope },
  { id: 'users', label: 'Users', icon: Users },
];

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function Admin() {
  useDocumentTitle('Admin');
  const [params, setParams] = useSearchParams();

  const requestedTab = params.get('tab');
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab : 'overview';
  const requestedStatus = params.get('status');
  const status = STATUSES.includes(requestedStatus) ? requestedStatus : '';

  // Tabs live in the URL so a section can be bookmarked or shared.
  const goTo = (nextTab, nextStatus = '') => {
    const next = {};
    if (nextTab !== 'overview') next.tab = nextTab;
    if (nextStatus) next.status = nextStatus;
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="container-page pt-10 sm:pt-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Admin</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            Review appointment requests, keep the doctor directory up to date and see who has registered.
          </p>
          <TabList
            className="mt-8"
            bordered={false}
            label="Admin sections"
            idPrefix="admin"
            tabs={TABS}
            value={tab}
            onChange={(id) => goTo(id)}
          />
        </div>
      </div>

      <TabPanel idPrefix="admin" value={tab} className="container-page py-8 sm:py-10">
        {tab === 'overview' ? <OverviewTab onReviewPending={() => goTo('appointments', 'pending')} /> : null}
        {tab === 'appointments' ? (
          <AppointmentsTab status={status} onStatusChange={(nextStatus) => goTo('appointments', nextStatus)} />
        ) : null}
        {tab === 'doctors' ? <DoctorsTab /> : null}
        {tab === 'users' ? <UsersTab /> : null}
      </TabPanel>
    </>
  );
}
