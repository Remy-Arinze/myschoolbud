import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useGetLoginSessionsQuery } from '@/lib/store/api/apiSlice';
import { Shield, Clock, Monitor, Globe, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Calendar, User } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface SessionLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionLogsModal({ isOpen, onClose }: SessionLogsModalProps) {
  // Null means the reader has not opened or closed anything yet, which is how
  // the most recent day can default to open without writing state during render.
  const [expandedDates, setExpandedDates] = useState<string[] | null>(null);

  const { data: response, isLoading, isError, refetch } = useGetLoginSessionsQuery(undefined, {
    skip: !isOpen,
  });

  const sessions = response?.data || [];

  const groupedSessions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    sessions.forEach((session: any) => {
      const dateKey = format(new Date(session.usedAt), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });
    return groups;
  }, [sessions]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedSessions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedSessions]);

  // The most recent date is open until the reader says otherwise.
  const defaultExpanded = useMemo(
    () => (sortedDates.length > 0 ? [sortedDates[0]] : []),
    [sortedDates]
  );
  const visibleDates = expandedDates ?? defaultExpanded;

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const current = prev ?? defaultExpanded;
      return current.includes(date)
        ? current.filter((d) => d !== date)
        : [...current, date];
    });
  };

  const parseUserAgent = (ua: string) => {
    if (!ua || ua === 'unknown') return { browser: 'Unknown Device', os: 'Cloud Access' };

    let browser = 'Web Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    let os = 'System';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { browser, os };
  };

  const now = new Date();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <span>Security Audit Log</span>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary max-w-[450px]">
            Review your account access history below. Logins are grouped by date for better visibility.
          </p>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Live Logs</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-light-text-muted animate-pulse font-medium">Analyzing access patterns...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-red-900 dark:text-red-100">Sync Error</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-6">
              Unable to reach the security gateway. Please check your connection.
            </p>
            <button
              onClick={() => refetch()}
              className="px-8 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
            >
              Retry Connection
            </button>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-light-border dark:border-dark-border rounded-[2rem]">
            <Clock className="h-16 w-16 text-light-text-muted mx-auto mb-4 opacity-20" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium">No recent security events detected.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar pb-4">
            {sortedDates.map((date) => {
              const daySessions = groupedSessions[date];
              const isExpanded = visibleDates.includes(date);
              const formattedDate = isSameDay(new Date(date), now)
                ? "Today's Access"
                : format(new Date(date), 'EEEE, MMM dd, yyyy');

              return (
                <div
                  key={date}
                  className={cn(
                    "rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
                    isExpanded
                      ? "bg-white dark:bg-gray-800/20 border-blue-200 dark:border-blue-900/30 shadow-xl shadow-blue-500/5"
                      : "bg-gray-50 dark:bg-gray-800/10 border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  )}
                >
                  <button
                    onClick={() => toggleDate(date)}
                    className="w-full flex items-center justify-between p-5 hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        isExpanded ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-700"
                      )}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-light-text-primary dark:text-white">
                          {formattedDate}
                        </h4>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          {daySessions.length} Login Attempt{daySessions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 opacity-40" /> : <ChevronDown className="h-5 w-5 opacity-40" />}
                  </button>

                  <div className={cn(
                    "transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                  )}>
                    <div className="p-5 pt-0 space-y-3">
                      {daySessions.map((session: any, idx: number) => {
                        const { browser, os } = parseUserAgent(session.userAgent);
                        const isLatestInDay = idx === 0;
                        const isMainUser = session.user?.firstName && session.user?.lastName;
                        const userName = isMainUser
                          ? `${session.user.firstName} ${session.user.lastName}`
                          : 'Unknown Admin';

                        return (
                          <div
                            key={session.id}
                            className="bg-white dark:bg-gray-900/30 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg shrink-0">
                                  <Monitor className="h-5 w-5 text-gray-500" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-light-text-primary dark:text-white">
                                      {browser} on {os}
                                    </span>
                                    {isLatestInDay && isSameDay(new Date(date), now) && (
                                      <span className="px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[9px] font-black uppercase rounded">
                                        Current
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <div className="flex items-center gap-1 text-[11px] text-light-text-muted">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium text-gray-600 dark:text-gray-400">{userName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-light-text-muted">
                                      <Clock className="h-2.5 w-2.5" />
                                      <span>{format(new Date(session.usedAt), 'hh:mm a')}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] text-light-text-muted">
                                      <Globe className="h-2.5 w-2.5" />
                                      <span>{session.ipAddress || 'Internal IP'}</span>
                                    </div>
                                  </div>

                                  <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono italic mt-1 bg-gray-50 dark:bg-gray-900/50 px-2 py-0.5 rounded border border-gray-200/50 dark:border-gray-800/50 truncate max-w-[350px]">
                                    {session.userAgent}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && (
          <div className="pt-4 border-t border-light-border dark:border-dark-border flex justify-between items-center">
            <p className="text-[11px] text-light-text-muted italic">
              * All timestamps are in your local timezone. Access history is preserved for 30 days.
            </p>
            <button
              onClick={onClose}
              className="px-10 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              Finished Review
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
