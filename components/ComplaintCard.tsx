
import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props {
  complaint: Complaint;
  isWarden?: boolean;
  currentUserUid?: string;
  onStatusUpdate?: (id: string, status: ComplaintStatus) => void;
  onSupportToggle?: (id: string) => void;
}

const ComplaintCard: React.FC<Props> = ({ complaint, isWarden, currentUserUid, onStatusUpdate, onSupportToggle }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const statusMap = {
    'Pending': 'bg-amber-400 text-white shadow-amber-100',
    'In Progress': 'bg-indigo-600 text-white shadow-indigo-100',
    'Resolved': 'bg-emerald-500 text-white shadow-emerald-100',
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === complaint.resolveOTP) {
      onStatusUpdate?.(complaint.id!, 'Resolved');
      setIsVerifying(false);
    } else {
      alert("Incorrect Code. Please check with the student.");
      setOtpInput('');
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 transition-all overflow-hidden mb-4 relative z-0">
      
      {/* TOP-RIGHT STATUS BADGE - Z-INDEX LOWERED TO PREVENT OVERLAP WITH STICKY HEADER */}
      <div className="absolute top-6 right-6 z-0">
        <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${statusMap[complaint.status]}`}>
          {complaint.status}
        </div>
      </div>

      {/* HEADER SECTION */}
      <div className="flex items-start mb-4">
        <div className="flex items-center gap-4 pr-20">
          <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-inner border border-slate-100 shrink-0">
            {complaint.complaintCategory === 'Electrical' ? '⚡' : 
             complaint.complaintCategory === 'Plumbing' ? '🚰' :
             complaint.complaintCategory === 'Mess' ? '🍱' : 
             complaint.complaintCategory === 'Cleanliness' ? '🧹' : '📝'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-base font-black text-slate-900 tracking-tight leading-none truncate max-w-[140px]">{complaint.subLocation}</h4>
              {complaint.washroomBlock && (
                <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase">Block</span>
              )}
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {complaint.locationType} • {complaint.complaintCategory}
            </span>
          </div>
        </div>
      </div>

      {/* DESCRIPTION BLOCK */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-5">
        <p className="text-sm font-bold text-slate-600 leading-relaxed italic">"{complaint.description}"</p>
      </div>

      {/* FOOTER ACTIONS - HEIGHT STANDARDIZED TO PREVENT MISALIGNMENT */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-5 min-h-[56px]">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-0.5">
             <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(complaint.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
          </div>
          {isWarden && (
            <span className="text-[10px] font-black text-indigo-600 truncate max-w-[110px] flex items-center gap-1">
              <span className="opacity-50 text-[8px]">👤</span> {complaint.studentName}
            </span>
          )}
        </div>

        <div className="flex items-center">
          {/* STUDENT VERIFICATION CODE (VIEW ONLY) */}
          {!isWarden && complaint.status === 'In Progress' && currentUserUid === complaint.uid && (
            <div className="bg-blue-50 border border-blue-100 px-4 h-11 rounded-2xl flex flex-col items-center justify-center shadow-sm animate-in fade-in slide-in-from-right-2 mr-2">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">OTP CODE</span>
              <span className="text-sm font-black text-blue-800 tracking-[0.2em] leading-none">{complaint.resolveOTP}</span>
            </div>
          )}

          <div className="flex items-center gap-2 h-11">
            {isWarden && (
              <>
                {complaint.status === 'Pending' && (
                  <button 
                    onClick={() => onStatusUpdate?.(complaint.id!, 'In Progress')} 
                    className="bg-indigo-600 h-11 text-white px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active-scale flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span className="text-xs">▶️</span> START WORK
                  </button>
                )}

                {complaint.status === 'In Progress' && (
                  isVerifying ? (
                    <form onSubmit={handleOtpSubmit} className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        autoFocus 
                        type="text" 
                        maxLength={4} 
                        value={otpInput} 
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g,''))} 
                        placeholder="PIN" 
                        className="w-14 h-11 bg-slate-100 border-2 border-emerald-100 rounded-2xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner" 
                      />
                      <button type="submit" className="bg-emerald-500 h-11 text-white px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center whitespace-nowrap">
                        DONE
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsVerifying(false); setOtpInput(''); }} 
                        className="bg-slate-100 text-slate-400 w-11 h-11 rounded-2xl flex items-center justify-center font-black active:bg-rose-50 transition-colors shadow-sm"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button 
                      onClick={() => setIsVerifying(true)} 
                      className="bg-emerald-500 h-11 text-white px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 active-scale flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <span className="text-xs">✅</span> RESOLVE
                    </button>
                  )
                )}
              </>
            )}
            
            {/* COMMUNITY SUPPORT BUTTON */}
            {(!isWarden && (complaint.locationType === 'Washroom' || complaint.locationType === 'Mess')) && complaint.status !== 'Resolved' && (
              <button 
                onClick={() => onSupportToggle?.(complaint.id!)} 
                className={`flex items-center justify-center gap-2 px-5 h-11 rounded-2xl text-[9px] font-black active-scale border transition-all ${complaint.supportUids?.includes(currentUserUid || '') ? 'bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                🤝 {complaint.supportUids?.length || 0} ME TOO
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
