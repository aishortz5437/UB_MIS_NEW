import React, { forwardRef } from 'react';
import { ThirdPartyWork, WorkOrderData, ThirdPartyContractor } from '@/types/thirdParty';
const logoPath = '/Quotation-logo.png';

interface WorkOrderPrintTemplateProps {
  work: ThirdPartyWork;
  contractor: ThirdPartyContractor | null;
  workOrderData: WorkOrderData;
}

const Header = () => (
  <>
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-3">
        <img src={logoPath} alt="Logo" className="w-20 object-contain" />
        <div>
          <h1 className="text-2xl font-black text-[#1a3f85] tracking-tight leading-none">
            URBANBUILD<span className="text-[8px] font-medium align-top ml-0.5">TM</span>
          </h1>
          <p className="text-[#1a3f85] font-bold text-[11px] tracking-widest uppercase mt-0.5">Design ◆ Consultancy ◆ Construction</p>
        </div>
      </div>
      <div className="text-right pt-1 text-[#1a3f85]">
        <p className="text-[10px] font-bold">GSTIN: 05BSSPT0457K1Z4</p>
        <p className="text-xs font-bold text-slate-800">📞 82917 22917</p>
      </div>
    </div>

    <div className="bg-blue-50 border border-blue-100 py-0.5 px-2 text-center text-[8px] mb-1 uppercase font-bold tracking-wider">
      <span className="text-slate-700">Associate Partner:</span> <span className="text-red-600 ml-1">Civil Tech Laboratory</span> <span className="text-slate-500">(NABL accredited, ISO certified)</span>
    </div>

    <div className="text-[8px] text-center text-slate-600 border-b border-[#1a3f85] pb-1 mb-1.5 leading-tight">
      <p>Address: Bhaniyawala Tiraha, Jollygrant, Dehradun(UK)-248140</p>
      <p className="mt-0.5">
        Email: <span className="text-[#1a3f85] font-bold">consultancy@urbanbuild.co.in</span> | Website: <span className="text-[#1a3f85] font-bold">urbanbuild.co.in</span>
      </p>
    </div>
  </>
);

const Footer = () => (
  <>
    <div className="mt-auto break-inside-avoid shrink-0 space-y-4 pt-10">
      <div className="flex justify-end pr-4">
        <div className="text-left flex flex-col items-start border-l-2 border-blue-100 pl-4">
          <p className="text-[10px] font-medium italic text-slate-500 mb-1">Yours sincerely,</p>
          <p className="font-black text-[12px] uppercase tracking-widest text-[#1a3f85] mb-2">
            For URBANBUILD™
          </p>
          <p className="font-bold text-[12px] text-slate-900 tracking-tight">Er. Naveen Kumar</p>
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Assistant Director (Consultancy)</p>
        </div>
      </div>

      <div className="text-center pb-2">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 rounded-full text-[7px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 shadow-sm">
          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          This is a computer generated work order and does not require a physical signature
        </span>
      </div>
    </div>
    
    <div className="absolute bottom-4 left-0 right-0 px-10">
      <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[7.5px] text-slate-400 font-medium tracking-wide">
        <p>IT Applications by: <span className="font-bold text-slate-600">Aetroniq Digital & Automation Services</span></p>
        <p>Powered by <span className="font-black text-slate-800">URBANBUILD™</span></p>
      </div>
    </div>
  </>
);

export const WorkOrderPrintTemplate = forwardRef<HTMLDivElement, WorkOrderPrintTemplateProps>(
  ({ work, contractor, workOrderData }, ref) => {
    const refNo = work.qt_no || `WO/${work.id.substring(0, 8).toUpperCase()}`;

    return (
      <div ref={ref} className="flex flex-col gap-8 print:gap-0 shrink-0 mx-auto text-black font-sans">
        
        {/* --- PAGE 1 --- */}
        <div className="bg-white shadow-2xl flex flex-col relative print:shadow-none" style={{ width: '210mm', minHeight: '297mm', padding: '10mm 15mm' }}>
          <Header />

          {/* Ref No and Date */}
          <div className="flex justify-between items-center text-sm font-bold mb-6 mt-4">
            <div>L.NO.: {refNo}</div>
            <div>Date: {workOrderData.date || new Date().toLocaleDateString('en-GB')}</div>
          </div>

          {/* To Address */}
          <div className="text-sm font-semibold mb-6 whitespace-pre-wrap leading-relaxed">
            <p>To,</p>
            <p className="ml-8">{workOrderData.to_address || `${contractor?.name}\n${contractor?.address}`}</p>
          </div>

          {/* Subject */}
          <div className="border-y border-gray-300 py-2 mb-6 text-sm font-bold bg-gray-50 uppercase">
            Sub: {workOrderData.subject}
          </div>

          {/* Salutation */}
          <div className="text-sm mb-4">
            <p className="font-bold mb-2">Respected Sir,</p>
            <p className="ml-8">
              With reference to your quotation, we are pleased to issue this work order for carrying out the following services on the terms and conditions mentioned below:
            </p>
          </div>

          {/* Scope of Work Table */}
          {workOrderData.scope_of_work && workOrderData.scope_of_work.length > 0 && (
            <div className="mb-8">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left w-12">S.No.</th>
                    <th className="border border-gray-300 p-2 text-left">Project Name / Description</th>
                    <th className="border border-gray-300 p-2 text-left">Type of Work</th>
                    <th className="border border-gray-300 p-2 text-left">Length / Span</th>
                    <th className="border border-gray-300 p-2 text-right">Rate</th>
                    <th className="border border-gray-300 p-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrderData.scope_of_work.map((item, index) => (
                    <tr key={item.id}>
                      <td className="border border-gray-300 p-2 font-semibold">{index + 1}</td>
                      <td className="border border-gray-300 p-2">{item.description}</td>
                      <td className="border border-gray-300 p-2">{item.type_of_work}</td>
                      <td className="border border-gray-300 p-2">{item.length_span}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{item.rate}</td>
                      <td className="border border-gray-300 p-2 text-right">₹{item.amount?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={5} className="border border-gray-300 p-2 text-right">Sub Total</td>
                    <td className="border border-gray-300 p-2 text-right">
                      ₹{workOrderData.scope_of_work.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <Footer />
        </div>

        {/* --- PAGE 2 --- */}
        <div className="bg-white shadow-2xl flex flex-col relative print:shadow-none print:break-before-page" style={{ width: '210mm', minHeight: '297mm', padding: '10mm 15mm' }}>
          <Header />

          <div className="space-y-6 text-sm mt-8">
            {/* Project Details */}
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-black block"></span>
                Project Details:
              </h3>
              <ul className="space-y-2 ml-6">
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><span className="font-semibold">Project:</span> {workOrderData.project_details?.project}</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><span className="font-semibold">Location:</span> {workOrderData.project_details?.location}</span>
                </li>
              </ul>
            </div>

            <div className="w-full h-px bg-gray-300"></div>

            {/* Completion Timeline */}
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-black block"></span>
                Completion Timeline:
              </h3>
              <ul className="space-y-2 ml-6">
                {workOrderData.completion_timeline.map((line, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span>✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full h-px bg-gray-300"></div>

            {/* Terms of Payment */}
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-black block"></span>
                Terms of Payment:
              </h3>
              <ul className="space-y-2 ml-6">
                {workOrderData.terms_of_payment.map((line, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span>✓</span>
                    <span dangerouslySetInnerHTML={{ __html: line.replace(/(\d+%)/g, '<span class="font-bold">$1</span>') }} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full h-px bg-gray-300"></div>

            {/* Terms & Conditions */}
            <div>
              <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-black block"></span>
                Terms & Conditions:
              </h3>
              <ul className="space-y-2 ml-6">
                {workOrderData.terms_and_conditions.map((line, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span>✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    );
  }
);

WorkOrderPrintTemplate.displayName = 'WorkOrderPrintTemplate';
