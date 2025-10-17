import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import TransferManagement from "@/components/transfer-management";
import TerminationManagement from "@/components/termination-management";
import AssetManagement from "@/components/asset-management";
import HRAttendanceView from "@/components/hr-attendance-view";
import OnboardingManagement from "@/components/onboarding-management";
import HREmployeeManagement from "@/components/hr-employee-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from "recharts";
import { UserCheck, CalendarX, UserX, ArrowLeftRight, UserPlus, Laptop, Clock, Users, Search, Bell, Settings, BarChart3, PieChart as PieChartIcon, TrendingUp, TrendingDown, ChevronRight, Home, Calendar, HelpCircle, Monitor, Briefcase, DollarSign, FileText, BookOpen, Database } from "lucide-react";
import type { User, Attendance } from "@shared/schema";

export default function HRDashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('dashboard');

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeView]);

  const { data: attendanceRecords = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/today"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user?.role !== 'hr' && user?.role !== 'admin') {
    return <div className="text-center py-8">Access denied. HR role required.</div>;
  }

  // Count unique users for each status to avoid duplicate records
  const presentToday = new Set(attendanceRecords.filter(record => record.status === 'at work' || record.status === 'at work (remote)' || record.status === 'present').map(r => r.userId)).size;
  const onLeave = new Set(attendanceRecords.filter(record => record.status === 'leave').map(r => r.userId)).size;
  const absent = new Set(attendanceRecords.filter(record => record.status !== 'at work' && record.status !== 'at work (remote)' && record.status !== 'present' && record.status !== 'late').map(r => r.userId)).size;
  const totalEmployees = allUsers.filter(u => u.isActive).length;

  // Sample data for charts
  const attendanceData = [
    { month: 'Jan', present: 85, absent: 15 },
    { month: 'Feb', present: 88, absent: 12 },
    { month: 'Mar', present: 92, absent: 8 },
    { month: 'Apr', present: 87, absent: 13 },
    { month: 'May', present: 95, absent: 5 },
    { month: 'Jun', present: 89, absent: 11 },
  ];

  const departmentData = [
    { name: 'HR', value: 15, color: '#8884d8' },
    { name: 'IT', value: 25, color: '#82ca9d' },
    { name: 'Sales', value: 35, color: '#ffc658' },
    { name: 'Support', value: 25, color: '#ff7c7c' },
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  const sidebarItems = [
    {
      title: 'HR MANAGEMENT',
      items: [
        { icon: Home, label: 'Dashboard', key: 'dashboard' },
        { icon: Monitor, label: 'Attendance', key: 'attendance' },
        { icon: ArrowLeftRight, label: 'Transfers', key: 'transfers' },
        { icon: UserX, label: 'Terminations', key: 'terminations' },
        { icon: Briefcase, label: 'Assets', key: 'assets' },
        { icon: Users, label: 'Employees', key: 'employees' },
        { icon: UserPlus, label: 'Onboarding', key: 'onboarding' },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { icon: BarChart3, label: 'Analytics', key: 'analytics' },
        { icon: FileText, label: 'Reports', key: 'reports' },
        { icon: Database, label: 'Export Data', key: 'export' },
      ]
    }
  ];

  const renderMainContent = () => {
    switch(activeView) {
      case 'attendance':
        return <HRAttendanceView />;
      case 'transfers':
        return <TransferManagement />;
      case 'terminations':
        return <TerminationManagement />;
      case 'assets':
        return <AssetManagement showActions={true} />;
      case 'onboarding':
        return <OnboardingManagement />;
      case 'employees':
        return <HREmployeeManagement />;
      default:
        return (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user?.firstName || 'HR Manager'}</h2>
                  <p className="text-blue-600 dark:text-blue-400">Here's your workforce overview for today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 dark:text-green-400 text-sm font-medium">Present Today</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300">{presentToday}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-600 dark:text-green-400">+5% from yesterday</span>
                      </div>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full">
                      <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">Total Employees</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalEmployees}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-blue-600 dark:text-blue-400">Active workforce</span>
                      </div>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">On Leave</p>
                      <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{onLeave}</p>
                      <div className="flex items-center mt-2">
                        <CalendarX className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-yellow-600 dark:text-yellow-400">Planned absences</span>
                      </div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full">
                      <CalendarX className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200 dark:border-red-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-600 dark:text-red-400 text-sm font-medium">Absent</p>
                      <p className="text-3xl font-bold text-red-700 dark:text-red-300">{absent}</p>
                      <div className="flex items-center mt-2">
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-600 dark:text-red-400">Unplanned absences</span>
                      </div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full">
                      <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Attendance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="h-5 w-5 mr-2 text-purple-600" />
                    Department Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center space-x-4 mt-4">
                    {departmentData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => setActiveView('attendance')}
                  >
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-1" />
                      <span className="text-sm">View Attendance</span>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
                    onClick={() => setActiveView('transfers')}
                  >
                    <div className="text-center text-purple-600">
                      <ArrowLeftRight className="h-6 w-6 mx-auto mb-1" />
                      <span className="text-sm">Manage Transfers</span>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-16 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-300"
                    onClick={() => setActiveView('terminations')}
                  >
                    <div className="text-center text-red-600">
                      <UserX className="h-6 w-6 mx-auto mb-1" />
                      <span className="text-sm">Process Terminations</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <>
      {user?.role === 'admin' && <Navigation user={user} />}
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pulse HR</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Workforce Management</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search anything.." 
              className="pl-10 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
            />
          </div>
          
          <nav className="space-y-6">
            {sidebarItems.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;
                    return (
                      <li key={item.key}>
                        <button
                          onClick={() => setActiveView(item.key)}
                          className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                            isActive 
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon className={`mr-3 h-5 w-5 ${
                            isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          }`} />
                          {item.label}
                          {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeView === 'dashboard' ? 'HR Dashboard' : 
                 activeView === 'attendance' ? 'Attendance Management' :
                 activeView === 'transfers' ? 'Employee Transfers' :
                 activeView === 'terminations' ? 'Termination Management' :
                 activeView === 'assets' ? 'Asset Management' :
                 'HR Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {activeView === 'dashboard' ? 'Manage employee lifecycle and workforce operations' :
                 activeView === 'attendance' ? 'Track and manage employee attendance' :
                 activeView === 'transfers' ? 'Handle employee department and role transfers' :
                 activeView === 'terminations' ? 'Process employee terminations and offboarding' :
                 activeView === 'assets' ? 'Manage and assign company assets' :
                 'Workforce management tools'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.firstName?.charAt(0) || 'H'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName || 'HR'} {user?.lastName || 'Manager'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </main>
      </div>
    </div>
    </>
  );
}
