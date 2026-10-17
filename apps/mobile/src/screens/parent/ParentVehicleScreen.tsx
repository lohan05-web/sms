import { Text, View } from 'react-native';

import { ParentChildShell } from '../../components/ParentChildShell';
import { formatCurrency, formatDate, humanize } from '../../lib/format';

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

export function ParentVehicleScreen() {
  return (
    <ParentChildShell<ChildVehicle[]>
      title="Vehicle Details"
      subtitle="Your child's school transport assignment"
      endpoint={(studentId) => `/parents/me/children/${studentId}/vehicle`}
      emptyMessage="No transport subscription is active for this child."
      isEmpty={(data) => data.length === 0}
      render={(data) => (
        <View style={styles.grid}>
          {data.map((assignment, index) => (
            <VehicleCard key={assignment.id ?? index} assignment={assignment} />
          ))}
        </View>
      )}
    />
  );
}

function VehicleCard({ assignment }: { assignment: ChildVehicle }) {
  const { route } = assignment;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{route ? `${route.name} (${route.code})` : 'Transport'}</Text>
        <Text style={styles.status}>{humanize(assignment.status)}</Text>
      </View>
      <Text style={styles.muted}>
        {[
          assignment.academicYear?.name,
          route?.startPoint && route?.endPoint
            ? `${route.startPoint} → ${route.endPoint}`
            : null,
          `Fare ${formatCurrency(route?.fare ?? 0)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={styles.muted}>
        Subscription {formatDate(assignment.startDate)}
        {assignment.endDate ? ` — ${formatDate(assignment.endDate)}` : ' — ongoing'}
      </Text>

      {assignment.stop ? (
        <Text style={styles.body}>
          Boarding stop: {assignment.stop.name}
          {assignment.stop.pickupTime ? ` · Pickup ${assignment.stop.pickupTime}` : ''}
          {assignment.stop.dropTime ? ` · Drop ${assignment.stop.dropTime}` : ''}
        </Text>
      ) : null}

      <Text style={styles.subtitle}>Assigned vehicle</Text>
      {assignment.vehicles.length === 0 ? (
        <Text style={styles.muted}>No vehicle has been assigned to this route yet.</Text>
      ) : (
        assignment.vehicles.map((vehicle) => (
          <View key={vehicle.id} style={styles.block}>
            <Text style={styles.body}>
              {vehicle.plateNumber}
              {vehicle.vehicleCode ? ` · ${vehicle.vehicleCode}` : ''}
            </Text>
            <Text style={styles.muted}>
              {[vehicle.model, humanize(vehicle.type), `${vehicle.capacity} seats`]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text style={styles.muted}>
              Driver:{' '}
              {vehicle.driver?.name ?? vehicle.driverName ?? 'Not assigned'}
              {(vehicle.driverPhone || vehicle.driver?.phone) &&
                ` · ${vehicle.driverPhone ?? vehicle.driver?.phone}`}
            </Text>
          </View>
        ))
      )}

      {route && route.stops.length > 0 ? (
        <>
          <Text style={styles.subtitle}>Route stops</Text>
          {route.stops.map((stop) => (
            <Row
              key={stop.id}
              label={`${stop.sequence}. ${stop.name}`}
              value={[stop.pickupTime ?? '—', stop.dropTime ?? '—'].join(' · ')}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stopRow}>
      <Text style={styles.stopLabel}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </View>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  block: {
    gap: 2,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stopLabel: {
    fontSize: 13,
    color: '#334155',
    flexShrink: 1,
  },
  body: {
    fontSize: 14,
    color: '#334155',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
} as const;
