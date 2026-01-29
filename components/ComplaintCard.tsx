
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
    'Pending': 'bg-amber-400 text-white shadow-amber-200',
    'In Progress': 'bg-indigo-600 text-white shadow-indigo-200',
    'Resolved': 'bg-emerald-500 text-white shadow-emerald-200',
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
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-200/60 active-scale transition-all overflow-hidden mb-4 relative">
      
      {/* TOP-RIGHT STATUS BADGE */}
      <div className="absolute top-5 right-5 z-10">
        <div className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg ${statusMap[complaint.status]}`}>
          {complaint.status}
        </div>
      </div>

      <div className="flex items-start mb-4">
        <div className="flex items-center gap-3 pr-20">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100 shrink-0">
            {complaint.complaintCategory === 'Electrical' ? '⚡' : 
             complaint.complaintCategory === 'Plumbing' ? '🚰' :
             complaint.complaintCategory === 'Mess' ? '🍱' : 
             complaint.complaintCategory === 'Cleanliness' ? '🧹' : '📝'}
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none truncate max-w-[120px]">{complaint.subLocation}</h4>
              {complaint.washroomBlock && (
                <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">Block</span>
              )}
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {complaint.locationType} • {complaint.complaintCategory}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-4">
        <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{complaint.description}"</p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            {new Date(complaint.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
          {isWarden && <span className="text-[10px] font-black text-indigo-600 truncate max-w-[100px]">{complaint.studentName}</span>}
        </div>

        <div className="flex items-center gap-4">
          {/* REPOSITIONED VERIFICATION CODE BADGE (Student Only, In Progress Only) */}
          {!isWarden && complaint.status === 'In Progress' && currentUserUid === complaint.uid && (
            <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl flex flex-col items-start shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Verification Code</span>
              <span className="text-sm font-black text-blue-800 tracking-[0.2em] leading-none">{complaint.resolveOTP}</span>
            </div>
          )}

          <div className="flex gap-2">
            {isWarden && (
              <>
                {complaint.status === 'Pending' && (
                  <button 
                    onClick={() => onStatusUpdate?.(complaint.id!, 'In Progress')} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg active-scale transition-all"
                  >
                    Start Work
                  </button>
                )}

                {complaint.status === 'In Progress' && (
                  isVerifying ? (
                    <form onSubmit={handleOtpSubmit} className="flex gap-1 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        autoFocus 
                        type="text" 
                        maxLength={4} 
                        value={otpInput} 
                        onChange={e => setOtpInput(e.target.value.replace(/\D/g,''))} 
                        placeholder="PIN" 
                        className="w-14 bg-slate-100 border-none rounded-lg text-center font-black text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                      />
                      <button type="submit" className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase shadow-sm">
                        Verify
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setIsVerifying(false); setOtpInput(''); }} 
                        className="text-slate-300 px-1 text-[10px] font-black active:text-rose-500 transition-colors"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <button 
                      onClick={() => setIsVerifying(true)} 
                      className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg active-scale transition-all"
                    >
                      Resolve
                    </button>
                  )
                )}
              </>
            )}
            
            {(!isWarden && (complaint.locationType === 'Washroom' || complaint.locationType === 'Mess')) && complaint.status !== 'Resolved' && (
              <button onClick={() => onSupportToggle?.(complaint.id!)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black active-scale border transition-all ${complaint.supportUids?.includes(currentUserUid || '') ? 'bg-indigo-600 text-white border-none shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}>
                🤝 {complaint.supportUids?.length || 0} Me too
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
