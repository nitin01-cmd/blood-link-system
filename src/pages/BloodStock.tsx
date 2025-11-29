import { useEffect, useState } from 'react';
import { Droplet, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodGroup = typeof bloodGroups[number];

export default function BloodStock() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    blood_group: BloodGroup | '';
    units: string;
  }>({
    blood_group: '',
    units: '',
  });

  useEffect(() => {
    fetchStock();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('blood-stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blood_stock'
        },
        () => {
          fetchStock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_stock')
        .select('*')
        .order('blood_group');

      if (error) throw error;
      setStock(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.blood_group || !formData.units) return;

    try {
      const unitsToAdd = parseInt(formData.units);
      if (isNaN(unitsToAdd) || unitsToAdd <= 0) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please enter a valid number of units',
        });
        return;
      }

      const currentStock = stock.find(s => s.blood_group === formData.blood_group);
      
      const { error } = await supabase
        .from('blood_stock')
        .update({ 
          units_available: (currentStock?.units_available || 0) + unitsToAdd 
        })
        .eq('blood_group', formData.blood_group);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Added ${unitsToAdd} units of ${formData.blood_group}`,
      });

      setOpen(false);
      setFormData({ blood_group: '', units: '' });
      fetchStock();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getStockStatus = (stock: any) => {
    if (stock.units_available === 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    } else if (stock.units_available < stock.low_stock_threshold) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalUnits = stock.reduce((sum, s) => sum + s.units_available, 0);
  const lowStockCount = stock.filter(s => s.units_available < s.low_stock_threshold).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Blood Stock Monitoring</h1>
          <p className="text-muted-foreground">Track and manage blood inventory levels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Blood Stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group *</Label>
                <Select
                  value={formData.blood_group}
                  onValueChange={(value) => setFormData({ ...formData, blood_group: value as BloodGroup })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="units">Units to Add *</Label>
                <Input
                  id="units"
                  type="number"
                  min="1"
                  value={formData.units}
                  onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Stock</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Units Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-success-green" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all blood groups</p>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? 'border-warning-yellow bg-warning-yellow/5' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Blood groups below threshold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stock.map((item) => {
          const status = getStockStatus(item);
          return (
            <Card key={item.blood_group} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplet className="h-5 w-5 text-blood-red" />
                    <CardTitle className="text-2xl font-bold">{item.blood_group}</CardTitle>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-semibold">{item.units_available} units</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Threshold:</span>
                    <span>{item.low_stock_threshold} units</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}