import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, FileCheck2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { Division, Tender } from '@/types/database';
import { cn } from '@/lib/utils';

export default function TenderForm() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { role } = useAuth();

    const [loading, setLoading] = useState(false);
    const [divisions, setDivisions] = useState<Division[]>([]);

    const [formData, setFormData] = useState({
        ubqn: '',
        sector: '',
        subcategory: '',
        work_name: '',
        address: '',
        department: '',
        division_id: '',
        tender_id: '',
        tender_upload_last_date: '',
        tender_upload_last_time: '',
        tender_opening_date: '',
        tender_opening_time: '',
        emd_cost: '',
        consultancy_cost: '',
        validity_of_tender: '',
        completion_period: '',
        specific_condition: '',
    });

    const selectedDivision = divisions.find(d => d.id === formData.division_id);
    const isRnB = selectedDivision?.code === 'RnB';

    useEffect(() => {
        async function fetchDivisions() {
            const { data } = await supabase.from('divisions').select('*');
            if (data) setDivisions(data);
        }
        fetchDivisions();
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const db = supabase as any;
            const cleanUBQN = formData.ubqn.trim();

            // -- Step 1: Upsert summary into works table, get the id --
            const worksPayload = {
                ubqn: cleanUBQN,
                work_name: formData.work_name.trim(),
                client_name: formData.department.trim() || null,
                division_id: formData.division_id,
                address: formData.address.trim() || null,
                status: 'Pipeline',
                consultancy_cost: parseFloat(formData.consultancy_cost) || 0,
                subcategory: isRnB ? formData.subcategory : 'Tender',
                order_no: formData.tender_id.trim() || null,
                updated_at: new Date().toISOString(),
                metadata: {
                    type: 'Tender',
                    sector: formData.sector.trim() || null,
                    tender_id: formData.tender_id.trim() || null,
                    tender_upload_last_date: formData.tender_upload_last_date || null,
                    tender_upload_last_time: formData.tender_upload_last_time || null,
                    tender_opening_date: formData.tender_opening_date || null,
                    tender_opening_time: formData.tender_opening_time || null,
                    emd_cost: parseFloat(formData.emd_cost) || 0,
                    validity_of_tender: formData.validity_of_tender.trim() || null,
                    completion_period: formData.completion_period.trim() || null,
                    specific_condition: formData.specific_condition.trim() || null,
                },
            };

            const { data: workRecord, error: workError } = await db
                .from('works')
                .upsert(worksPayload, { onConflict: 'ubqn' })
                .select('id')
                .single();

            if (workError) throw workError;
            if (!workRecord?.id) throw new Error('Failed to create work record.');

            // -- Step 2: Upsert fully typed data into tenders table --
            const tenderPayload = {
                ubqn: cleanUBQN,
                work_id: workRecord.id,
                division_id: formData.division_id,
                work_name: formData.work_name.trim(),
                department: formData.department.trim() || null,
                sector: formData.sector.trim() || null,
                address: formData.address.trim() || null,
                tender_id: formData.tender_id.trim() || null,
                tender_upload_last_date: formData.tender_upload_last_date || null,
                tender_upload_last_time: formData.tender_upload_last_time || null,
                tender_opening_date: formData.tender_opening_date || null,
                tender_opening_time: formData.tender_opening_time || null,
                emd_cost: parseFloat(formData.emd_cost) || 0,
                consultancy_cost: parseFloat(formData.consultancy_cost) || 0,
                validity_of_tender: formData.validity_of_tender.trim() || null,
                completion_period: formData.completion_period.trim() || null,
                specific_condition: formData.specific_condition.trim() || null,
            };

            const { error: tenderError } = await db
                .from('tenders')
                .upsert(tenderPayload, { onConflict: 'ubqn' });

            if (tenderError) throw tenderError;

            toast({
                title: 'Tender Created',
                description: `Tender "${formData.work_name}" has been created successfully.`,
            });

            navigate('/works');
        } catch (error: any) {
            toast({
                title: 'Error Saving Tender',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <PageTransition>
                <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
                    {/* Header */}
                    <div>
                        <Link
                            to="/works"
                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Works
                        </Link>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-200">
                                <FileCheck2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight font-heading">
                                    New Tender Entry
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Fill in the tender details below
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Basic Information */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-orange-600">
                                Basic Information
                            </h2>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ubqn" className="font-bold text-sm">UBQN *</Label>
                                    <Input
                                        id="ubqn"
                                        value={formData.ubqn}
                                        onChange={(e) => handleChange('ubqn', e.target.value)}
                                        required
                                        placeholder="e.g., 101"
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="division_id" className="font-bold text-sm">UB Sector *</Label>
                                    <Select
                                        value={formData.division_id}
                                        onValueChange={(v) => {
                                            handleChange('division_id', v);
                                            handleChange('subcategory', '');
                                        }}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select UB Sector" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {divisions.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.name} ({d.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {isRnB && (
                                    <div className="space-y-3 sm:col-span-2 p-4 rounded-lg bg-blue-50/50 border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                            RnB Sub-Type Selection *
                                        </Label>
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant={formData.subcategory === 'Road' ? 'default' : 'outline'}
                                                className={cn(
                                                    "flex-1 font-bold h-10",
                                                    formData.subcategory === 'Road' && "bg-blue-600 hover:bg-blue-700"
                                                )}
                                                onClick={() => handleChange('subcategory', 'Road')}
                                            >
                                                Road
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={formData.subcategory === 'Bridge' ? 'default' : 'outline'}
                                                className={cn(
                                                    "flex-1 font-bold h-10",
                                                    formData.subcategory === 'Bridge' && "bg-cyan-600 hover:bg-cyan-700 text-white"
                                                )}
                                                onClick={() => handleChange('subcategory', 'Bridge')}
                                            >
                                                Bridge
                                            </Button>
                                        </div>
                                    </div>
                                )}


                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="work_name" className="font-bold text-sm">Name of Work *</Label>
                                    <Input
                                        id="work_name"
                                        value={formData.work_name}
                                        onChange={(e) => handleChange('work_name', e.target.value)}
                                        required
                                        placeholder="Enter full name of work"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="address" className="font-bold text-sm">Address *</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        required
                                        placeholder="Enter work site address"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="department" className="font-bold text-sm">Department *</Label>
                                    <Input
                                        id="department"
                                        value={formData.department}
                                        onChange={(e) => handleChange('department', e.target.value)}
                                        required
                                        placeholder="Enter department name"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="sector" className="font-bold text-sm">Division *</Label>
                                    <Input
                                        id="sector"
                                        value={formData.sector}
                                        onChange={(e) => handleChange('sector', e.target.value)}
                                        required
                                        placeholder="Enter division"
                                    />
                                </div>


                            </div>
                        </div>

                        {/* Tender Details */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-amber-600">
                                Tender Details
                            </h2>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="tender_id" className="font-bold text-sm">Tender ID *</Label>
                                    <Input
                                        id="tender_id"
                                        value={formData.tender_id}
                                        onChange={(e) => handleChange('tender_id', e.target.value)}
                                        required
                                        placeholder="Enter tender ID"
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tender_upload_last_date" className="font-bold text-sm">
                                        Tender Upload Last Date *
                                    </Label>
                                    <Input
                                        id="tender_upload_last_date"
                                        type="date"
                                        value={formData.tender_upload_last_date}
                                        onChange={(e) => handleChange('tender_upload_last_date', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tender_upload_last_time" className="font-bold text-sm">
                                        Tender Upload Last Time *
                                    </Label>
                                    <Input
                                        id="tender_upload_last_time"
                                        type="time"
                                        value={formData.tender_upload_last_time}
                                        onChange={(e) => handleChange('tender_upload_last_time', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tender_opening_date" className="font-bold text-sm">
                                        Tender Opening Date *
                                    </Label>
                                    <Input
                                        id="tender_opening_date"
                                        type="date"
                                        value={formData.tender_opening_date}
                                        onChange={(e) => handleChange('tender_opening_date', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="tender_opening_time" className="font-bold text-sm">
                                        Tender Opening Time *
                                    </Label>
                                    <Input
                                        id="tender_opening_time"
                                        type="time"
                                        value={formData.tender_opening_time}
                                        onChange={(e) => handleChange('tender_opening_time', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Financial & Conditions */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                                Financial & Conditions
                            </h2>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="emd_cost" className="font-bold text-sm">EMD Cost (₹) *</Label>
                                    <Input
                                        id="emd_cost"
                                        type="number"
                                        step="0.01"
                                        value={formData.emd_cost}
                                        onChange={(e) => handleChange('emd_cost', e.target.value)}
                                        required
                                        placeholder="Enter EMD amount"
                                        className="font-mono font-bold text-emerald-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="consultancy_cost" className="font-bold text-sm">Consultancy Cost (₹) *</Label>
                                    <Input
                                        id="consultancy_cost"
                                        type="number"
                                        step="0.01"
                                        value={formData.consultancy_cost}
                                        onChange={(e) => handleChange('consultancy_cost', e.target.value)}
                                        required
                                        placeholder="Enter consultancy cost"
                                        className="font-mono font-bold text-blue-700"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="validity_of_tender" className="font-bold text-sm">
                                        Validity of Tender *
                                    </Label>
                                    <Input
                                        id="validity_of_tender"
                                        value={formData.validity_of_tender}
                                        onChange={(e) => handleChange('validity_of_tender', e.target.value)}
                                        required
                                        placeholder="e.g., 90 days"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="completion_period" className="font-bold text-sm">
                                        Completion Period *
                                    </Label>
                                    <Input
                                        id="completion_period"
                                        value={formData.completion_period}
                                        onChange={(e) => handleChange('completion_period', e.target.value)}
                                        required
                                        placeholder="e.g., 12 months"
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="specific_condition" className="font-bold text-sm">
                                        Specific Condition
                                    </Label>
                                    <Textarea
                                        id="specific_condition"
                                        value={formData.specific_condition}
                                        onChange={(e) => handleChange('specific_condition', e.target.value)}
                                        placeholder="Enter any specific conditions for this tender..."
                                        rows={3}
                                        className="resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-1 pb-4">
                            <Link to="/works">
                                <Button type="button" variant="ghost">Cancel</Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="px-10 font-bold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Create Tender Entry'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
