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
import { ThirdPartyWork, WorkFormData } from '@/types/thirdParty';

interface EditWorkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    work: ThirdPartyWork | null;
    onSubmit: (workId: string, data: WorkFormData) => void;
    isLoading?: boolean;
}

const initialFormData: WorkFormData = {
    qt_no: '',
    work_name: '',
    client_name: '',
    quoted_amount: '',
    sanction_amount: '',
};

export function EditWorkModal({
    open,
    onOpenChange,
    work,
    onSubmit,
    isLoading,
}: EditWorkModalProps) {
    const [formData, setFormData] = useState<WorkFormData>(initialFormData);

    useEffect(() => {
        if (work) {
            setFormData({
                qt_no: work.qt_no,
                work_name: work.work_name,
                client_name: work.client_name || '',
                quoted_amount: work.quoted_amount?.toString() || '',
                sanction_amount: work.sanction_amount?.toString() || '',
            });
        }
    }, [work]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (work) {
            onSubmit(work.id, formData);
        }
    };

    const handleChange = (field: keyof WorkFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const stageAmount = formData.sanction_amount && !isNaN(parseFloat(formData.sanction_amount))
        ? (parseFloat(formData.sanction_amount) / 4).toFixed(2)
        : '0';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Work Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="qt_no">UBQn *</Label>
                        <Input
                            id="qt_no"
                            placeholder="e.g., UBQ2024002"
                            value={formData.qt_no}
                            onChange={(e) => handleChange('qt_no', e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="work_name">Name of Work *</Label>
                        <Input
                            id="work_name"
                            placeholder="Work description"
                            value={formData.work_name}
                            onChange={(e) => handleChange('work_name', e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="client_name">Client Name</Label>
                        <Input
                            id="client_name"
                            placeholder="Client name"
                            value={formData.client_name}
                            onChange={(e) => handleChange('client_name', e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quoted_amount">Quoted Amount (₹)</Label>
                            <Input
                                id="quoted_amount"
                                type="number"
                                placeholder="0"
                                value={formData.quoted_amount}
                                onChange={(e) => handleChange('quoted_amount', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sanction_amount">Sanction Amount (₹) *</Label>
                            <Input
                                id="sanction_amount"
                                type="number"
                                placeholder="0"
                                value={formData.sanction_amount}
                                onChange={(e) => handleChange('sanction_amount', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {formData.sanction_amount && !isNaN(parseFloat(formData.sanction_amount)) && parseFloat(formData.sanction_amount) > 0 && (
                        <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Each stage payment:{' '}
                                <span className="font-semibold text-foreground">₹{stageAmount}</span>
                                <span className="text-xs ml-1">(25% × 4 stages)</span>
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
