import { EmptyState } from '../../components/ui';
import { formatCurrency, formatDate, humanize } from '../../lib/format';
import { ParentChildPage } from './ParentChildPage';

interface RouteStop {
  id: string;
  name: string;
  sequence: number;
  pickupTime: string | null;
  dropTime: string | null;
}

interface VehicleDriver {
  id: string;
  driverCode: string;
  name: string;
  phone: string;
  licenseNumber: string;
}

interface AssignedVehicle {
  id: string;
  vehicleCode: string | null;
  plateNumber: string;
  model: string | null;
  type: string;
  capacity: number;
  status: string;
  insuranceExpiry: string | null;
  driver: VehicleDriver | null;
  driverName: string | null;
  driverPhone: string | null;
}

interface ChildVehicle {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  academicYear: { id: string; name: string; isCurrent: boolean } | null;
  stop: RouteStop | null;
  route: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    startPoint: string | null;
    endPoint: string | null;
    pickupTime: string | null;
    dropTime: string | null;
    fare: number | string;
    stops: RouteStop[];
  } | null;
  vehicles: AssignedVehicle[];
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: 'badge badge--success',
  MAINTENANCE: 'badge badge--warning',
  INACTIVE: 'badge badge--default',
};

function VehicleCard({ assignment }: { assignment: ChildVehicle }) {
  const { route } = assignment;
  return (
    <div className="panel">
      <div className="panel__header">
        <h3 className="panel__title">{route ? `${route.name} (${route.code})` : 'Transport'}</h3>
        <span className={STATUS_CLASS[assignment.status] ?? 'badge badge--default'}>
          {humanize(assignment.status)}
        </span>
      </div>

      <p className="muted">
        {[
          assignment.academicYear?.name,
          route?.startPoint && route?.endPoint ? `${route.startPoint} → ${route.endPoint}` : null,
          `Fare ${formatCurrency(route?.fare ?? 0)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      <p className="muted">
        Subscription {formatDate(assignment.startDate)}
        {assignment.endDate ? ` – ${formatDate(assignment.endDate)}` : ' – ongoing'}
      </p>

      {assignment.stop ? (
        <p>
          <strong>Boarding stop:</strong> {assignment.stop.name}
          {assignment.stop.pickupTime ? ` · Pickup ${assignment.stop.pickupTime}` : ''}
          {assignment.stop.dropTime ? ` · Drop ${assignment.stop.dropTime}` : ''}
        </p>
      ) : null}

      <h4 className="panel__subtitle">Assigned vehicle</h4>
      {assignment.vehicles.length === 0 ? (
        <p className="muted">No vehicle has been assigned to this route yet.</p>
      ) : (
        assignment.vehicles.map((vehicle) => (
          <div className="child-header" key={vehicle.id}>
            <div className="child-header__info">
              <strong>
                {vehicle.plateNumber}
                {vehicle.vehicleCode ? ` · ${vehicle.vehicleCode}` : ''}
              </strong>
              <span className="muted">
                {[vehicle.model, humanize(vehicle.type), `${vehicle.capacity} seats`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className="muted">
                Driver: {vehicle.driver?.name ?? vehicle.driverName ?? 'Not assigned'}
                {vehicle.driverPhone || vehicle.driver?.phone
                  ? ` · ${vehicle.driverPhone ?? vehicle.driver?.phone}`
                  : ''}
              </span>
            </div>
          </div>
        ))
      )}

      {route && route.stops.length > 0 ? (
        <>
          <h4 className="panel__subtitle">Route stops</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Stop</th>
                  <th>Pickup</th>
                  <th>Drop</th>
                </tr>
              </thead>
              <tbody>
                {route.stops.map((stop) => (
                  <tr key={stop.id}>
                    <td>{stop.sequence}</td>
                    <td>{stop.name}</td>
                    <td>{stop.pickupTime ?? '—'}</td>
                    <td>{stop.dropTime ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ParentVehiclePage() {
  return (
    <ParentChildPage<ChildVehicle[]>
      title="Vehicle Details"
      subtitle="Your child's school transport assignment"
      endpoint={(studentId) => `/parents/me/children/${studentId}/vehicle`}
      emptyMessage="No transport subscription is active for this child."
      isEmpty={(data) => data.length === 0}
      render={(data) =>
        data.length === 0 ? (
          <EmptyState message="No transport subscription is active for this child." />
        ) : (
          <div className="dashboard">
            {data.map((assignment) => (
              <VehicleCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )
      }
    />
  );
}
