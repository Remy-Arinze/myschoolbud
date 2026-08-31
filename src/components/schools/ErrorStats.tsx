'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useGetSchoolErrorStatsQuery } from '@/lib/store/api/operationsApi';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';

interface ErrorStatsProps {
  schoolId: string;
}

export function ErrorStats({ schoolId }: ErrorStatsProps) {
  const { data: response, isLoading, error } = useGetSchoolErrorStatsQuery({
    schoolId,
    days: 30,
  });

  // Stats should already be unwrapped by transformResponse, but add fallback
  const stats = response;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p style={{ fontSize: 'var(--text-body)' }}>Loading statistics...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats || !stats.bySeverity || !stats.byStatus) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p style={{ fontSize: 'var(--text-body)' }}>Failed to load statistics</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts with safe defaults
  const severityData = [
    { name: 'Low', value: stats.bySeverity?.LOW || 0 },
    { name: 'Medium', value: stats.bySeverity?.MEDIUM || 0 },
    { name: 'High', value: stats.bySeverity?.HIGH || 0 },
    { name: 'Critical', value: stats.bySeverity?.CRITICAL || 0 },
  ].filter((item) => item.value > 0);

  const statusData = [
    { name: 'Unresolved', value: stats.byStatus?.UNRESOLVED || 0 },
    { name: 'Investigating', value: stats.byStatus?.INVESTIGATING || 0 },
    { name: 'Resolved', value: stats.byStatus?.RESOLVED || 0 },
    { name: 'Ignored', value: stats.byStatus?.IGNORED || 0 },
  ].filter((item) => item.value > 0);

  // Prepare trend data for area chart
  const trendData = (stats.recentTrends || []).map((item: any) => ({
    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    errors: item.count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p
              className="text-gray-600 dark:text-dark-text-secondary mb-1"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Total Errors
            </p>
            <p
              className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary"
              style={{ fontSize: 'var(--text-stat-value)' }}
            >
              {stats.total || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p
              className="text-gray-600 dark:text-dark-text-secondary mb-1"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Critical
            </p>
            <p
              className="text-2xl font-bold text-red-600 dark:text-red-400"
              style={{ fontSize: 'var(--text-stat-value)' }}
            >
              {stats.bySeverity?.CRITICAL || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p
              className="text-gray-600 dark:text-dark-text-secondary mb-1"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Unresolved
            </p>
            <p
              className="text-2xl font-bold text-orange-600 dark:text-orange-400"
              style={{ fontSize: 'var(--text-stat-value)' }}
            >
              {stats.byStatus?.UNRESOLVED || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p
              className="text-gray-600 dark:text-dark-text-secondary mb-1"
              style={{ fontSize: 'var(--text-small)' }}
            >
              Resolved
            </p>
            <p
              className="text-2xl font-bold text-green-600 dark:text-green-400"
              style={{ fontSize: 'var(--text-stat-value)' }}
            >
              {stats.byStatus?.RESOLVED || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="Errors by Severity"
          description="Distribution of errors by severity level"
          data={severityData}
          type="donut"
          dataKeys={['value']}
          colors={['#eab308', '#f97316', '#ef4444', '#991b1b']}
        />
        <AnalyticsChart
          title="Errors by Status"
          description="Distribution of errors by resolution status"
          data={statusData}
          type="pie"
          dataKeys={['value']}
          colors={['#6b7280', '#3b82f6', '#10b981', '#9ca3af']}
        />
      </div>

      {/* Recent Trends */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                Recent Trends (Last 7 Days)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              title=""
              description=""
              data={trendData}
              type="area"
              dataKeys={['errors']}
              colors={['#ef4444']}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Error Types */}
      {stats.topErrorTypes && stats.topErrorTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Top Error Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topErrorTypes.slice(0, 10).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-dark-border rounded-lg"
                >
                  <span
                    className="font-mono text-gray-900 dark:text-dark-text-primary"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {item.errorType}
                  </span>
                  <span
                    className="font-semibold text-gray-600 dark:text-dark-text-secondary"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
