import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, StatusBar, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { useTheme } from '@/hooks/useTheme';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { useAuthStore } from '@/store/auth.store';
import {
  useRevenueReport, fetchRevenueReport,
  currentMonthKey, offsetMonth, formatMonthFull,
} from '@/hooks/useRevenueReport';
import type { MonthTrend, PlanRevenueSummary, TopClient, RevenueReport } from '@/hooks/useRevenueReport';

// ── Formatters ────────────────────────────────────────────────────

function fmtMoney(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  if (amount >= 1_000_000) return `₡${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000)     return `₡${(amount / 1_000).toFixed(0)}K`;
  return `₡${Math.round(amount).toLocaleString('es-CR')}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Comparative export helpers ────────────────────────────────────

function sumArr(arr: number[]) { return arr.reduce((a, b) => a + b, 0); }

function varPct(first: number, last: number): string {
  if (first === 0) return last > 0 ? '+∞%' : '0%';
  const pct = ((last - first) / first) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function getMonthRange(endMonth: string, count: number): string[] {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) months.push(offsetMonth(endMonth, -i));
  return months;
}

function xlsxToBase64(wb: any): string {
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

async function buildComparativeXLSX(
  tenantId: string,
  months: string[],
): Promise<string> {
  const results = await Promise.all(
    months.map((m) => fetchRevenueReport(tenantId, m).then((r) => ({ month: m, report: r }))),
  );

  const wb    = XLSX.utils.book_new();
  const mlbls = months.map(formatMonthFull);

  // ── Sheet 1: Resumen comparativo ──
  const first = results[0].report;
  const last  = results[results.length - 1].report;
  const s1 = XLSX.utils.aoa_to_sheet([
    ['Métrica', ...mlbls, 'TOTAL', 'Var% (primero→último)'],
    ['Ingresos CRC (₡)',     ...results.map((r) => r.report.totalCRC),                    sumArr(results.map((r) => r.report.totalCRC)),                    varPct(first.totalCRC,                    last.totalCRC)],
    ['Ingresos USD ($)',     ...results.map((r) => r.report.totalUSD),                    sumArr(results.map((r) => r.report.totalUSD)),                    varPct(first.totalUSD,                    last.totalUSD)],
    ['Nuevas suscripciones', ...results.map((r) => r.report.newSubscriptionsThisMonth),   sumArr(results.map((r) => r.report.newSubscriptionsThisMonth)),   varPct(first.newSubscriptionsThisMonth,   last.newSubscriptionsThisMonth)],
    ['Clientes con plan',    ...results.map((r) => r.report.uniqueClientsWithPlan),        '—',                                                              varPct(first.uniqueClientsWithPlan,       last.uniqueClientsWithPlan)],
    ['Subs activas totales', ...results.map((r) => r.report.activeSubscriptionsTotal),    '—',                                                              varPct(first.activeSubscriptionsTotal,    last.activeSubscriptionsTotal)],
  ]);
  XLSX.utils.book_append_sheet(wb, s1, 'Resumen');

  // ── Sheet 2: Ingresos por Plan (columnas = meses) ──
  const planMeta = new Map<string, { name: string; currency: string }>();
  for (const { report } of results)
    for (const p of report.byPlan)
      if (!planMeta.has(p.planId)) planMeta.set(p.planId, { name: p.planName, currency: p.currency });

  const grandTotal = [...planMeta.keys()].reduce((acc, id) => {
    return acc + sumArr(results.map((r) => r.report.byPlan.find((p) => p.planId === id)?.revenue ?? 0));
  }, 0);

  const planRevRows = [...planMeta.entries()]
    .map(([id, meta]) => {
      const monthly = results.map((r) => r.report.byPlan.find((p) => p.planId === id)?.revenue ?? 0);
      const total   = sumArr(monthly);
      return { total, row: [meta.name, meta.currency, ...monthly, total, grandTotal > 0 ? `${((total / grandTotal) * 100).toFixed(1)}%` : '0%'] };
    })
    .sort((a, b) => b.total - a.total)
    .map((item, i) => [...item.row, i + 1]);

  const s2 = XLSX.utils.aoa_to_sheet([
    ['Plan', 'Moneda', ...mlbls, 'TOTAL', '% del Total', 'Ranking'],
    ...planRevRows,
  ]);
  XLSX.utils.book_append_sheet(wb, s2, 'Ingresos por Plan');

  // ── Sheet 3: Suscripciones por Plan (unidades vendidas) ──
  const planSubRows = [...planMeta.entries()]
    .map(([id, meta]) => {
      const monthly = results.map((r) => r.report.byPlan.find((p) => p.planId === id)?.count ?? 0);
      return [meta.name, ...monthly, sumArr(monthly), varPct(monthly[0], monthly[monthly.length - 1])];
    })
    .sort((a, b) => (b[b.length - 2] as number) - (a[a.length - 2] as number));

  const s3 = XLSX.utils.aoa_to_sheet([
    ['Plan', ...mlbls, 'TOTAL', 'Tendencia'],
    ...planSubRows,
  ]);
  XLSX.utils.book_append_sheet(wb, s3, 'Suscripciones por Plan');

  // ── Sheet 4: Top Clientes acumulado ──
  const clientAgg = new Map<string, { fullName: string; totalPaid: number; activePlansCount: number; activeSince: string; primaryCurrency: string }>();
  for (const { report } of results) {
    for (const c of report.topClients) {
      if (!clientAgg.has(c.userId)) {
        clientAgg.set(c.userId, { ...c });
      } else {
        const e = clientAgg.get(c.userId)!;
        e.totalPaid      += c.totalPaid;
        e.activePlansCount = Math.max(e.activePlansCount, c.activePlansCount);
        if (c.activeSince < e.activeSince) e.activeSince = c.activeSince;
      }
    }
  }

  const s4 = XLSX.utils.aoa_to_sheet([
    ['#', 'Cliente', 'Total Pagado', 'Moneda', 'Planes Activos (máx)', 'Cliente Desde'],
    ...[...clientAgg.values()]
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 20)
      .map((c, i) => [i + 1, c.fullName, c.totalPaid, c.primaryCurrency, c.activePlansCount, c.activeSince.slice(0, 10)]),
  ]);
  XLSX.utils.book_append_sheet(wb, s4, 'Top Clientes');

  // ── Sheet 5: Datos brutos (todos los meses) ──
  const allRaw = results.flatMap(({ month, report }) =>
    report.rawSubscriptions.map((r) => [
      formatMonthFull(month), r.id, r.clientName, r.planName,
      r.finalPrice ?? 0, r.currency,
      r.startDate.slice(0, 10), r.endDate?.slice(0, 10) ?? '', r.status,
    ]),
  );
  const s5 = XLSX.utils.aoa_to_sheet([
    ['Mes', 'ID', 'Cliente', 'Plan', 'Monto', 'Moneda', 'Fecha Inicio', 'Fecha Fin', 'Estado'],
    ...allRaw,
  ]);
  XLSX.utils.book_append_sheet(wb, s5, 'Datos Brutos');

  return xlsxToBase64(wb);
}

const RANGE_OPTIONS = [
  { label: 'Últimos 3 meses',  months: 3  },
  { label: 'Últimos 6 meses',  months: 6  },
  { label: 'Últimos 12 meses', months: 12 },
];

// ── Sub-components ─────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent: string }) {
  const T = useTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <Text style={[styles.kpiLabel, { color: T.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      {sub ? <Text style={[styles.kpiSub, { color: T.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  const T = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: T.text }]}>{title}</Text>
      {sub ? <Text style={[styles.sectionSub, { color: T.textMuted }]}>{sub}</Text> : null}
    </View>
  );
}

function TrendChart({ data }: { data: MonthTrend[] }) {
  const T = useTheme();
  const maxCRC = Math.max(...data.map((d) => d.totalCRC), 1);
  const maxUSD = Math.max(...data.map((d) => d.totalUSD), 1);
  const showUSD = data.some((d) => d.totalUSD > 0);

  return (
    <View style={[styles.trendBox, { backgroundColor: T.bgCard, borderColor: T.border }]}>
      <SectionTitle title="Tendencia de ingresos" sub="Últimos 6 meses" />
      <View style={styles.trendBars}>
        {data.map((d) => (
          <View key={d.month} style={styles.trendCol}>
            {showUSD && (
              <View
                style={[
                  styles.trendBarUSD,
                  { height: Math.max(4, (d.totalUSD / maxUSD) * 60), backgroundColor: T.accent + '66' },
                ]}
              />
            )}
            <View
              style={[
                styles.trendBarCRC,
                { height: Math.max(4, (d.totalCRC / maxCRC) * 80), backgroundColor: T.accent },
              ]}
            />
            <Text style={[styles.trendLabel, { color: T.textMuted }]}>{d.label}</Text>
            {(d.totalCRC > 0 || d.totalUSD > 0) && (
              <Text style={[styles.trendAmt, { color: T.textMuted }]}>
                {d.totalCRC > 0 ? fmtMoney(d.totalCRC, 'CRC') : fmtMoney(d.totalUSD, 'USD')}
              </Text>
            )}
          </View>
        ))}
      </View>
      {showUSD && (
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: T.accent }]} />
          <Text style={[styles.legendText, { color: T.textMuted }]}>CRC</Text>
          <View style={[styles.legendDot, { backgroundColor: T.accent + '66', marginLeft: 12 }]} />
          <Text style={[styles.legendText, { color: T.textMuted }]}>USD</Text>
        </View>
      )}
    </View>
  );
}

function PlanRow({ plan, maxRevenue }: { plan: PlanRevenueSummary; maxRevenue: number }) {
  const T = useTheme();
  const pct = maxRevenue > 0 ? plan.revenue / maxRevenue : 0;
  return (
    <View style={[styles.planRow, { borderBottomColor: T.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.planName, { color: T.text }]}>{plan.planName}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: T.accent }]} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
        <Text style={[styles.planRevenue, { color: T.accent }]}>{fmtMoney(plan.revenue, plan.currency)}</Text>
        <Text style={[styles.planCount, { color: T.textMuted }]}>{plan.count} suscrip.</Text>
      </View>
    </View>
  );
}

function ClientRow({ client, rank }: { client: TopClient; rank: number }) {
  const T = useTheme();
  const medalColors = ['#F59E0B', '#9CA3AF', '#92400E'];
  const rankColor   = rank <= 3 ? medalColors[rank - 1] : T.textMuted;
  const initials    = client.fullName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <View style={[styles.clientRow, { borderBottomColor: T.border }]}>
      <Text style={[styles.rank, { color: rankColor }]}>#{rank}</Text>
      <View style={[styles.clientAvatar, { backgroundColor: T.accentGlow }]}>
        <Text style={[styles.clientInitials, { color: T.accent }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.clientName, { color: T.text }]}>{client.fullName}</Text>
        <Text style={[styles.clientMeta, { color: T.textMuted }]}>
          {client.activePlansCount} plan{client.activePlansCount !== 1 ? 'es' : ''} · desde {fmtDate(client.activeSince)}
        </Text>
      </View>
      <Text style={[styles.clientTotal, { color: T.green }]}>
        {fmtMoney(client.totalPaid, client.primaryCurrency)}
      </Text>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────

export default function AdminRevenueScreen() {
  const T = useTheme();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id ?? '';

  const now = currentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState(now);
  const isCurrentMonth = selectedMonth === now;
  const canGoBack = selectedMonth > offsetMonth(now, -12);

  const [showCompModal, setShowCompModal]   = useState(false);
  const [isExporting,   setIsExporting]     = useState(false);
  const [exportRange,   setExportRange]     = useState<number | null>(null);

  const handleComparativeExport = async (rangeMonths: number) => {
    if (!tenantId) return;
    setExportRange(rangeMonths);
    setIsExporting(true);
    try {
      const months  = getMonthRange(now, rangeMonths);
      const base64  = await buildComparativeXLSX(tenantId, months);
      const filename = `comparativa_${months[0]}_a_${months[months.length - 1]}.xlsx`;
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error('Cache directory no disponible');
      const uri = cacheDir + filename;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.'); return; }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Comparativa ${rangeMonths} meses`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e: any) {
      Alert.alert('Error', `No se pudo generar el archivo comparativo: ${e?.message ?? ''}`);
    } finally {
      setIsExporting(false);
      setExportRange(null);
      setShowCompModal(false);
    }
  };

  const { data: report, isLoading, isFetching, refetch } = useRevenueReport(
    tenantId || undefined,
    selectedMonth,
  );

  const handleExport = async () => {
    if (!report) return;
    if (report.rawSubscriptions.length === 0) {
      Alert.alert('Sin datos', 'No hay suscripciones en este período para exportar.');
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary KPIs
      const resumenSheet = XLSX.utils.aoa_to_sheet([
        [`Reporte de Ingresos — ${formatMonthFull(selectedMonth)}`],
        [],
        ['Métrica', 'Valor'],
        ['Ingresos CRC (₡)', report.totalCRC],
        ['Ingresos USD ($)', report.totalUSD],
        ['Nuevas suscripciones', report.newSubscriptionsThisMonth],
        ['Clientes con plan activo', report.uniqueClientsWithPlan],
        ['Total suscripciones activas', report.activeSubscriptionsTotal],
      ]);
      XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');

      // Sheet 2: Raw subscriptions
      const subRows = report.rawSubscriptions.map((r) => [
        r.id,
        r.clientName,
        r.planName,
        r.finalPrice ?? 0,
        r.currency,
        r.startDate.slice(0, 10),
        r.endDate?.slice(0, 10) ?? '',
        r.status,
      ]);
      const subSheet = XLSX.utils.aoa_to_sheet([
        ['ID', 'Cliente', 'Plan', 'Monto', 'Moneda', 'Fecha Inicio', 'Fecha Fin', 'Estado'],
        ...subRows,
      ]);
      XLSX.utils.book_append_sheet(wb, subSheet, 'Suscripciones');

      // Sheet 3: Revenue by plan
      const planSheet = XLSX.utils.aoa_to_sheet([
        ['Plan', 'Moneda', 'Suscripciones', 'Ingresos'],
        ...report.byPlan.map((p) => [p.planName, p.currency, p.count, p.revenue]),
      ]);
      XLSX.utils.book_append_sheet(wb, planSheet, 'Por Plan');

      // Sheet 4: Top clients
      const clientSheet = XLSX.utils.aoa_to_sheet([
        ['#', 'Cliente', 'Total Pagado', 'Moneda', 'Planes Activos', 'Cliente Desde'],
        ...report.topClients.map((c, i) => [
          i + 1,
          c.fullName,
          c.totalPaid,
          c.primaryCurrency,
          c.activePlansCount,
          c.activeSince.slice(0, 10),
        ]),
      ]);
      XLSX.utils.book_append_sheet(wb, clientSheet, 'Top Clientes');

      const wbout = xlsxToBase64(wb);
      const filename = `ingresos_${selectedMonth}.xlsx`;
      const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!cacheDir) throw new Error(`Dir nulo. cache=${FileSystem.cacheDirectory} doc=${FileSystem.documentDirectory} fs=${typeof FileSystem}`);
      const uri = cacheDir + filename;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('No disponible', 'Compartir archivos no está disponible en este dispositivo.');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Ingresos ${formatMonthFull(selectedMonth)}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e: any) {
      Alert.alert('Error', `No se pudo generar el archivo Excel: ${e?.message ?? ''}`);
    }
  };

  const maxPlanRevenue = Math.max(...(report?.byPlan.map((p) => p.revenue) ?? [1]), 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />
      <AdminTopBar title="Ingresos" subtitle="Análisis financiero" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => refetch()} tintColor={T.accent} />}
      >
        {/* Month navigator */}
        <View style={[styles.monthNav, { backgroundColor: T.bgCard, borderColor: T.border }]}>
          <TouchableOpacity
            onPress={() => canGoBack && setSelectedMonth(offsetMonth(selectedMonth, -1))}
            style={[styles.navBtn, !canGoBack && { opacity: 0.3 }]}
            disabled={!canGoBack}
          >
            <Text style={{ color: T.accent, fontSize: 18, fontWeight: '700' }}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: T.text }]}>{formatMonthFull(selectedMonth)}</Text>
          <TouchableOpacity
            onPress={() => !isCurrentMonth && setSelectedMonth(offsetMonth(selectedMonth, 1))}
            style={[styles.navBtn, isCurrentMonth && { opacity: 0.3 }]}
            disabled={isCurrentMonth}
          >
            <Text style={{ color: T.accent, fontSize: 18, fontWeight: '700' }}>›</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={T.accent} size="large" />
            <Text style={{ color: T.textMuted, marginTop: 12, fontSize: 13 }}>Cargando reporte...</Text>
          </View>
        ) : !report ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ color: T.red, fontSize: 14 }}>No se pudo cargar el reporte</Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
              <Text style={{ color: T.accent, fontWeight: '600' }}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── KPI Grid ── */}
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Ingresos (₡)"
                value={fmtMoney(report.totalCRC, 'CRC')}
                sub="en colones"
                accent={T.green}
              />
              <KpiCard
                label="Ingresos ($)"
                value={report.totalUSD > 0 ? fmtMoney(report.totalUSD, 'USD') : '—'}
                sub="en dólares"
                accent={T.accent}
              />
              <KpiCard
                label="Nuevas suscrip."
                value={report.newSubscriptionsThisMonth}
                sub={`este mes`}
                accent={T.orange}
              />
              <KpiCard
                label="Clientes con plan"
                value={report.uniqueClientsWithPlan}
                sub={`${report.activeSubscriptionsTotal} subs activas`}
                accent={T.purple}
              />
            </View>

            {/* ── Revenue trend ── */}
            {report.trend.length > 1 && <TrendChart data={report.trend} />}

            {/* ── By plan ── */}
            <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              <SectionTitle
                title="Ingresos por plan"
                sub={`${formatMonthFull(selectedMonth)} · ${report.newSubscriptionsThisMonth} suscripción${report.newSubscriptionsThisMonth !== 1 ? 'es' : ''} nuevas`}
              />
              {report.byPlan.length === 0 ? (
                <Text style={[styles.emptyText, { color: T.textMuted }]}>Sin ingresos este mes</Text>
              ) : (
                report.byPlan.map((plan) => (
                  <PlanRow key={plan.planId} plan={plan} maxRevenue={maxPlanRevenue} />
                ))
              )}
            </View>

            {/* ── Top 10 clients ── */}
            <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              <SectionTitle
                title="Top 10 clientes"
                sub="Por monto total pagado · planes activos"
              />
              {report.topClients.length === 0 ? (
                <Text style={[styles.emptyText, { color: T.textMuted }]}>Sin clientes con planes activos</Text>
              ) : (
                report.topClients.map((client, i) => (
                  <ClientRow key={client.userId} client={client} rank={i + 1} />
                ))
              )}
            </View>

            {/* ── Summary totals (all active) ── */}
            <View style={[styles.section, { backgroundColor: T.bgCard, borderColor: T.border }]}>
              <SectionTitle title="Resumen acumulado" sub="Todas las suscripciones activas" />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>Total clientes con plan activo</Text>
                <Text style={[styles.summaryValue, { color: T.text }]}>{report.uniqueClientsWithPlan}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>Total suscripciones activas</Text>
                <Text style={[styles.summaryValue, { color: T.text }]}>{report.activeSubscriptionsTotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: T.textSecondary }]}>Promedio por cliente</Text>
                <Text style={[styles.summaryValue, { color: T.text }]}>
                  {report.uniqueClientsWithPlan > 0
                    ? (report.activeSubscriptionsTotal / report.uniqueClientsWithPlan).toFixed(1)
                    : '—'} planes
                </Text>
              </View>
            </View>

            {/* ── Export: mes actual ── */}
            <TouchableOpacity
              onPress={handleExport}
              style={[styles.exportBtn, { backgroundColor: T.bgCard, borderColor: T.accent + '55' }]}
            >
              <Text style={{ fontSize: 18 }}>📥</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.exportTitle, { color: T.text }]}>Exportar mes actual (.xlsx)</Text>
                <Text style={[styles.exportSub, { color: T.textMuted }]}>
                  {report.rawSubscriptions.length} registro{report.rawSubscriptions.length !== 1 ? 's' : ''} · {formatMonthFull(selectedMonth)}
                </Text>
              </View>
              <Text style={[styles.exportArrow, { color: T.accent }]}>→</Text>
            </TouchableOpacity>

            {/* ── Export: comparativa multi-mes ── */}
            <TouchableOpacity
              onPress={() => setShowCompModal(true)}
              style={[styles.exportBtn, { backgroundColor: T.bgCard, borderColor: T.purple + '55' }]}
            >
              <Text style={{ fontSize: 18 }}>📊</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.exportTitle, { color: T.text }]}>Exportar comparativa multi-mes</Text>
                <Text style={[styles.exportSub, { color: T.textMuted }]}>
                  Análisis por plan, tendencia y top clientes
                </Text>
              </View>
              <Text style={[styles.exportArrow, { color: T.purple }]}>→</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
      {/* ── Comparative export modal ── */}
      <Modal visible={showCompModal} transparent animationType="fade" onRequestClose={() => !isExporting && setShowCompModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: T.bgCard, borderColor: T.border }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Exportar comparativa</Text>
            <Text style={[styles.modalSub, { color: T.textMuted }]}>
              Genera un Excel con 5 hojas:{'\n'}Resumen · Ingresos por Plan · Suscripciones · Top Clientes · Datos Brutos
            </Text>

            {isExporting ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator color={T.accent} size="large" />
                <Text style={{ color: T.textMuted, marginTop: 12, fontSize: 13 }}>
                  Generando comparativa de {exportRange} meses...
                </Text>
              </View>
            ) : (
              <>
                {RANGE_OPTIONS.map((opt) => {
                  const months = getMonthRange(now, opt.months);
                  return (
                    <TouchableOpacity
                      key={opt.months}
                      onPress={() => handleComparativeExport(opt.months)}
                      style={[styles.rangeBtn, { borderColor: T.border, backgroundColor: T.bg }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rangeBtnLabel, { color: T.text }]}>{opt.label}</Text>
                        <Text style={[styles.rangeBtnSub, { color: T.textMuted }]}>
                          {formatMonthFull(months[0])} → {formatMonthFull(months[months.length - 1])}
                        </Text>
                      </View>
                      <Text style={{ color: T.accent, fontSize: 18 }}>↓</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  onPress={() => setShowCompModal(false)}
                  style={[styles.cancelBtn, { borderColor: T.border }]}
                >
                  <Text style={{ color: T.textMuted, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 16,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: {
    width: '47.5%', borderRadius: 12, borderWidth: 1,
    padding: 14, minHeight: 80,
  },
  kpiLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  kpiSub:   { fontSize: 10, fontWeight: '500' },

  trendBox: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 12, height: 100 },
  trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBarCRC: { width: '100%', borderRadius: 4, marginBottom: 4 },
  trendBarUSD: { width: '70%', borderRadius: 4, marginBottom: 2 },
  trendLabel: { fontSize: 9, fontWeight: '600', marginTop: 4 },
  trendAmt:   { fontSize: 8, marginTop: 1 },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, marginLeft: 4 },

  section: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  sectionSub:   { fontSize: 11, marginTop: 2 },

  planRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  planName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill:  { height: 6, borderRadius: 3 },
  planRevenue: { fontSize: 15, fontWeight: '800' },
  planCount:   { fontSize: 11, marginTop: 2 },

  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank:           { fontSize: 13, fontWeight: '800', width: 28, textAlign: 'right' },
  clientAvatar:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clientInitials: { fontSize: 12, fontWeight: '800' },
  clientName:     { fontSize: 13, fontWeight: '700' },
  clientMeta:     { fontSize: 11, marginTop: 1 },
  clientTotal:    { fontSize: 14, fontWeight: '800' },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  exportBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    borderWidth: 1, padding: 16, marginBottom: 8,
  },
  exportTitle: { fontSize: 14, fontWeight: '700' },
  exportSub:   { fontSize: 11, marginTop: 2 },
  exportArrow: { fontSize: 16, fontWeight: '700' },

  emptyText: { fontSize: 13, paddingVertical: 12, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalSub:   { fontSize: 13, lineHeight: 19, marginBottom: 20 },

  rangeBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    padding: 14, marginBottom: 10,
  },
  rangeBtnLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rangeBtnSub:   { fontSize: 11 },

  cancelBtn: {
    borderRadius: 12, borderWidth: 1,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
});
