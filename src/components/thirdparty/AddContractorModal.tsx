import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ContractorFormData, ContractorCategory } from '@/types/thirdParty';
import { supabase } from '@/integrations/supabase/client';

interface AddContractorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContractorFormData) => void;
  isLoading?: boolean;
}

const initialFormData: ContractorFormData = {
  ub_id: '',
  name: '',
  qualification: '',
  category: 'Class A',
  aadhar_number: '',
  pan_number: '',
  age: '',
  gender: '',
  mobile: '',
  email: '',
  address: '',
  dob: ''
};

export function AddContractorModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddContractorModalProps) {
  const [formData, setFormData] = useState<ContractorFormData>(initialFormData);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // --- AUTOGENERATE UBID LOGIC ---
  useEffect(() => {
    if (open) {
      const fetchNextId = async () => {
        setIsGeneratingId(true);
        try {
          // Get the count of existing contractors
          const { count, error } = await supabase
            .from('third_party_contractors')
            .select('*', { count: 'exact', head: true });

          if (error) throw error;

          // Logic: Next Number = current count + 1
          // Format: UBTP 001, UBTP 002, etc.
          const nextSerial = (count || 0) + 1;
          const formattedId = `UBTP ${String(nextSerial).padStart(3, '0')}`;
          
          setFormData((prev) => ({ ...prev, ub_id: formattedId }));
        } catch (error) {
          console.error('Error generating UBID:', error);
        } finally {
          setIsGeneratingId(false);
        }
      };

      fetchNextId();
    } else {
      // Reset form when modal closes
      setFormData(initialFormData);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof ContractorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New T-P (Contractor/Surveyor)</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Official Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Official Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ub_id">UBID (System Generated)</Label>
                <Input
                  id="ub_id"
                  value={isGeneratingId ? 'Generating...' : formData.ub_id}
                  readOnly // ✅ OPTIONAL: User cannot edit this
                  className="bg-slate-50 font-mono font-bold text-blue-600 border-dashed cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="e.g., B.Tech Civil"
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: ContractorCategory) =>
                    handleChange('category', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class A">Class A</SelectItem>
                    <SelectItem value="Class B">Class B</SelectItem>
                    <SelectItem value="Class C">Class C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Legal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Legal Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <Input
                  id="aadhar_number"
                  placeholder="12 digit Aadhar"
                  value={formData.aadhar_number}
                  onChange={(e) => handleChange('aadhar_number', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  placeholder="e.g., ABCDE1234F"
                  value={formData.pan_number}
                  onChange={(e) => handleChange('pan_number', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Personal Details
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                 id="dob"
                 type="date"
                 value={formData.dob}
                 onChange={(e) => handleChange('dob', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile No</Label>
                <Input
                  id="mobile"
                  placeholder="10 digit mobile"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Full Address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isGeneratingId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Saving...' : 'Add Contractor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}