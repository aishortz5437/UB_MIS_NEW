import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Save, Printer, Plus, Trash2, Loader2, IndianRupee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getReadableError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { ThirdPartyWork, WorkOrderData, ThirdPartyContractor, WorkOrderScopeItem } from '@/types/thirdParty';
import { WorkOrderPrintTemplate } from '@/components/thirdparty/WorkOrderPrintTemplate';

const DEFAULT_TIMELINE = [
  "Mobilization within 2 days from issuance of this Work Order.",
  "Site investigation work shall be completed after mobilization.",
  "Final Report shall be submitted after completion of testing."
];

const DEFAULT_PAYMENT = [
  "50% advance after mobilization",
  "50% after submission of report."
];

const DEFAULT_TERMS = [
  "All work must be carried out as per approved technical norms.",
  "Any revisions required due to technical discrepancies must be corrected without extra charges.",
  "Payment will be made after successful completion, with applicable deductions as per rules.",
  "The agency is responsible for design accuracy, safety provisions in design, and timely submission."
];

export default function WorkOrderGenerator() {
  const { workId } = useParams<{ workId: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [work, setWork] = useState<ThirdPartyWork | null>(null);
  const [contractor, setContractor] = useState<ThirdPartyContractor | null>(null);

  const [formData, setFormData] = useState<WorkOrderData>({
    subject: '',
    date: new Date().toLocaleDateString('en-GB'),
    to_address: '',
    project_details: { project: '', location: '' },
    completion_timeline: DEFAULT_TIMELINE,
    terms_of_payment: DEFAULT_PAYMENT,
    terms_and_conditions: DEFAULT_TERMS,
    scope_of_work: []
  });

  useEffect(() => {
    async function fetchData() {
      if (!workId) return;
      setIsLoading(true);
      try {
        const { data: workData, error: workError } = await supabase
          .from('third_party_works')
          .select('*')
          .eq('id', workId)
          .single();

        if (workError) throw workError;

        const { data: contractorData, error: contractorError } = await supabase
          .from('third_party_contractors')
          .select('*')
          .eq('id', workData.contractor_id)
          .single();

        if (contractorError) throw contractorError;

        setWork(workData as ThirdPartyWork);
        setContractor(contractorData as ThirdPartyContractor);

        const rawWorkData = workData as any;

        if (rawWorkData.work_order_data) {
          setFormData(rawWorkData.work_order_data as any);
        } else {
          setFormData({
            subject: `Work Order for ${workData.work_name}`,
            date: new Date().toLocaleDateString('en-GB'),
            to_address: `${contractorData.name || ''}\n${contractorData.address || ''}`,
            project_details: {
              project: workData.work_name,
              location: ''
            },
            completion_timeline: DEFAULT_TIMELINE,
            terms_of_payment: DEFAULT_PAYMENT,
            terms_and_conditions: DEFAULT_TERMS,
            scope_of_work: [
              {
                id: Math.random().toString(36).substr(2, 9),
                description: workData.work_name,
                type_of_work: '',
                length_span: '',
                rate: '',
                amount: workData.sanction_amount
              }
            ]
          });
        }
      } catch (error) {
        console.error(error);
        toast.error(`Unable to load work order data. ${getReadableError(error)}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [workId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `WorkOrder_${work?.qt_no || 'Draft'}`
  });

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!workId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('third_party_works' as any)
        .update({ work_order_data: formData as any })
        .eq('id', workId);

      if (error) throw error;
      toast.success('Work order saved successfully');
    } catch (error) {
      console.error(error);
      toast.error(`Unable to save work order. ${getReadableError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAndSync = async () => {
    await handleSave();
    handlePrint();
  };

  const addScopeItem = () => {
    setFormData(prev => ({
      ...prev,
      scope_of_work: [
        ...prev.scope_of_work,
        { id: Math.random().toString(), description: '', type_of_work: '', length_span: '', rate: '', amount: 0 }
      ]
    }));
  };

  const removeScopeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      scope_of_work: prev.scope_of_work.filter(item => item.id !== id)
    }));
  };

  const updateScopeItem = (id: string, field: keyof WorkOrderScopeItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      scope_of_work: prev.scope_of_work.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const updateListField = (field: 'completion_timeline' | 'terms_of_payment' | 'terms_and_conditions', text: string) => {
    setFormData(prev => ({ ...prev, [field]: text.split('\n').filter(Boolean) }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  if (!work || !contractor) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10px)] bg-slate-50 p-4 font-sans">
      {/* LEFT PANE: Editor */}
      <div className="w-full lg:w-1/3 shrink-0 bg-white p-5 rounded-lg shadow-sm border border-slate-200 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(`/third-party/work/${workId}`)} className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="bg-blue-600 text-white p-1 rounded">
              <Printer size={14} />
            </span>
            Work Order Generator
          </div>
        </div>

        <div className="space-y-5 mb-8">
          {/* Header Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Subject</label>
                <input type="text" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                <input type="text" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Address</label>
              <textarea value={formData.to_address} onChange={e => setFormData({ ...formData, to_address: e.target.value })} rows={3} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Project Name</label>
                <input type="text" value={formData.project_details.project} onChange={e => setFormData({ ...formData, project_details: { ...formData.project_details, project: e.target.value } })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location</label>
                <input type="text" value={formData.project_details.location} onChange={e => setFormData({ ...formData, project_details: { ...formData.project_details, location: e.target.value } })} className="w-full border p-2.5 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none bg-slate-50/50" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">Scope of Work</h3>
              <button onClick={addScopeItem} className="text-[11px] font-bold flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                <Plus size={14} /> Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.scope_of_work.map((item, index) => (
                <div key={item.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 relative group shadow-sm hover:border-blue-200 transition-all">
                  <button onClick={() => removeScopeItem(item.id)} className="absolute -top-2 -right-2 text-white bg-slate-300 hover:bg-red-500 p-1.5 rounded-full shadow-sm transition-colors"><Trash2 size={12} /></button>
                  <div className="flex gap-2 mb-3">
                    <span className="mt-2 font-bold text-xs w-4">{index + 1}.</span>
                    <input placeholder="Description" value={item.description} onChange={e => updateScopeItem(item.id, 'description', e.target.value)} className="flex-1 border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pl-6">
                    <input placeholder="Type" value={item.type_of_work} onChange={e => updateScopeItem(item.id, 'type_of_work', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                    <input placeholder="Length/Span" value={item.length_span} onChange={e => updateScopeItem(item.id, 'length_span', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                    <input placeholder="Rate" value={item.rate} onChange={e => updateScopeItem(item.id, 'rate', e.target.value)} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                    <input placeholder="Amount" type="number" value={item.amount || ''} onChange={e => updateScopeItem(item.id, 'amount', Number(e.target.value))} className="border p-2 rounded-lg text-xs bg-white focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Completion Timeline (One per line)</label>
              <textarea 
                rows={4} 
                value={formData.completion_timeline.join('\n')} 
                onChange={e => updateListField('completion_timeline', e.target.value)} 
                className="w-full border p-2.5 rounded-lg text-xs outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Terms of Payment (One per line)</label>
              <textarea 
                rows={4} 
                value={formData.terms_of_payment.join('\n')} 
                onChange={e => updateListField('terms_of_payment', e.target.value)} 
                className="w-full border p-2.5 rounded-lg text-xs outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Terms & Conditions (One per line)</label>
              <textarea 
                rows={6} 
                value={formData.terms_and_conditions.join('\n')} 
                onChange={e => updateListField('terms_and_conditions', e.target.value)} 
                className="w-full border p-2.5 rounded-lg text-xs outline-none bg-slate-50/50 focus:ring-1 focus:ring-blue-500" 
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-50 font-bold text-sm shadow-sm transition-all"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Draft
          </button>
          <button
            onClick={handleGenerateAndSync}
            disabled={isSaving}
            className="flex-1 bg-blue-800 text-white py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-blue-900 font-bold text-sm shadow-md transition-all"
          >
            <Printer size={16} />
            Generate PDF
          </button>
        </div>
      </div>

      {/* RIGHT PANE: Preview & PDF */}
      <div className="flex-1 bg-gray-200 rounded-lg border border-gray-300 flex flex-col items-center overflow-auto p-4 gap-4 custom-scrollbar">
        <div className="flex gap-4 w-full justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 shrink-0 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Printer className="text-blue-600" /> Preview Mode</h2>
            <p className="text-xs font-medium text-slate-500">Live preview of the work order PDF.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-blue-700 text-white font-bold text-sm rounded shadow-md hover:bg-blue-800 transition-colors">
              <Printer size={16} /> Print PDF
            </button>
          </div>
        </div>

        {/* The actual component we print */}
        <div className="shrink-0 bg-white shadow-2xl relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '0' }}>
          <WorkOrderPrintTemplate
            ref={printRef}
            work={work}
            contractor={contractor}
            workOrderData={formData}
          />
        </div>
      </div>
    </div>
  );
}
