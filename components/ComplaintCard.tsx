import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface Props {
  complaint: Complaint;
  isAdmin?: boolean;
  currentUserUid?: string;
  onStatusUpdate?: (id: string, status: ComplaintStatus) => void;
  onSupportToggle?: (id: string) => void;
}

// 1. Static configurations moved outside component to declutter
const CATEGORY_ICONS: Record<string, string> = {
  'Electrical': '⚡',
  'Plumbing': '🚰',
  'Mess': '🍱',
  'Cleanliness': '🧹',
  'Default': '📝'
};

const STATUS_STYLES = {
  'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
  'In Progress': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Resolved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const ComplaintCard: React.FC<Props> = ({ 
  complaint, 
  isAdmin, 
  currentUserUid, 
  onStatusUpdate, 
  onSupportToggle 
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState(false); // UI Error state instead of alert

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === complaint.resolveOTP) {
      onStatusUpdate?.(complaint.id!, 'Resolved');
      setIsVerifying(false);
      setError(false);
    } else {
      setError(true);
      setOtpInput('');
    }
  };

  // Helper to format time cleanly
  const formattedTime = new Date(complaint.timestamp).toLocaleTimeString([], {
    hour: '2-digit', 
    minute:'2-digit'
  });

  return (
    // Fixed: Removed arbitrary rounded-[2.5rem], used standard rounded-2xl or 3xl
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 transition-all hover:shadow-md mb-4">
      
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl border border-slate-100">
            {CATEGORY_ICONS[complaint.complaintCategory] || CATEGORY_ICONS['Default']}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900">{complaint.subLocation}</h4>
              {complaint.washroomBlock && (
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Block
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase mt-0.5">
              {complaint.locationType} • {complaint.complaintCategory}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[complaint.status]}`}>
          {complaint.status}
        </span>
      </div>

      {/* Description Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
        <p className="text-sm text-slate-700 italic">"{complaint.description}"</p>
      </div>

      {/* Student View: OTP Display */}
      {!isAdmin && complaint.status !== 'Resolved' && currentUserUid === complaint.uid && (
        <div className="bg-slate-900 p-3 rounded-xl mb-4 text-center border border-slate-800">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Fix Code</p>
          <span className="text-xl font-mono font-bold text-white tracking-[0.2em]">{complaint.resolveOTP}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-400">{formattedTime}</span>
          {isAdmin && <span className="text-xs font-bold text-indigo-600 mt-1">{complaint.studentName}</span>}
        </div>

        <div className="flex gap-2">
          {isAdmin ? (
            // Admin Actions
            <>
              {complaint.status === 'Pending' && (
                <button 
                  onClick={() => onStatusUpdate?.(complaint.id!, 'In Progress')} 
                  className="btn-primary bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase"
                >
                  Start Work
                </button>
              )}

              {complaint.status === 'In Progress' && (
                isVerifying ? (
                  <form onSubmit={handleOtpSubmit} className="flex gap-2 items-center">
                    <input 
                      autoFocus 
                      type="text" 
                      maxLength={4} 
                      value={otpInput} 
                      onChange={e => { setOtpInput(e.target.value.replace(/\D/g,'')); setError(false); }} 
                      placeholder="PIN" 
                      className={`w-16 bg-slate-100 border rounded-lg text-center font-bold text-sm outline-none py-1 focus:ring-2 ${error ? 'border-red-500 focus:ring-red-200' : 'border-transparent focus:ring-emerald-200'}`} 
                    />
                    <button type="submit" className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                      OK
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setIsVerifying(false); setError(false); }} 
                      className="text-slate-400 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  </form>
                ) : (
                  <button 
                    onClick={() => setIsVerifying(true)} 
                    className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-600 transition"
                  >
                    Resolve
                  </button>
                )
              )}
            </>
          ) : (
            // Student Actions (Support/Me Too)
            (complaint.locationType === 'Washroom' || complaint.locationType === 'Mess') && complaint.status !== 'Resolved' && (
              <button 
                onClick={() => onSupportToggle?.(complaint.id!)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  complaint.supportUids?.includes(currentUserUid || '') 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>🤝</span> {complaint.supportUids?.length || 0} Me too
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
