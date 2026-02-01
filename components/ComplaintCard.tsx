
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
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 active-scale transition-all overflow-hidden mb-4 relative">
      
      {/* TOP-RIGHT STATUS BADGE */}
      <div className="absolute top-6 right-6 z-10">
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

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(complaint.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
          </div>
          {isWarden && (
            <span className="text-[11px] font-black text-indigo-600 truncate max-w-[120px]">
              👤 {complaint.studentName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* STUDENT VERIFICATION CODE */}
          {!isWarden && complaint.status === 'In Progress' && currentUserUid === complaint.uid && (
            <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-2xl flex flex-col items-start shadow-sm animate-in fade-in slide-in-from-right-2">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">OTP CODE</span>
              <span className="text-sm font-black text-blue-800 tracking-[0.2em] leading-none">{complaint.resolveOTP}</span>
            </div>
          )}

          <div className="flex gap-2">
            {isWarden && (
              <>
                {complaint.status === 'Pending' && (
                  <button 
                    onClick={() => onStatusUpdate?.(complaint.id!, 'In Progress')} 
                    className="bg-indigo-600 text-white px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active-scale transition-all flex items-center gap-2"
                  >
                    <span>▶️</span> START WORK
                  </button>
                )}

                {complaint.status === 'In Progress' && (
                  isVerifying ? (
                    <form onSubmit={handleOtpSubmit} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        autoFocus 
                        type="text" 
                        maxLength={4} 
                        value={otpInput} 
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g,''))} 
                        placeholder="PIN" 
                        className="w-16 bg-slate-100 border-2 border-emerald-100 rounded-xl text-center font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                      />
                      <button type="submit" className="bg-emerald-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg">
                        CONFIRM
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsVerifying(false); setOtpInput(''); }} 
                        className="bg-slate-100 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center font-black active:bg-rose-50 transition-colors"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button 
                      onClick={() => setIsVerifying(true)} 
                      className="bg-emerald-500 text-white px-6 py-3 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 active-scale transition-all flex items-center gap-2"
                    >
                      <span>✅</span> RESOLVE
                    </button>
                  )
                )}
              </>
            )}
            
            {/* COMMUNITY SUPPORT BUTTON */}
            {(!isWarden && (complaint.locationType === 'Washroom' || complaint.locationType === 'Mess')) && complaint.status !== 'Resolved' && (
              <button 
                onClick={() => onSupportToggle?.(complaint.id!)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-[1.25rem] text-[10px] font-black active-scale border transition-all ${complaint.supportUids?.includes(currentUserUid || '') ? 'bg-indigo-600 text-white border-none shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200'}`}
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
