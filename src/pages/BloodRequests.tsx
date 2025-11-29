import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodGroup = typeof bloodGroups[number];

export default function BloodRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState<{
    recipient_id: string;
    blood_group: BloodGroup | '';
    units_requested: string;
    urgency_level: string;
    required_by_date: string;
    notes: string;
  }>({
    recipient_id: '',
    blood_group: '',
    units_requested: '',
    urgency_level: 'routine',
    required_by_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchRequests();
    fetchRecipients();
  }, []);

  useEffect(() => {
    const filtered = requests.filter((req) => {
      const recipientName = recipients.find(r => r.id === req.recipient_id)?.full_name || '';
      return (
        recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.blood_group.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    setFilteredRequests(filtered);
  }, [searchTerm, requests, recipients]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      setFilteredRequests(data || []);
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

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setRecipients(data || []);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient_id || !formData.blood_group || !formData.units_requested) return;

    try {
      const { error } = await supabase.from('blood_requests').insert([
        {
          recipient_id: formData.recipient_id,
          blood_group: formData.blood_group as BloodGroup,
          units_requested: parseInt(formData.units_requested),
          urgency_level: formData.urgency_level,
          required_by_date: formData.required_by_date || null,
          notes: formData.notes || null,
          created_by: user?.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blood request created successfully!',
      });

      setOpen(false);
      setFormData({
        recipient_id: '',
        blood_group: '',
        units_requested: '',
        urgency_level: 'routine',
        required_by_date: '',
        notes: '',
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: 'pending' | 'approved' | 'issued' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('blood_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Request status updated successfully!',
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      approved: 'default',
      issued: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, any> = {
      routine: 'outline',
      urgent: 'secondary',
      emergency: 'destructive',
    };
    return <Badge variant={variants[urgency] || 'outline'}>{urgency}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Blood Requests</h1>
          <p className="text-muted-foreground">Manage blood requests from recipients</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Blood Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="recipient_id">Recipient *</Label>
                  <Select
                    value={formData.recipient_id}
                    onValueChange={(value) => {
                      const recipient = recipients.find(r => r.id === value);
                      setFormData({ 
                        ...formData, 
                        recipient_id: value,
                        blood_group: recipient?.blood_group || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          {recipient.full_name} - {recipient.blood_group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label htmlFor="units_requested">Units Requested *</Label>
                  <Input
                    id="units_requested"
                    type="number"
                    min="1"
                    value={formData.units_requested}
                    onChange={(e) => setFormData({ ...formData, units_requested: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency_level">Urgency Level *</Label>
                  <Select
                    value={formData.urgency_level}
                    onValueChange={(value) => setFormData({ ...formData, urgency_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="required_by_date">Required By Date</Label>
                  <Input
                    id="required_by_date"
                    type="date"
                    value={formData.required_by_date}
                    onChange={(e) => setFormData({ ...formData, required_by_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional information..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search requests by recipient, blood group, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const recipient = recipients.find(r => r.id === request.recipient_id);
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{recipient?.full_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.blood_group}</Badge>
                      </TableCell>
                      <TableCell>{request.units_requested}</TableCell>
                      <TableCell>{getUrgencyBadge(request.urgency_level)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.request_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(request.id, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(request.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}