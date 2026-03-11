import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
                consultancy_cost: parseFloat(formData.probable_cost) || 0,
                subcategory: isRnB ? formData.subcategory : 'Hand Receipt',
                order_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
                updated_at: new Date().toISOString(),
                metadata: {
                    type: 'Hand Receipt',
                    sector: formData.sector.trim() || null,
                    mode: formData.mode || null,
                    letter_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
                },
            };

            const { data: workRecord, error: workError } = await db
                .from('works')
                .upsert(worksPayload, { onConflict: 'ubqn' })
                .select('id')
                .single();

            if (workError) throw workError;
            if (!workRecord?.id) throw new Error('Failed to create work record.');

            // -- Step 2: Upsert fully typed data into hand_receipts table --
            const hrPayload = {
                ubqn: cleanUBQN,
                work_id: workRecord.id,
                division_id: formData.division_id,
                work_name: formData.work_name.trim(),
                department: formData.department.trim() || null,
                sector: formData.sector.trim() || null,
                address: formData.address.trim() || null,
                probable_cost: parseFloat(formData.probable_cost) || 0,
                mode: (formData.mode as HandReceipt['mode']) || null,
                letter_no: formData.mode === 'Letter No' ? formData.letter_no.trim() || null : null,
            };

            const { error: hrError } = await db
                .from('hand_receipts')
                .upsert(hrPayload, { onConflict: 'ubqn' });

            if (hrError) throw hrError;

            toast({
                title: 'Hand Receipt Created',
                description: `HR "${formData.work_name}" has been created successfully.`,
            });

            // Notify Directors
            notifyDirectors({
                type: 'hr_created',
                title: 'New Hand Receipt Created',
                message: `${actorName} created hand receipt "${formData.work_name}" (UBQN: ${formData.ubqn})`,
                link: '/works',
                metadata: { ubqn: formData.ubqn, work_name: formData.work_name, actor: actorName },
            });

            navigate('/works');
        } catch (error: any) {
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
                                    New Hand Receipt (HR)
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Record a new hand receipt entry
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
                                        className="font-mono"
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
                                    <Label htmlFor="probable_cost" className="font-bold text-sm">Probable Cost (₹) *</Label>
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
                                    'Create Hand Receipt'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </PageTransition>
        </AppLayout>
    );
}
