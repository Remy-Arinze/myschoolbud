'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { 
  Smartphone, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  Calendar as CalendarIcon,
  Search,
  ArrowRight,
  Filter
} from 'lucide-react';
import { 
  useGetMyClassesQuery, 
  useGetMyTeacherSchoolQuery,
  useGetMyTeacherProfileQuery,
  useGetClassAttendanceSummaryQuery 
} from '@/lib/store/api/schoolAdminApi';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RollCallOverviewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
  const { data: teacherResponse } = useGetMyTeacherProfileQuery();
  const schoolId = schoolResponse?.data?.id;
  const teacherId = teacherResponse?.data?.id;

  const { data: classesResponse, isLoading: isLoadingClasses } = useGetMyClassesQuery(
    { schoolId: schoolId!, teacherId: teacherId! },
    { skip: !schoolId || !teacherId }
  );

  const classes = classesResponse?.data || [];

  const filteredClasses = useMemo(() => {
    return classes.filter((c: any) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.classLevel?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  const handleExport = (classData: any) => {
    // Mock export functionality
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Student Name,UID,Present,Absent,Late,Total\n"
      + "Sample Student,UID123,10,2,1,13";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${classData.name}_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProtectedRoute roles={['TEACHER']}>
      <div className="w-full space-y-8">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-sm">
                <Smartphone className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                  Roll Call Overview
                </h1>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  Monitor attendance patterns across all your classes
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-light-card dark:bg-dark-surface p-2 rounded-lg border border-light-border dark:border-dark-border shadow-sm">
                <CalendarIcon className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent border-none text-sm focus:ring-0"
                />
                <span className="text-light-text-muted">to</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent border-none text-sm focus:ring-0"
                />
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-light-card dark:bg-dark-surface p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
            <Input
              placeholder="Search classes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
            <Button variant="primary" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Bulk Export (All)
            </Button>
          </div>
        </div>

        {/* Class Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoadingClasses ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-64" />
              </Card>
            ))
          ) : filteredClasses.map((item: any) => (
            <ClassSummaryCard 
              key={item.id} 
              classData={item} 
              schoolId={schoolId!} 
              startDate={dateRange.start}
              endDate={dateRange.end}
              onExport={() => handleExport(item)}
            />
          ))}

          {!isLoadingClasses && filteredClasses.length === 0 && (
            <div className="col-span-full text-center py-20 bg-light-card dark:bg-dark-surface rounded-2xl border border-dashed border-light-border dark:border-dark-border">
              <Users className="h-16 w-16 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">No Classes Found</h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                You are not currently assigned to any classes as a teacher.
              </p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ClassSummaryCard({ 
  classData, 
  schoolId, 
  startDate, 
  endDate,
  onExport 
}: { 
  classData: any, 
  schoolId: string, 
  startDate: string,
  endDate: string,
  onExport: () => void
}) {
  const { data: summaryResponse, isLoading } = useGetClassAttendanceSummaryQuery(
    {
      schoolId,
      classId: classData.id,
      classType: classData.type === 'TERTIARY' ? 'CLASS' : 'CLASS_ARM',
      startDate,
      endDate
    },
    { skip: !schoolId || !classData.id }
  );

  const summary = summaryResponse?.data || [];
  
  const totalStudents = summary.length;
  const avgAttendance = useMemo(() => {
    if (totalStudents === 0) return 0;
    const totalPresent = summary.reduce((acc: number, s: any) => acc + (s.present / (s.total || 1)), 0);
    return Math.round((totalPresent / totalStudents) * 100);
  }, [summary, totalStudents]);

  return (
    <FadeInUp>
      <Card className="h-full hover:shadow-lg transition-all duration-300 group border-light-border dark:border-dark-border overflow-hidden">
        <div className="h-1.5 bg-blue-500 w-full" />
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {classData.name}
              </CardTitle>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {classData.classLevel || classData.code} • {classData.academicYear}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-dark-surface rounded-lg">
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">Avg. Attendance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{isLoading ? '...' : `${avgAttendance}%`}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-dark-surface rounded-lg">
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mb-1">Total Students</p>
              <p className="text-2xl font-bold">{classData.studentsCount || totalStudents}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium">Performance Level</span>
              <span className={cn(
                "font-bold",
                avgAttendance >= 90 ? "text-green-600" : avgAttendance >= 75 ? "text-blue-600" : "text-amber-600"
              )}>
                {avgAttendance >= 90 ? 'Excellent' : avgAttendance >= 75 ? 'Good' : 'Needs Attention'}
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-dark-surface/50 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-1000",
                  avgAttendance >= 90 ? "bg-green-500" : avgAttendance >= 75 ? "bg-blue-500" : "bg-amber-500"
                )}
                style={{ width: `${avgAttendance}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-light-border dark:border-dark-border">
            <Link href={`/dashboard/teacher/classes/${classData.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Take Roll Call
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onExport} title="Download Report">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeInUp>
  );
}
