const fs = require('fs');
const file = '/Users/harsh/Downloads/UB_MIS-main/src/pages/WorkDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{/* 4. Financial Progress Section */}');
const endIndex = content.indexOf('</PageTransition>', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = `          {/* 4. Financial Progress Section */}
          <div className="pt-10 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <IndianRupee className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-foreground font-heading leading-none">Financial Progress</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5 opacity-60">Realization & History</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Total Value</span>
                <span className="text-sm font-black text-foreground">₹{Number(work.consultancy_cost || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* BENTO GRID CONTAINER */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Gross Received */}
              <div className="md:col-span-3 p-6 rounded-[2rem] bg-white border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Gross Received</p>
                <p className="text-2xl font-black font-heading text-foreground tracking-tighter">₹{(Number(financial.amount) || 0).toLocaleString('en-IN')}</p>
                <div className="mt-4 h-1.5 w-12 bg-primary/20 rounded-full" />
              </div>

              {/* Total Deductions */}
              <div className="md:col-span-3 p-6 rounded-[2rem] bg-red-50 border border-red-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600/60 mb-2">Total Deductions</p>
                <p className="text-2xl font-black font-heading text-red-600 tracking-tighter">₹{totalDeductions.toLocaleString('en-IN')}</p>
                <div className="mt-4 h-1.5 w-12 bg-red-400/40 rounded-full" />
              </div>

              {/* Net Realized & Progress Box */}
              <div className="md:col-span-6 p-6 rounded-[2rem] bg-green-50 border border-green-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-600/60 mb-2">Net Realized</p>
                    <p className="text-3xl font-black font-heading text-green-600 tracking-tighter">₹{netReceived.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60 mb-2">Outstanding</p>
                    <p className="text-xl font-black font-heading text-orange-600 tracking-tighter">₹{outstandingAmount.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-[9px] font-black text-green-600 uppercase tracking-widest">
                      {Math.round((netReceived / (Number(work.consultancy_cost) || 1)) * 100)}% Complete
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">₹{netReceived.toLocaleString('en-IN')} / ₹{Number(work.consultancy_cost).toLocaleString('en-IN')}</span>
                  </div>
                  <Progress value={(netReceived / (Number(work.consultancy_cost) || 1)) * 100} className="h-2.5 bg-green-200/50" />
                </div>
              </div>

              {/* Entry Form */}
              <div className="md:col-span-4 relative p-6 rounded-[2.5rem] bg-primary/[0.03] border border-primary/10 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between border-b border-primary/10 pb-4 mb-5">
                  <h4 className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New Entry</h4>
                </div>

                <div className="flex-1 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Bill Type</label>
                      <div className="flex bg-background rounded-xl border border-border/50 p-1">
                        <button onClick={() => handleBillTypeChange('R')} className={cn("flex-1 text-[9px] font-black py-2 rounded-lg transition-all", !newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>RUN</button>
                        <button onClick={() => handleBillTypeChange('F')} className={cn("flex-1 text-[9px] font-black py-2 rounded-lg transition-all", newPayment.bill_no?.endsWith('/F') ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}>FIN</button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Bill/Ref No</label>
                      <input value={newPayment.bill_no} onChange={(e) => setNewPayment({ ...newPayment, bill_no: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Date</label>
                      <input type="date" value={newPayment.date} onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Amount</label>
                        <button onClick={() => { setUseBaseGst(!useBaseGst); if (!useBaseGst) setBaseAmount(''); }} className="text-[8px] font-black text-primary/60 hover:text-primary uppercase tracking-widest">
                          {useBaseGst ? "Use Gross" : "Base+GST"}
                        </button>
                      </div>
                      {useBaseGst ? (
                        <div className="relative group">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-primary/40 font-black">BASE</span>
                          <input type="number" value={baseAmount} onChange={(e) => {
                            const val = e.target.value; setBaseAmount(val);
                            const num = Number(val) || 0; const gst = Math.round(num * 0.18);
                            setNewPayment({ ...newPayment, amount: String(num + gst), gst: String(gst) });
                          }} className="w-full bg-background/50 rounded-xl border border-border/50 pl-10 pr-2 py-2.5 text-[11px] font-black text-primary outline-none focus:bg-background transition-colors" placeholder="0" />
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40 font-black text-sm">₹</span>
                          <input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 pl-7 pr-3 py-2.5 text-xs font-black text-primary outline-none focus:ring-2 focus:ring-primary/20" placeholder="Gross" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Work Particulars</label>
                    <input value={newPayment.work_detail} onChange={(e) => setNewPayment({ ...newPayment, work_detail: e.target.value })} className="w-full bg-background rounded-xl border border-border/50 px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20" placeholder="Brief description..." />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Deductions</label>
                      <button onClick={() => {
                        const gross = Number(newPayment.amount) || 0;
                        setNewPayment({ ...newPayment, it: String(Math.round(gross * 0.02)), lc: String(Math.round(gross * 0.01)), sd: String(Math.round(gross * 0.10)) });
                      }} className="text-[8px] font-black bg-primary/10 text-primary px-2 py-1 rounded-md uppercase hover:bg-primary/20 transition-colors">Auto Fill</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['gst', 'it', 'lc', 'sd'].map((key) => (
                        <div key={key} className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[7px] text-muted-foreground/40 font-bold uppercase">{key}</span>
                          <input type="number" value={(newPayment as any)[key]} onChange={(e) => setNewPayment({ ...newPayment, [key]: e.target.value })} className="w-full bg-background/50 rounded-lg border border-border/50 pl-6 pr-1 py-2 text-[10px] font-bold outline-none text-center focus:bg-background transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-primary/5 flex flex-col gap-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Net Realizable</span>
                    <span className="text-lg font-black text-primary tracking-tight">₹{((Number(newPayment.amount) || 0) - ((Number(newPayment.gst) || 0) + (Number(newPayment.it) || 0) + (Number(newPayment.lc) || 0) + (Number(newPayment.sd) || 0))).toLocaleString('en-IN')}</span>
                  </div>
                  <Button onClick={handleAddPayment} className="w-full font-black uppercase tracking-widest py-5 rounded-xl shadow-xl shadow-primary/20 text-xs">Add Entry</Button>
                </div>
              </div>

              {/* History Table */}
              <div className="md:col-span-8 flex flex-col gap-4">
                <div className="flex-1 rounded-[2.5rem] border bg-card shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="px-6 py-5 border-b bg-muted/20 flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Payment History</h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-background border text-[10px] font-black text-muted-foreground/60">{financial.payments?.length || 0} Records</span>
                  </div>
                  
                  <div className="flex-1 overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="border-b bg-muted/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                          <th className="px-5 py-4">Bill</th>
                          <th className="px-4 py-4">Date</th>
                          <th className="px-5 py-4">Particulars</th>
                          <th className="px-4 py-4 text-right">Gross</th>
                          <th className="px-4 py-4 text-right text-red-600">Deds.</th>
                          <th className="px-5 py-4 text-right text-primary">Net</th>
                          <th className="px-4 py-4 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {financial.payments?.length ? (
                          financial.payments.map((payment) => {
                            const pDeductions = (Number(payment.deductions?.gst) || 0) + (Number(payment.deductions?.it) || 0) + (Number(payment.deductions?.lc) || 0) + (Number(payment.deductions?.sd) || 0);
                            const pNet = payment.amount - pDeductions;
                            return (
                              <tr key={payment.id} className="group hover:bg-muted/5 transition-colors">
                                <td className="px-5 py-3.5">
                                  <span className={cn("px-2 py-1 rounded-lg font-black text-[9px] tracking-widest uppercase", payment.bill_no?.endsWith('/F') ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary")}>{payment.bill_no || '-'}</span>
                                </td>
                                <td className="px-4 py-3.5 text-[11px] font-bold text-muted-foreground whitespace-nowrap">{payment.date}</td>
                                <td className="px-5 py-3.5">
                                  <p className="text-[11px] font-medium text-foreground/80 leading-relaxed max-w-[180px] truncate" title={payment.work_detail}>{payment.work_detail || '-'}</p>
                                </td>
                                <td className="px-4 py-3.5 text-right font-black text-xs tracking-tight whitespace-nowrap">₹{payment.amount.toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3.5 text-right">
                                  <p className="text-[10px] font-bold text-red-600/80 tracking-tighter whitespace-nowrap">₹{pDeductions.toLocaleString('en-IN')}</p>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-500/5 border border-green-500/10">
                                    <span className="text-[11px] font-black text-green-600">₹{pNet.toLocaleString('en-IN')}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-center">
                                  <button onClick={() => handleRemovePayment(payment.id)} className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-24 text-center text-xs font-black uppercase opacity-20 tracking-widest">No payment records found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleGlobalSave} disabled={isSaving} className="w-full md:w-auto min-w-[280px] font-black uppercase tracking-widest py-7 rounded-[2rem] text-xs shadow-2xl border-b-4 border-primary/30 h-auto hover:translate-y-[-2px] transition-transform">
                    {isSaving ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Save className="mr-3 h-4 w-4" />}
                    {isSaving ? "UPDATING..." : "SAVE FINANCIAL RECORDS"}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;
  
  content = content.substring(0, startIndex) + newContent + content.substring(endIndex - 8); // -8 includes the spaces for </PageTransition>
  fs.writeFileSync(file, content);
  console.log('Update applied');
} else {
  console.log('Could not find indices');
}
