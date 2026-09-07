import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function RequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [employeeDetails, setEmployeeDetails] = useState({ name: '', id: '', emp_id_string: '', designation: '', department: '', division: '' });

  const [formData, setFormData] = useState({
    travel_from: '',
    travel_to: '',
    purpose: '',
    duration: '',
    start_date: '',
    end_date: '',
    expense_transport: '',
    expense_local: '',
    expense_food: '',
    expense_driver: '',
    expense_accommodation: '',
    expense_misc: '',
    advance_required: '',
    remarks: ''
  });

  useEffect(() => {
    async function fetchEmployeeData() {
      if (!user) return;
      
      let currentEmpId = user.id;

      if (id) {
        // If editing, fetch the requisition first
        const { data: reqData, error: reqError } = await supabase
          .from('travel_requisitions')
          .select('*')
          .eq('id', id)
          .single();
          
        if (reqData) {
          currentEmpId = reqData.employee_id;
          setFormData({
            travel_from: reqData.travel_from || '',
            travel_to: reqData.travel_to || '',
            purpose: reqData.purpose || '',
            duration: reqData.duration || '',
            start_date: reqData.start_date || '',
            end_date: reqData.end_date || '',
            expense_transport: String(reqData.expense_transport) || '',
            expense_local: String(reqData.expense_local) || '',
            expense_food: String(reqData.expense_food) || '',
            expense_driver: String(reqData.expense_driver) || '',
            expense_accommodation: String(reqData.expense_accommodation) || '',
            expense_misc: String(reqData.expense_misc) || '',
            advance_required: String(reqData.advance_required) || '',
            remarks: reqData.remarks || ''
          });
          setEmployeeDetails({
            name: '', // will fetch below
            id: reqData.employee_id,
            designation: reqData.designation || '',
            department: reqData.department || '',
            division: reqData.division_project || ''
          });
        }
        setFetching(false);
      }

      // Fetch profile name
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentEmpId)
        .single();
        
      if (data) {
        setEmployeeDetails(prev => ({ 
          ...prev, 
          name: data.full_name || '', 
          id: currentEmpId,
          emp_id_string: data.employee_id || '',
          designation: data.designation || prev.designation
        }));
      }
    }
    fetchEmployeeData();
  }, [user, id]);

  // Auto calculate duration when start_date or end_date changes
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end >= start) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start day
        const nights = diffDays - 1;
        let durationStr = `${diffDays} Day${diffDays > 1 ? 's' : ''}`;
        if (nights > 0) {
          durationStr += `, ${nights} Night${nights > 1 ? 's' : ''}`;
        }
        
        // Only override if the user hasn't heavily customized it or it's currently empty/matches a previous auto-calc format
        setFormData(prev => ({ ...prev, duration: durationStr }));
      }
    }
  }, [formData.start_date, formData.end_date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmployeeDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleEmpIdBlur = async () => {
    if (role !== 'Admin' || !employeeDetails.emp_id_string) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id')
        .ilike('employee_id', employeeDetails.emp_id_string.trim())
        .limit(1)
        .maybeSingle();
        
      if (data) {
        setEmployeeDetails(prev => ({
          ...prev,
          name: data.full_name || prev.name,
          id: data.id
        }));
        toast.success(`Employee loaded successfully`);
      } else {
        toast.error(`Employee ID not found: ${error?.message || 'No data'}`);
      }
    } catch (err: any) {
      toast.error(`Error searching: ${err?.message || 'Unknown error'}`);
    }
  };

  const calculateTotal = () => {
    return (
      (Number(formData.expense_transport) || 0) + 
      (Number(formData.expense_local) || 0) + 
      (Number(formData.expense_food) || 0) + 
      (Number(formData.expense_driver) || 0) +
      (Number(formData.expense_accommodation) || 0) +
      (Number(formData.expense_misc) || 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      const payload = {
        employee_id: employeeDetails.id, // maintain original employee id
        department: employeeDetails.department,
        designation: employeeDetails.designation,
        division_project: employeeDetails.division,
        travel_from: formData.travel_from,
        travel_to: formData.travel_to,
        purpose: formData.purpose,
        duration: formData.duration,
        start_date: formData.start_date,
        end_date: formData.end_date,
        expense_transport: Number(formData.expense_transport) || 0,
        expense_local: Number(formData.expense_local) || 0,
        expense_food: Number(formData.expense_food) || 0,
        expense_driver: Number(formData.expense_driver) || 0,
        expense_accommodation: Number(formData.expense_accommodation) || 0,
        expense_misc: Number(formData.expense_misc) || 0,
        total_estimated: calculateTotal(),
        advance_required: Number(formData.advance_required) || 0,
        remarks: formData.remarks
      };

      if (id) {
        const { error } = await supabase.from('travel_requisitions').update(payload).eq('id', id);
        if (error) throw error;
        toast.success('Travel requisition updated successfully');
        navigate(role === 'Director' || role === 'Assistant Director' ? '/travel/approvals' : '/travel');
      } else {
        const { error } = await supabase.from('travel_requisitions').insert(payload);
        if (error) throw error;
        toast.success('Travel requisition submitted successfully');
        navigate('/travel');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to submit requisition');
    } finally {
      setLoading(false);
    }
  };

  const totalEstimated = calculateTotal();

  if (fetching) {
    return <AppLayout><div className="p-8 text-center animate-pulse">Loading...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="w-full px-6 py-6 animate-in fade-in zoom-in duration-300">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="text-2xl">Travel Requisition Form</CardTitle>
            <CardDescription>Submit a detailed request for an upcoming trip.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Employee Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Employee Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Employee Name</Label>
                    <Input id="name" name="name" value={employeeDetails.name} onChange={handleEmpChange} readOnly={role !== 'Admin'} className={role !== 'Admin' ? "bg-muted/50" : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emp_id_string">Employee ID</Label>
                    <Input id="emp_id_string" name="emp_id_string" value={employeeDetails.emp_id_string || ''} onChange={handleEmpChange} onBlur={handleEmpIdBlur} readOnly={role !== 'Admin'} className={role !== 'Admin' ? "bg-muted/50 font-mono" : "font-mono"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" name="designation" value={employeeDetails.designation} onChange={handleEmpChange} placeholder="e.g. Junior Engineer" readOnly={role !== 'Admin'} className={role !== 'Admin' ? "bg-muted/50" : ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" name="department" value={employeeDetails.department} onChange={handleEmpChange} placeholder="e.g. Engineering" readOnly={role !== 'Admin'} className={role !== 'Admin' ? "bg-muted/50" : ""} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="division">Division / Project Name</Label>
                    <Input id="division" name="division" value={employeeDetails.division} onChange={handleEmpChange} placeholder="e.g. Road Construction Project A" />
                  </div>
                </div>
              </div>

              {/* Travel Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Travel Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="travel_from">Travel From</Label>
                    <Input id="travel_from" name="travel_from" required value={formData.travel_from} onChange={handleChange} placeholder="City, State" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel_to">Travel To</Label>
                    <Input id="travel_to" name="travel_to" required value={formData.travel_to} onChange={handleChange} placeholder="City, State" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="purpose">Travel Purpose</Label>
                    <Input id="purpose" name="purpose" required value={formData.purpose} onChange={handleChange} placeholder="e.g. Site Inspection and Client Meeting" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Departure Date</Label>
                    <Input type="date" id="start_date" name="start_date" required value={formData.start_date} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Expected Return Date</Label>
                    <Input type="date" id="end_date" name="end_date" required value={formData.end_date} onChange={handleChange} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="duration">Travel Duration (e.g. 3 Days, 2 Nights)</Label>
                    <Input id="duration" name="duration" value={formData.duration} onChange={handleChange} placeholder="3 Days" />
                  </div>
                </div>
              </div>
              
              {/* Estimated Expenses Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Estimated Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense_transport">Bus / Train (₹)</Label>
                    <Input type="number" id="expense_transport" name="expense_transport" min="0" step="0.01" value={formData.expense_transport} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_local">Local Conveyance (Auto/Taxi) (₹)</Label>
                    <Input type="number" id="expense_local" name="expense_local" min="0" step="0.01" value={formData.expense_local} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_food">Food Expenses (₹)</Label>
                    <Input type="number" id="expense_food" name="expense_food" min="0" step="0.01" value={formData.expense_food} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_driver">Driver Charge (₹)</Label>
                    <Input type="number" id="expense_driver" name="expense_driver" min="0" step="0.01" value={formData.expense_driver} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_accommodation">Accommodation (₹)</Label>
                    <Input type="number" id="expense_accommodation" name="expense_accommodation" min="0" step="0.01" value={formData.expense_accommodation} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_misc">Miscellaneous (₹)</Label>
                    <Input type="number" id="expense_misc" name="expense_misc" min="0" step="0.01" value={formData.expense_misc} onChange={handleChange} placeholder="0.00" />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2 p-4 bg-muted rounded-lg flex justify-between items-center mt-2">
                    <span className="font-semibold">Total Estimated Expense:</span>
                    <span className="text-xl font-bold text-primary">₹{totalEstimated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2 mt-2">
                    <Label htmlFor="advance_required" className="text-emerald-600 font-semibold">Advance Required (₹)</Label>
                    <Input type="number" id="advance_required" name="advance_required" required min="0" step="0.01" value={formData.advance_required} onChange={handleChange} placeholder="0.00" className="border-emerald-200 focus:ring-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Additional Remarks</Label>
                <Textarea id="remarks" name="remarks" rows={3} value={formData.remarks} onChange={handleChange} placeholder="Any specific requirements or notes..." />
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={loading} className="shadow-md hover:shadow-lg transition-all px-8">
                  {loading ? (id ? 'Updating...' : 'Submitting...') : (id ? 'Save Changes' : 'Submit Requisition')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
