import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, HeartPulse, Droplet, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';

interface StatsData {
  totalDonors: number;
  totalRecipients: number;
  totalUnits: number;
  pendingRequests: number;
  recentDonations: number;
  lowStockGroups: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalDonors: 0,
    totalRecipients: 0,
    totalUnits: 0,
    pendingRequests: 0,
    recentDonations: 0,
    lowStockGroups: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch counts in parallel
      const [donorsRes, recipientsRes, stockRes, requestsRes, donationsRes] = await Promise.all([
        supabase.from('donors').select('*', { count: 'exact', head: true }),
        supabase.from('recipients').select('*', { count: 'exact', head: true }),
        supabase.from('blood_stock').select('*'),
        supabase.from('blood_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('donations').select('*', { count: 'exact', head: true }).gte('donation_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const totalUnits = stockRes.data?.reduce((sum, stock) => sum + stock.units_available, 0) || 0;
      const lowStock = stockRes.data?.filter(s => s.units_available < s.low_stock_threshold).map(s => s.blood_group) || [];

      setStats({
        totalDonors: donorsRes.count || 0,
        totalRecipients: recipientsRes.count || 0,
        totalUnits,
        pendingRequests: requestsRes.count || 0,
        recentDonations: donationsRes.count || 0,
        lowStockGroups: lowStock,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Donors',
      value: stats.totalDonors,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Recipients',
      value: stats.totalRecipients,
      icon: HeartPulse,
      color: 'text-info-cyan',
      bgColor: 'bg-info-cyan/10',
    },
    {
      title: 'Blood Units Available',
      value: stats.totalUnits,
      icon: Droplet,
      color: 'text-blood-red',
      bgColor: 'bg-blood-red/10',
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests,
      icon: FileText,
      color: 'text-warning-yellow',
      bgColor: 'bg-warning-yellow/10',
    },
    {
      title: 'Donations (Last 7 Days)',
      value: stats.recentDonations,
      icon: TrendingUp,
      color: 'text-success-green',
      bgColor: 'bg-success-green/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of blood bank operations</p>
      </div>

      {stats.lowStockGroups.length > 0 && (
        <Card className="border-warning-yellow bg-warning-yellow/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning-yellow" />
              <CardTitle className="text-lg">Low Stock Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">The following blood groups are running low on stock:</p>
            <div className="flex flex-wrap gap-2">
              {stats.lowStockGroups.map((group) => (
                <Badge key={group} variant="destructive">{group}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}