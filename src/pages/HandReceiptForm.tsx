import { useEffect, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Receipt } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTransition } from '@/components/layout/PageTransition';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { notifyDirectors } from '@/lib/notifications';
import { getUserFriendlyErrorMessage } from '@/lib/error-mapping';
import { cn } from '@/lib/utils';
import type { Division, HandReceipt } from '@/types/database';

export default function HandReceiptForm() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { role, profile } = useAuth();
    const actorName = profile?.full_name || 'Someone';

    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const [originalWorkId, setOriginalWorkId] = useState<string | null>(null);
    const [originalStatus, setOriginalStatus] = useState<string>('Running R1');

    const [loading, setLoading] = useState(false);
    const [divisions, setDivisions] = useState<Division[]>([]);

    const [formData, setFormData] = useState({
        ubqn: '',
        sector: '',
        subcategory: '',
        work_name: '',
        department: '',
        division_id: '',
        address: '',
        probable_cost: '',
        mode: '' as '' | 'Letter No' | 'Verbal',
        letter_no: '',
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
                const { data: hr } = await (supabase as any)
                    .from('hand_receipts')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (hr) {
                    setOriginalWorkId(hr.work_id);
                    setFormData({
                        ubqn: hr.ubqn || '',
                        sector: hr.sector || '',
                        subcategory: '',
                        work_name: hr.work_name || '',
                        address: hr.address || '',
                        department: hr.department || '',
                        division_id: hr.division_id || '',
                        probable_cost: hr.probable_cost ? String(hr.probable_cost) : '',
                        mode: hr.mode || '',
                        letter_no: hr.letter_no || '',
                        include_gst: true,
                    });

                    if (hr.work_id) {
                        const { data: work } = await supabase.from('works').select('*').eq('id', hr.work_id).single();
                        if (work) {
                            setOriginalStatus(work.status);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const metadata = (work as any).metadata;
                            setFormData(prev => ({
                                ...prev,
                                subcategory: work.subcategory || '',
                                include_gst: metadata?.include_gst ?? true,
                                probable_cost: metadata?.base_cost ? String(metadata.base_cost) : (hr.probable_cost ? String(hr.probable_cost) : ''),
                            }));
                        }
                    }
                }
            }
        }
        fetchData();
    }, [id]);

    const handleChange = (field: string, value: string | number | boolean) => {
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
            const formattedHRUBQN = formData.ubqn.startsWith('UBQN')
                ? formData.ubqn.trim()
                : `${sectorCode} (H)- ${cleanUBQN}`;

            const baseCost = parseFloat(formData.probable_cost) || 0;
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

            let finalStatus = isEdit ? originalStatus : 'Running R1';
            if (existingWork?.status) {
                const existingOrder = statusOrder[existingWork.status] || 0;
                const newOrder = statusOrder[finalStatus] || 0;
                if (existingOrder > newOrder) {
                    finalStatus = existingWork.status;
                }
            }

            // -- Step 1: Upsert summary into works table, get the id --
            const worksPayload = {
                ubqn: standardizedUBQN,
                work_name: formData.work_name.trim(),
                client_name: formData.department.trim() || null,
                division_id: formData.division_id,
                address: formData.address.trim() || null,
                status: finalStatus,
                consultancy_cost: totalCost,
                subcategory: isRnB ? formData.subcategory : null,
                order_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
                updated_at: new Date().toISOString(),
                metadata: {
                    type: 'Hand Receipt',
                    sector: formData.sector.trim() || null,
                    mode: formData.mode || null,
                    letter_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
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

            // -- Step 2: Upsert fully typed data into hand_receipts table --
            const hrPayload = {
                ubqn: formattedHRUBQN,
                work_id: workRecordId,
                division_id: formData.division_id,
                work_name: formData.work_name.trim(),
                department: formData.department.trim() || null,
                sector: formData.sector.trim() || null,
                address: formData.address.trim() || null,
                probable_cost: totalCost,
                mode: (formData.mode as HandReceipt['mode']) || null,
                letter_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
            };

            if (isEdit) {
                const { error: hrError } = await db
                    .from('hand_receipts')
                    .update(hrPayload)
                    .eq('id', id);
                if (hrError) throw hrError;
            } else {
                const { error: hrError } = await db
                    .from('hand_receipts')
                    .upsert(hrPayload, { onConflict: 'ubqn' });
                if (hrError) throw hrError;
            }

            toast({
                title: isEdit ? 'Hand Receipt Updated' : 'Hand Receipt Created',
                description: `HR "${formData.work_name}" has been ${isEdit ? 'updated' : 'created'} successfully.`,
            });

            // Notify Directors
            notifyDirectors({
                type: isEdit ? 'work_updated' : 'hr_created',
                title: isEdit ? 'Hand Receipt Updated' : 'New Hand Receipt Created',
                message: `${actorName} ${isEdit ? 'updated' : 'created'} hand receipt "${formData.work_name}" (UBQN: ${formData.ubqn})`,
                link: isEdit ? '/hand-receipts' : '/works',
                metadata: { ubqn: formData.ubqn, work_name: formData.work_name, actor: actorName },
            });

            navigate('/hand-receipts');
        } catch (error: unknown) {
            toast({
                title: 'Error Saving Hand Receipt',
                description: getUserFriendlyErrorMessage(error),
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
                                <Receipt className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight font-heading">
                                    {isEdit ? 'Update Hand Receipt' : 'New Hand Receipt'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {isEdit ? 'Modify the HR details below' : 'Fill in the HR details below'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Work Information */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-violet-600">
                                Work Information
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

                                <div className="space-y-1.5 sm:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="probable_cost" className="font-bold text-sm">Probable Cost (₹) *</Label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Include GST (18%)</span>
                                            <button
                                                type="button"
                                                onClick={() => handleChange('include_gst', !formData.include_gst)}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                                                    formData.include_gst ? "bg-violet-600" : "bg-slate-200"
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
                                        id="probable_cost"
                                        type="number"
                                        step="0.01"
                                        value={formData.probable_cost}
                                        onChange={(e) => handleChange('probable_cost', e.target.value)}
                                        required
                                        placeholder="Enter probable cost"
                                        className="font-mono font-bold text-violet-700"
                                    />

                                    {formData.probable_cost && (
                                        <div className="mt-4 p-4 bg-slate-900 rounded-xl shadow-lg border border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>Base Amount</span>
                                                <span>₹{parseFloat(formData.probable_cost).toLocaleString('en-IN')}</span>
                                            </div>
                                            {formData.include_gst && (
                                                <div className="flex justify-between items-center text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                                                    <span>GST (18%)</span>
                                                    <span>+ ₹{(parseFloat(formData.probable_cost) * 0.18).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <div className="h-px bg-slate-800 my-1" />
                                            <div className="flex justify-between items-center text-sm font-black text-white">
                                                <span className="uppercase tracking-tight">Total Amount</span>
                                                <span className="text-xl">
                                                    ₹{(parseFloat(formData.probable_cost) * (formData.include_gst ? 1.18 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-slate-500 italic mt-2 leading-tight">
                                                Note: This total {formData.include_gst ? '(+18%)' : ''} will be recorded in the Registry, Works Pipeline, and Financial Dashboards.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 text-[11px] font-black uppercase tracking-widest text-purple-600">
                                Mode of Receipt
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="font-bold text-sm">Mode *</Label>
                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant={formData.mode === 'Letter No' ? 'default' : 'outline'}
                                            className={cn(
                                                "flex-1 font-bold h-10 transition-all",
                                                formData.mode === 'Letter No' && "bg-violet-600 hover:bg-violet-700"
                                            )}
                                            onClick={() => handleChange('mode', 'Letter No')}
                                        >
                                            Letter No.
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={formData.mode === 'Verbal' ? 'default' : 'outline'}
                                            className={cn(
                                                "flex-1 font-bold h-10 transition-all",
                                                formData.mode === 'Verbal' && "bg-purple-600 hover:bg-purple-700 text-white"
                                            )}
                                            onClick={() => {
                                                handleChange('mode', 'Verbal');
                                                handleChange('letter_no', '');
                                            }}
                                        >
                                            Verbal
                                        </Button>
                                    </div>
                                </div>

                                {/* Letter No. field - only shown when Mode is "Letter No" */}
                                {formData.mode === 'Letter No' && (
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <Label htmlFor="letter_no" className="font-bold text-sm text-violet-700">
                                            Letter No. *
                                        </Label>
                                        <Input
                                            id="letter_no"
                                            value={formData.letter_no}
                                            onChange={(e) => handleChange('letter_no', e.target.value)}
                                            required
                                            placeholder="Enter letter number"
                                            className="border-violet-200 focus-visible:ring-violet-500"
                                        />
                                    </div>
                                )}

                                {formData.mode === 'Verbal' && (
                                    <div className="rounded-lg bg-purple-50 border border-purple-100 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-xs text-purple-700 font-medium">
                                            Verbal mode selected — no letter number required.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-1 pb-4">
                            <Link to="/works">
                                <Button type="button" variant="ghost">Cancel</Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={loading || !formData.mode}
                                className="px-10 font-bold shadow-lg transition-all active:scale-95 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    isEdit ? 'Update Hand Receipt' : 'Create Hand Receipt'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
