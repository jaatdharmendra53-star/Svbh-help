
import React, { useState, useEffect } from 'react';
import { ComplaintCategory, LocationType, UserProfile } from '../types';
import { addComplaint } from '../services/complaintService';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  user: UserProfile;
  onSuccess: () => void;
}

// Update this URL when you have your hosted image file
const MESS_MENU_IMAGE_URL = ""; 

const MENU_DATA = [
  { day: 'Monday', bf: 'पनीर पराठा, सॉस, ब्रेड, जैम, मक्खन, चाय, स्प्राउट, कॉर्नफ्लेक्स, केला', lunch: 'दाल तड़का, आलू फ्राई, फ्राई मिर्च, रोटी, सलाद, चावल, अचार', snacks: 'भेल पूरी, लहसुन चटनी, सॉस, चाय', dinner: 'गोभी मुस्सल्लम, रसम, रोटी, चावल, रसगुल्ला, सलाद' },
  { day: 'Tuesday', bf: 'इडली-सांभर, ब्रेड, जैम, मक्खन, दूध, स्प्राउट, कॉर्नफ्लेक्स, केला, कॉफी', lunch: 'राजमा, मिक्स सब्जी, रोटी, चावल, सलाद, अचार, फ्राई मिर्च', snacks: 'पास्ता, सॉस, चाय', dinner: 'फ्राइड राइस, मंचूरियन (गोभी), दाल, चावल, सलाद' },
  { day: 'Wednesday', bf: 'आलू मटर कचौड़ी, धनिया चटनी, ब्रेड, जैम, मक्खन, दूध, स्प्राउट, कॉर्नफ्लेक्स, केला, कॉफी', lunch: 'गाजर मटर, अरहर दाल, जीरा चावल, रोटी, सलाद, फ्राई मिर्च', snacks: 'कटलेट, सॉस, चाय', dinner: 'छोले, पूरी, चावल, सलाद, सेवई, अचार, सलाद' },
  { day: 'Thursday', bf: 'मेथी पराठा, मटर सब्जी, ब्रेड, जैम, मक्खन, दूध, स्प्राउट, कॉर्नफ्लेक्स, केला, कॉफी', lunch: 'दम आलू (ग्रेवी), चना दाल, चावल, रोटी, सलाद, फ्राई मिर्च', snacks: 'मैगी, सॉस, चाय', dinner: 'पनीर भुर्जी, मिक्स दाल, रोटी, चावल, सलाद' },
  { day: 'Friday', bf: 'प्याज कचौड़ी, दम आलू, जलेबी, दूध, ब्रेड, जैम, मक्खन, दूध, स्प्राउट, कॉर्नफ्लेक्स, केला, कॉफी', lunch: 'लौकी कोफ्ता, चावल, रोटी, सलाद, फ्राई मिर्च', snacks: 'आलू टिक्की, चाय', dinner: 'आलू गोभी मटर ग्रेवी, दाल, चावल, भटुए का पराठा, सलाद, खीर' },
  { day: 'Saturday', bf: 'समोसे, छोले, मीठी चटनी + तीखी चटनी, ब्रेड, जैम, मक्खन, चाय, स्प्राउट, कॉर्नफ्लेक्स, केला', lunch: 'शाही पनीर, पूरी, सलाद, पुलाव, गुलाब जामुन, फ्राई मिर्च', snacks: 'BREAK', dinner: 'बिरयानी, रायता, अचार, चटनी, पापड़' },
  { day: 'Sunday', bf: 'वेज रोल, सॉस, ब्रेड, जैम, मक्खन, दूध, स्प्राउट, कॉर्नफ्लेक्स, केला, कॉफी', lunch: 'छोले भटूरे, फ्राई मिर्च, लहसुन चटनी, चावल, मीठी चटनी, दही वड़ा, सलाद, फ्राई मिर्च', snacks: 'पोहा, सॉस, चाय', dinner: 'पालक पनीर, दाल, चावल, रोटी, सलाद, गाजर हलवा' },
];

const ComplaintForm: React.FC<Props> = ({ user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showMessMenu, setShowMessMenu] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>('Room');
  const [category, setCategory] = useState<ComplaintCategory>('Electrical');
  const [washroomBlock, setWashroomBlock] = useState<string>(`T-${user.floor}1`);
  const [messBranch, setMessBranch] = useState<'A' | 'B'>('A');
  const [description, setDescription] = useState('');

  const washroomBlocks = [1, 2, 3, 4].map(n => `T-${user.floor}${n}`);

  useEffect(() => {
    if (locationType === 'Mess') setCategory('Mess');
    else if (category === 'Mess') setCategory('Electrical');
  }, [locationType, category]);

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
              suggestedCategory: { type: Type.STRING, description: "One of: Electrical, Plumbing, Cleanliness, Other" },
              refinedDescription: { type: Type.STRING, description: "A professionally rewritten description" }
            },
            propertyOrdering: ["suggestedCategory", "refinedDescription"]
          }
        }
      });
      
      const resultText = response.text;
      if (resultText) {
        const data = JSON.parse(resultText.trim());
        if (data.suggestedCategory) {
          const valid: any = ['Electrical', 'Plumbing', 'Cleanliness', 'Other'];
          if (valid.includes(data.suggestedCategory)) setCategory(data.suggestedCategory);
        }
        if (data.refinedDescription) setDescription(data.refinedDescription);
      }
    } catch (err) { console.error("AI Assist failed:", err); } finally { setAiLoading(false); }
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
    <div className="space-y-6">
      {/* MESS MENU BUTTON */}
      <button 
        onClick={() => setShowMessMenu(true)}
        className="w-full bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] p-6 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-indigo-200/50 active-scale group overflow-hidden relative border border-white/5"
      >
        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-600/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white/10">
            🍱
          </div>
          <div className="text-left">
            <h3 className="text-white font-black text-lg tracking-tight leading-none mb-1.5">Weekly Mess Menu</h3>
            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">View Food Schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white/20 text-2xl font-black">→</span>
        </div>
      </button>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Report Issue</h2>
          <button type="button" onClick={handleAiAssist} disabled={aiLoading || !description} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest active-scale">
            {aiLoading ? 'Thinking...' : '✨ AI Fix'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* MESS MENU MODAL */}
      {showMessMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl" onClick={() => setShowMessMenu(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">SVBH Mess Menu</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Weekly Official Schedule</p>
              </div>
              <button onClick={() => setShowMessMenu(false)} className="w-12 h-12 bg-slate-100 text-slate-900 rounded-full flex items-center justify-center font-black active-scale shadow-sm">✕</button>
            </div>

            <div className="flex-1 overflow-auto custom-scroll p-4 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
              {MESS_MENU_IMAGE_URL ? (
                <img src={MESS_MENU_IMAGE_URL} alt="Mess Menu" className="w-full h-auto rounded-[2rem] shadow-inner" />
              ) : (
                /* DIGITAL MENU TABLE FALLBACK - FIXED SCROLLING */
                <div className="relative">
                  <div className="overflow-x-auto rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="min-w-[1000px] bg-white">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#0f172a] text-white">
                            <th className="p-5 text-left text-[11px] font-black uppercase tracking-widest sticky left-0 z-10 bg-[#0f172a] border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.1)] w-[140px]">Meal</th>
                            {MENU_DATA.map(m => (
                              <th key={m.day} className="p-5 text-center text-[11px] font-black uppercase tracking-widest border-r border-white/5">{m.day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr className="border-b border-slate-100 group">
                            <td className="p-6 font-black text-slate-400 text-[10px] uppercase sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">🍳 Breakfast</td>
                            {MENU_DATA.map(m => (
                              <td key={m.day} className="p-6 text-slate-800 font-bold text-center border-r border-slate-100 align-top text-[11px] leading-relaxed group-hover:bg-indigo-50/30 transition-colors">
                                {m.bf}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-slate-100 bg-white group">
                            <td className="p-6 font-black text-slate-400 text-[10px] uppercase sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">🍲 Lunch</td>
                            {MENU_DATA.map(m => (
                              <td key={m.day} className="p-6 text-slate-800 font-bold text-center border-r border-slate-100 align-top text-[11px] leading-relaxed group-hover:bg-indigo-50/30 transition-colors">
                                {m.lunch}
                              </td>
                            ))}
                          </tr>
                          <tr className="border-b border-slate-100 group">
                            <td className="p-6 font-black text-slate-400 text-[10px] uppercase sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">☕ Snacks</td>
                            {MENU_DATA.map(m => (
                              <td key={m.day} className={`p-6 text-slate-800 font-bold text-center border-r border-slate-100 align-top text-[11px] leading-relaxed group-hover:bg-indigo-50/30 transition-colors ${m.snacks === 'BREAK' ? 'bg-slate-100/50 text-slate-300 italic' : ''}`}>
                                {m.snacks}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-white group">
                            <td className="p-6 font-black text-slate-400 text-[10px] uppercase sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[4px_0_10px_rgba(0,0,0,0.02)]">🍱 Dinner</td>
                            {MENU_DATA.map(m => (
                              <td key={m.day} className="p-6 text-slate-800 font-bold text-center border-r border-slate-100 align-top text-[11px] leading-relaxed group-hover:bg-indigo-50/30 transition-colors">
                                {m.dinner}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* SCROLL HINT GRADIENT */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-[2rem]"></div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 text-center">
               <div className="flex items-center justify-center gap-2 mb-4">
                 <span className="text-sm">👈</span>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Swipe table horizontally to see all days</p>
                 <span className="text-sm">👉</span>
               </div>
               <button onClick={() => setShowMessMenu(false)} className="w-full py-5 bg-[#0f172a] text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl active-scale transition-all">
                 CLOSE MENU
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintForm;
