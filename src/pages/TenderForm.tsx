import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, FileCheck2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
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
import { notifyDirectors } from '@/lib/notifications';
import { getReadableError } from '@/lib/errorHandler';
import type { Division, Tender, Work } from '@/types/database';
import { cn } from '@/lib/utils';

export default function TenderForm() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { role, profile } = useAuth();
    const actorName = profile?.full_name || 'Someone';

    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const [originalWorkId, setOriginalWorkId] = useState<string | null>(null);
    const [originalStatus, setOriginalStatus] = useState<string>('Pipeline');

    const [loading, setLoading] = useState(false);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    useUnsavedChanges(isDirty);

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
        include_gst: true,
    });

    const selectedDivision = divisions.find(d => d.id === formData.division_id);
    const isRnB = selectedDivision?.code === 'RnB';

    useEffect(() => {
        async function fetchData() {
            const { data } = await supabase.from('divisions').select('*');
            if (data) setDivisions(data);

            if (id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: tender } = await (supabase as any)
                    .from('tenders')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (tender) {
                    setOriginalWorkId(tender.work_id);
                    setFormData({
                        ubqn: tender.ubqn || '',
                        sector: tender.sector || '',
                        subcategory: '',
                        work_name: tender.work_name || '',
                        address: tender.address || '',
                        department: tender.department || '',
                        division_id: tender.division_id || '',
                        tender_id: tender.tender_id || '',
                        tender_upload_last_date: tender.tender_upload_last_date || '',
                        tender_upload_last_time: tender.tender_upload_last_time || '',
                        tender_opening_date: tender.tender_opening_date || '',
                        tender_opening_time: tender.tender_opening_time || '',
                        emd_cost: tender.emd_cost ? String(tender.emd_cost) : '',
                        consultancy_cost: tender.consultancy_cost ? String(tender.consultancy_cost) : '',
                        validity_of_tender: tender.validity_of_tender || '',
                        completion_period: tender.completion_period || '',
                        specific_condition: tender.specific_condition || '',
                        include_gst: true,
                    });

                    if (tender.work_id) {
                        const { data: work } = await supabase.from('works').select('*').eq('id', tender.work_id).single();
                        if (work) {
                            setOriginalStatus(work.status);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const metadata = (work as any).metadata;
                            setFormData(prev => ({
                                ...prev,
                                subcategory: work.subcategory || '',
                                include_gst: metadata?.include_gst ?? true,
                                consultancy_cost: metadata?.base_cost ? String(metadata.base_cost) : (tender.consultancy_cost ? String(tender.consultancy_cost) : ''),
                            }));
                        }
                    }
                }
            }
        }
        fetchData();
    }, [id]);

    const handleChange = (field: string, value: string | number | boolean) => {
        setIsDirty(true);
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const db = supabase as any;
            const cleanUBQNRaw = formData.ubqn.includes('-') ? formData.ubqn.split('-').pop() || '' : formData.ubqn;
            const cleanUBQN = cleanUBQNRaw.trim();
            const selectedDivision = divisions.find(d => d.id === formData.division_id);
            const sectorCode = selectedDivision?.code === 'Ar' ? 'Arch' : (selectedDivision?.code || '');
            const standardizedUBQN = formData.ubqn.startsWith('UBQN')
                ? formData.ubqn.trim()
                : `${sectorCode}- ${cleanUBQN}`;
            const formattedTenderUBQN = formData.ubqn.startsWith('UBQN')
                ? formData.ubqn.trim()
                : `${sectorCode} (T)- ${cleanUBQN}`;

            const baseCost = parseFloat(formData.consultancy_cost) || 0;
            const totalCost = formData.include_gst ? baseCost * 1.18 : baseCost;

            // Query existing work status to prevent downgrading
            const { data: existingWork } = await db
                .from('works')
                .select('status')
                .eq('ubqn', standardizedUBQN)
                .maybeSingle();

            const statusOrder: Record<string, number> = {
                'Pipeline': 1,
                'Running R1': 2,
                'Running R2': 3,
                'Completed C1': 4,
                'Completed C2': 4,
                'Completed C1*': 4,
                'Completed': 4
            };

            let finalStatus = isEdit ? originalStatus : 'Pipeline';
            if (existingWork?.status) {
                const existingOrder = statusOrder[existingWork.status] || 0;
                const newOrder = statusOrder[finalStatus] || 0;
                if (existingOrder > newOrder) {
                    finalStatus = existingWork.status;
                }
            }

            // -- Step 1: Upsert/Update summary into works table, get the id --
            const worksPayload = {
                ubqn: standardizedUBQN,
                work_name: formData.work_name.trim(),
                client_name: formData.department.trim() || null,
                division_id: formData.division_id,
                address: formData.address.trim() || null,
                status: finalStatus,
                consultancy_cost: totalCost,
                subcategory: isRnB ? formData.subcategory : null,
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
                    include_gst: formData.include_gst,
                    base_cost: baseCost,
                },
            };

            let workRecordId = originalWorkId;
            if (isEdit && originalWorkId) {
                const { error: workError } = await db
                    .from('works')
                    .update(worksPayload)
                    .eq('id', originalWorkId);
                if (workError) throw workError;
            } else {
                const { data: workRecord, error: workError } = await db
                    .from('works')
                    .upsert(worksPayload, { onConflict: 'ubqn' })
                    .select('id')
                    .single();
                if (workError) throw workError;
                if (!workRecord?.id) throw new Error('Failed to create work record.');
                workRecordId = workRecord.id;
            }

            // -- Step 2: Upsert fully typed data into tenders table --
            const tenderPayload = {
                ubqn: formattedTenderUBQN,
                work_id: workRecordId,
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
                consultancy_cost: totalCost,
                validity_of_tender: formData.validity_of_tender.trim() || null,
                completion_period: formData.completion_period.trim() || null,
                specific_condition: formData.specific_condition.trim() || null,
            };

            if (isEdit) {
                const { error: tenderError } = await db
                    .from('tenders')
                    .update(tenderPayload)
                    .eq('id', id);
                if (tenderError) throw tenderError;
            } else {
                const { error: tenderError } = await db
                    .from('tenders')
                    .upsert(tenderPayload, { onConflict: 'ubqn' });
                if (tenderError) throw tenderError;
            }

            toast({
                title: isEdit ? 'Tender Updated' : 'Tender Created',
                description: "Tender saved successfully.",
            });

            // Notify Directors
            notifyDirectors({
                type: isEdit ? 'work_updated' : 'tender_created',
                title: isEdit ? 'Tender Updated' : 'New Tender Created',
                message: `${actorName} ${isEdit ? 'updated' : 'created'} tender "${formData.work_name}" (UBQN: ${formData.ubqn})`,
                link: isEdit ? '/tenders' : '/works',
                metadata: { ubqn: formData.ubqn, work_name: formData.work_name, actor: actorName },
            });

            setIsDirty(false);
            navigate('/tenders');
        } catch (error: unknown) {
            console.error(error);
            toast({
                title: 'Unable to save tender details',
                description: getReadableError(error),
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
                                    {isEdit ? 'Update Tender Entry' : 'New Tender Entry'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {isEdit ? 'Modify the tender details below' : 'Fill in the tender details below'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Basic Information */}
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-orange-600">
                                Basic Information
                            </h2>
                            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="ubqn" className="font-bold text-sm">UBQN *</Label>
                                    <Input
                                        id="ubqn"
                                        value={formData.ubqn}
                                        onChange={(e) => handleChange('ubqn', e.target.value)}
                                        required
                                        placeholder="e.g., 101"
                                        className={cn("font-mono", isEdit && "bg-slate-50 cursor-not-allowed opacity-70")}
                                        disabled={isEdit}
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
                                        <div className="flex flex-col sm:flex-row gap-3">
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
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-amber-600">
                                Tender Details
                            </h2>
                            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
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
                        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm w-full max-w-full min-w-0">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-emerald-600">
                                Financial & Conditions
                            </h2>
                            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
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

                                <div className="space-y-1.5 sm:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="consultancy_cost" className="font-bold text-sm">Consultancy Cost (₹) *</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Include GST (18%)</span>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('include_gst', !formData.include_gst)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                                                    formData.include_gst ? "bg-amber-600" : "bg-slate-200"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                        formData.include_gst ? "translate-x-4" : "translate-x-0"
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
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

                                    {formData.consultancy_cost && (
                                        <div className="mt-4 p-4 bg-slate-900 rounded-xl shadow-lg border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>Base Amount</span>
                                                <span>₹{parseFloat(formData.consultancy_cost).toLocaleString('en-IN')}</span>
                                            </div>
                                            {formData.include_gst && (
                                                <div className="flex justify-between items-center text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                                    <span>GST (18%)</span>
                                                    <span>+ ₹{(parseFloat(formData.consultancy_cost) * 0.18).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <div className="h-px bg-slate-800 my-1" />
                                            <div className="flex justify-between items-center text-sm font-black text-white">
                                                <span className="uppercase tracking-tight">Total Amount</span>
                                                <span className="text-xl">
                                                    ₹{(parseFloat(formData.consultancy_cost) * (formData.include_gst ? 1.18 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 italic mt-2 leading-tight">
                                                Note: This total {formData.include_gst ? '(+18%)' : ''} will be recorded in the Registry, Works Pipeline, and Financial Dashboards.
                                            </p>
                                        </div>
                                    )}
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
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1 pb-4">
                            <Link to="/works" className="w-full sm:w-auto">
                                <Button type="button" variant="ghost" className="w-full sm:w-auto">Cancel</Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-10 font-bold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    isEdit ? 'Update Tender Entry' : 'Create Tender Entry'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
