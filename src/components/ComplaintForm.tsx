
import React, { useState, useEffect } from 'react';
import { ComplaintCategory, LocationType, UserProfile } from '../types';
import { addComplaint } from '../services/complaintService';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  user: UserProfile;
  onSuccess: () => void;
}

const ComplaintForm: React.FC<Props> = ({ user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>('Room');
  const [category, setCategory] = useState<ComplaintCategory>('Electrical');
  const [washroomBlock, setWashroomBlock] = useState<string>(`T-${user.floor}1`);
  const [messBranch, setMessBranch] = useState<'A' | 'B'>('A');
  const [description, setDescription] = useState('');

  // Generate blocks like T-21, T-22, T-23, T-24 for floor 2
  const washroomBlocks = [1, 2, 3, 4].map(n => `T-${user.floor}${n}`);

  // Auto-set category when Location changes
  useEffect(() => {
    if (locationType === 'Mess') setCategory('Mess');
    else if (category === 'Mess') setCategory('Electrical');
  }, [locationType]);

  const handleAiAssist = async () => {
    if (description.length < 5) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Hostel Problem: "${description}". Categorize (Electrical, Plumbing, Cleanliness, Other) and rewrite professionally for a warden.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCategory: { type: Type.STRING },
              refinedDescription: { type: Type.STRING }
            },
            required: ["suggestedCategory", "refinedDescription"]
          }
        }
      });
      const data = JSON.parse(response.text || '{}');
      if (data.suggestedCategory) {
        const valid: any = ['Electrical', 'Plumbing', 'Cleanliness', 'Other'];
        if (valid.includes(data.suggestedCategory)) setCategory(data.suggestedCategory);
      }
      if (data.refinedDescription) setDescription(data.refinedDescription);
    } catch (err) { console.error(err); } finally { setAiLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let subLoc = '';
      if (locationType === 'Room') subLoc = `Room ${user.roomNumber}`;
      else if (locationType === 'Washroom') subLoc = washroomBlock;
      else if (locationType === 'Mess') subLoc = `Mess ${messBranch}`;

      await addComplaint({
        studentName: user.name,
        uid: user.uid,
        floor: user.floor,
        roomNumber: user.roomNumber,
        complaintCategory: category,
        locationType: locationType,
        subLocation: subLoc,
        description: description.trim(),
        status: 'Pending',
        messBranch: locationType === 'Mess' ? messBranch : undefined,
        washroomBlock: locationType === 'Washroom' ? washroomBlock : undefined
      });
      onSuccess();
    } catch (error) { alert('Submission failed.'); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Report Issue</h2>
        <button type="button" onClick={handleAiAssist} disabled={aiLoading || !description} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest active-scale">
          {aiLoading ? 'Thinking...' : '✨ AI Fix'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: WHERE? */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Where is the issue?</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Room', 'Washroom', 'Mess'] as LocationType[]).map(loc => (
              <button key={loc} type="button" onClick={() => setLocationType(loc)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active-scale ${locationType === loc ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-50 text-slate-500'}`}>
                {loc === 'Room' ? '🏠 ' : loc === 'Washroom' ? '🚿 ' : '🍽️ '} {loc}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: DYNAMIC LOCATION DETAIL */}
        {locationType === 'Washroom' && (
          <div className="bg-indigo-50 p-5 rounded-[2rem] border border-indigo-100 animate-in slide-in-from-top-2">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center block mb-4">Select Washroom Block</label>
            <div className="grid grid-cols-2 gap-3">
              {washroomBlocks.map(block => (
                <button key={block} type="button" onClick={() => setWashroomBlock(block)} className={`py-4 rounded-2xl font-black text-lg active-scale border-2 transition-all ${washroomBlock === block ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>
                  {block}
                </button>
              ))}
            </div>
          </div>
        )}

        {locationType === 'Mess' && (
          <div className="bg-indigo-50 p-5 rounded-[2rem] border border-indigo-100 animate-in slide-in-from-top-2">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center block mb-4">Select Mess Branch</label>
            <div className="flex gap-3">
              {(['A', 'B'] as const).map(branch => (
                <button key={branch} type="button" onClick={() => setMessBranch(branch)} className={`flex-1 py-4 rounded-2xl font-black text-lg active-scale border-2 transition-all ${messBranch === branch ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}>
                  Mess {branch}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: CATEGORY (IF NOT MESS) */}
        {locationType !== 'Mess' && (
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">What is the problem?</label>
            <div className="grid grid-cols-2 gap-2">
              {['Electrical', 'Plumbing', 'Cleanliness', 'Other'].map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat as any)} className={`py-4 rounded-2xl text-xs font-black transition-all active-scale ${category === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500'}`}>{cat}</button>
              ))}
            </div>
          </div>
        )}

        <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Type issue details here..." className="w-full bg-slate-50 border-none rounded-3xl p-6 h-32 font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" />

        <button type="submit" disabled={loading || description.length < 5} className="w-full py-5 bg-[#0f172a] text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active-scale disabled:opacity-50 transition-all">
          {loading ? 'PROCESSING...' : 'SUBMIT REPORT'}
        </button>
      </form>
    </div>
  );
};

export default ComplaintForm;
