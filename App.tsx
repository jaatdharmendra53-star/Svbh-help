
import React, { useState, useEffect } from 'react';
import { UserProfile, Complaint, ComplaintCategory, ComplaintStatus } from './types';
import { fetchMyComplaints, fetchCommunityComplaints, fetchFilteredComplaints, updateComplaintStatus, toggleSupport } from './services/complaintService';
import { db } from './services/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import ComplaintForm from './components/ComplaintForm';
import ComplaintCard from './components/ComplaintCard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'my' | 'new' | 'community' | 'warden'>('new');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  
  const [loginName, setLoginName] = useState('');
  const [loginRegNo, setLoginRegNo] = useState('');
  const [loginRoomNo, setLoginRoomNo] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Warden Filter States: 0 means All Floors
  const [filterFloor, setFilterFloor] = useState<number>(0);
  const [filterCategory, setFilterCategory] = useState<ComplaintCategory | 'All'>('All');

  // TRIGGER: Detect Warden mode based on name input
  const isWardenMode = loginName.toLowerCase() === 'warden';

  useEffect(() => {
    const savedUser = localStorage.getItem('svbh_session');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as UserProfile;
      setCurrentUser(parsedUser);
      if (parsedUser.role === 'Warden') setActiveTab('warden');
    }
    setLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    
    try {
      if (isWardenMode) {
        if (loginPassword === 'warden123') { // Warden default PIN
          const wardenUser: UserProfile = {
            uid: 'WARDEN_ROOT',
            name: 'Warden Admin',
            email: 'warden@svbh.edu',
            role: 'Warden',
            floor: 0,
            roomNumber: 'W-01',
            regNo: 'WARDEN',
            branch: 'Management'
          };
          setCurrentUser(wardenUser);
          localStorage.setItem('svbh_session', JSON.stringify(wardenUser));
          setActiveTab('warden');
        } else { throw new Error('Incorrect Warden PIN.'); }
      } else {
        const qDir = query(collection(db, 'student_directory'), where('regNo', '==', loginRegNo.trim()));
        const snap = await getDocs(qDir);
        if (snap.empty) throw new Error('Reg. No not in directory.');

        const data = snap.docs[0].data();
        if (data.name.toLowerCase() !== loginName.toLowerCase()) throw new Error('Details mismatch.');

        const userDocRef = doc(db, 'users', loginRegNo.trim());
        const userDocSnap = await getDoc(userDocRef);
        let finalUser: UserProfile;

        if (userDocSnap.exists()) {
          finalUser = userDocSnap.data() as UserProfile;
        } else {
          if (!loginRoomNo) throw new Error('Required: Room Number');
          finalUser = {
            uid: loginRegNo.trim(),
            name: data.name,
            email: `${loginRegNo.trim()}@svbh.edu`,
            role: 'Student',
            floor: Math.floor(parseInt(loginRoomNo) / 100) || 1,
            roomNumber: loginRoomNo,
            regNo: loginRegNo.trim(),
            branch: 'Student'
          };
          await setDoc(userDocRef, finalUser);
        }
        setCurrentUser(finalUser);
        localStorage.setItem('svbh_session', JSON.stringify(finalUser));
        setActiveTab('new');
      }
    } catch (err: any) { setLoginError(err.message); } finally { setLoading(false); }
  };

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (currentUser.role === 'Warden' || activeTab === 'warden') {
        const data = await fetchFilteredComplaints(filterFloor, filterCategory);
        setComplaints(data);
      } else {
        const data = activeTab === 'my' 
          ? await fetchMyComplaints(currentUser.uid) 
          : await fetchCommunityComplaints(currentUser.floor);
        setComplaints(data);
      }
    } catch (e) { 
      console.warn("Sync failed.", e); 
      setComplaints([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [currentUser, activeTab, filterFloor, filterCategory]);

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-[#0f172a] flex flex-col items-center justify-end p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl mb-6 animate-bounce">🏛️</div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">SVBH HELP</h1>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.3em]">{isWardenMode ? 'Warden Access' : 'Mobile Support Portal'}</p>
        </div>
        
        <form onSubmit={handleLogin} className="w-full bg-white/10 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 space-y-4 mb-4">
          <input required type="text" placeholder="Full Name" value={loginName} onChange={e => setLoginName(e.target.value)} className="w-full bg-white/5 border-none p-5 rounded-2xl text-white font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
          
          {!isWardenMode && (
            <>
              <input required type="text" placeholder="Registration Number" value={loginRegNo} onChange={e => setLoginRegNo(e.target.value)} className="w-full bg-white/5 border-none p-5 rounded-2xl text-white font-bold placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all outline-none" />
              <input type="text" placeholder="Room Number (Required once)" value={loginRoomNo} onChange={e => setLoginRoomNo(e.target.value)} className="w-full bg-white/5 border-none p-5 rounded-2xl text-white font-bold placeholder:text-slate-500 outline-none" />
            </>
          )}

          {isWardenMode && (
            <input required type="password" placeholder="Warden PIN" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-indigo-500/20 border border-indigo-500/30 p-5 rounded-2xl text-white font-bold outline-none animate-in fade-in slide-in-from-top-2" />
          )}

          {loginError && <p className="text-rose-400 text-[10px] font-black uppercase text-center">{loginError}</p>}
          <button type="submit" disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl">
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pb-4">Secured by SVBH IT Dept</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      <header className="bg-[#0f172a] pt-[env(safe-area-inset-top,20px)] pb-6 px-6 rounded-b-[2.5rem] shadow-2xl z-50">
        <div className="flex justify-between items-center mt-4">
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight">SVBH HELP</h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">{currentUser.role} Portal</span>
            </div>
          </div>
          <button onClick={() => setShowProfile(true)} className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg active:scale-90 transition-all">
            {currentUser.name.charAt(0)}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scroll pb-32">
        {currentUser.role === 'Student' ? (
          <div className="p-6">
            {activeTab === 'new' && <ComplaintForm user={currentUser} onSuccess={() => setActiveTab('my')} />}
            {(activeTab === 'my' || activeTab === 'community') && (
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-900 px-1">{activeTab === 'my' ? 'My Activity' : 'Public Feed'}</h2>
                {complaints.length > 0 ? (
                  complaints.map(c => <ComplaintCard key={c.id} complaint={c} currentUserUid={currentUser.uid} onSupportToggle={id => toggleSupport(id, currentUser.uid).then(loadData)} />)
                ) : (
                  <div className="text-center py-20 opacity-20 font-black uppercase text-[10px] tracking-widest">Nothing to show</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* WARDEN FILTER AREA - Z-INDEX INCREASED TO 40 TO OVERLAY CARDS */}
            <div className="bg-white/95 backdrop-blur-md px-6 py-6 border-b border-slate-200 sticky top-0 z-[40] shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Manage Feed</h2>
                <div className="flex items-center bg-slate-100 rounded-xl px-3 py-1.5 gap-2 border border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Floor:</span>
                  <select 
                    value={filterFloor} 
                    onChange={e => setFilterFloor(parseInt(e.target.value))} 
                    className="bg-transparent font-black text-[10px] uppercase text-indigo-600 border-none outline-none cursor-pointer"
                  >
                    <option value={0}>All Floors</option>
                    {[1,2,3,4,5,6,7].map(f => <option key={f} value={f}>Floor {f}</option>)}
                  </select>
                </div>
              </div>

              {/* CATEGORY CHIPS */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Electrical', 'Plumbing', 'Cleanliness', 'Mess', 'Other'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setFilterCategory(cat as any)} 
                    className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active-scale ${filterCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {cat === 'All' ? '📌' : cat === 'Electrical' ? '⚡' : cat === 'Plumbing' ? '🚰' : cat === 'Cleanliness' ? '🧹' : cat === 'Mess' ? '🍱' : '📝'} {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 pt-0 space-y-4">
              {complaints.length > 0 ? (
                complaints.map(c => <ComplaintCard key={c.id} complaint={c} isWarden onStatusUpdate={(id, status) => updateComplaintStatus(id, status).then(loadData)} />)
              ) : (
                <div className="text-center py-20 opacity-30 font-black uppercase text-xs tracking-widest">
                  No {filterCategory !== 'All' ? filterCategory : ''} reports 
                  {filterFloor !== 0 ? ` on floor ${filterFloor}` : ''}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-3xl border-t border-slate-100 px-8 pt-4 pb-[calc(1.5rem+var(--safe-area-inset-bottom))] flex justify-around items-center z-50">
        {currentUser.role === 'Student' ? (
          <>
            <NavItem icon="✍️" label="New" active={activeTab === 'new'} onClick={() => setActiveTab('new')} />
            <NavItem icon="🌐" label="Feed" active={activeTab === 'community'} onClick={() => setActiveTab('community')} />
            <NavItem icon="📋" label="History" active={activeTab === 'my'} onClick={() => setActiveTab('my')} />
          </>
        ) : (
          <div className="w-full flex gap-3">
             <button onClick={loadData} className="flex-1 bg-indigo-50 text-indigo-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all">REFRESH LIST</button>
             <button onClick={() => { localStorage.removeItem('svbh_session'); window.location.reload(); }} className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-200 active:scale-95 transition-all">LOGOUT</button>
          </div>
        )}
      </nav>

      {showProfile && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowProfile(false)}></div>
          <div className="w-full max-w-sm bg-white rounded-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom-full duration-300 relative">
             <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
             <div className="text-center mb-8">
                <div className="h-20 w-20 bg-indigo-600 text-white rounded-[2rem] mx-auto flex items-center justify-center text-3xl font-black mb-4 shadow-xl">{currentUser.name.charAt(0)}</div>
                <h3 className="text-2xl font-black text-slate-900">{currentUser.name}</h3>
                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">{currentUser.role === 'Warden' ? 'STAFF' : currentUser.regNo}</p>
             </div>
             <div className="space-y-3">
                <button onClick={() => setShowProfile(false)} className="w-full py-5 bg-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs">Close Profile</button>
                <button onClick={() => { localStorage.removeItem('svbh_session'); window.location.reload(); }} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-200">Logout</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 active-scale transition-all duration-300 ${active ? 'text-indigo-600 translate-y-[-4px]' : 'text-slate-400 opacity-60'}`}>
    <span className="text-2xl">{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
