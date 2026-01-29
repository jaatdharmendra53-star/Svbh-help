
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where, 
  arrayUnion, 
  arrayRemove,
  getDoc,
  orderBy,
  limit,
  QueryConstraint
} from "firebase/firestore";
import { db } from './firebase';
import { Complaint, ComplaintStatus, ComplaintCategory } from '../types';

const COMPLAINTS_COL = 'complaints';
const FETCH_LIMIT = 50;
const DAYS_TO_FETCH = 15;

const getCutoffTimestamp = () => Date.now() - (DAYS_TO_FETCH * 24 * 60 * 60 * 1000);

const sanitizeData = (docId: string, data: any): Complaint => {
  const sanitized: any = {
    id: docId,
    studentName: String(data.studentName || 'Unknown'),
    uid: String(data.uid || ''),
    floor: Number(data.floor || 0),
    roomNumber: String(data.roomNumber || ''),
    complaintCategory: data.complaintCategory,
    locationType: data.locationType,
    subLocation: String(data.subLocation || ''),
    description: String(data.description || ''),
    status: (data.status || 'Pending') as ComplaintStatus,
    supportUids: Array.isArray(data.supportUids) ? data.supportUids.map(String) : [],
    resolveOTP: String(data.resolveOTP || '0000'),
    messBranch: data.messBranch,
    washroomBlock: data.washroomBlock,
  };

  if (data.timestamp) {
    if (typeof data.timestamp.toMillis === 'function') {
      sanitized.timestamp = data.timestamp.toMillis();
    } else if (data.timestamp instanceof Date) {
      sanitized.timestamp = data.timestamp.getTime();
    } else {
      sanitized.timestamp = Number(data.timestamp);
    }
  } else {
    sanitized.timestamp = Date.now();
  }

  if (data.startedAt) sanitized.startedAt = String(data.startedAt);
  if (data.unitNumber) sanitized.unitNumber = Number(data.unitNumber);

  return sanitized as Complaint;
};

export const fetchMyComplaints = async (uid: string): Promise<Complaint[]> => {
  const cutoff = getCutoffTimestamp();
  // Using server-side orderBy and limit as requested. 
  // Requires Composite Index: uid (Asc) + timestamp (Desc)
  const q = query(
    collection(db, COMPLAINTS_COL), 
    where('uid', '==', uid),
    where('timestamp', '>=', cutoff),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => sanitizeData(doc.id, doc.data()));
};

export const fetchCommunityComplaints = async (floor: number): Promise<Complaint[]> => {
  const cutoff = getCutoffTimestamp();
  
  // Query 1: Washroom complaints on student's floor (Last 15 days)
  const washroomQuery = query(
    collection(db, COMPLAINTS_COL),
    where('floor', '==', floor),
    where('locationType', '==', 'Washroom'),
    where('timestamp', '>=', cutoff),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  );

  // Query 2: Mess complaints (Global, Last 15 days)
  const messQuery = query(
    collection(db, COMPLAINTS_COL), 
    where('locationType', '==', 'Mess'),
    where('timestamp', '>=', cutoff),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  );

  const [wSnap, mSnap] = await Promise.all([getDocs(washroomQuery), getDocs(messQuery)]);
  
  const results = [
    ...wSnap.docs.map(d => sanitizeData(d.id, d.data())),
    ...mSnap.docs.map(d => sanitizeData(d.id, d.data()))
  ];

  // Merge and re-sort since we combined two separate queries
  return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, FETCH_LIMIT);
};

export const fetchFilteredComplaints = async (
  floor: number, // 0 means All Floors
  category?: ComplaintCategory | 'All',
  status?: ComplaintStatus
): Promise<Complaint[]> => {
  const cutoff = getCutoffTimestamp();
  const constraints: QueryConstraint[] = [
    where('timestamp', '>=', cutoff),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  ];
  
  if (floor !== 0) {
    constraints.unshift(where('floor', '==', floor));
  }
  
  if (category && category !== 'All') {
    constraints.unshift(where('complaintCategory', '==', category));
  }
  
  if (status) {
    constraints.unshift(where('status', '==', status));
  }

  const q = query(collection(db, COMPLAINTS_COL), ...constraints);
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => sanitizeData(doc.id, doc.data()));
};

export const toggleSupport = async (complaintId: string, uid: string): Promise<void> => {
  const complaintRef = doc(db, COMPLAINTS_COL, complaintId);
  const complaintSnap = await getDoc(complaintRef);
  if (!complaintSnap.exists()) return;
  const data = complaintSnap.data();
  const supports = data.supportUids || [];
  if (supports.includes(uid)) {
    await updateDoc(complaintRef, { supportUids: arrayRemove(uid) });
  } else {
    await updateDoc(complaintRef, { supportUids: arrayUnion(uid) });
  }
};

export const addComplaint = async (complaint: Omit<Complaint, 'id' | 'timestamp' | 'supportUids' | 'resolveOTP'>): Promise<void> => {
  const generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();

  await addDoc(collection(db, COMPLAINTS_COL), {
    studentName: String(complaint.studentName),
    uid: String(complaint.uid),
    floor: Number(complaint.floor),
    roomNumber: String(complaint.roomNumber),
    complaintCategory: complaint.complaintCategory,
    locationType: complaint.locationType,
    subLocation: String(complaint.subLocation),
    description: String(complaint.description),
    status: 'Pending',
    timestamp: Date.now(),
    supportUids: [],
    resolveOTP: generatedOTP,
    messBranch: complaint.messBranch || null,
    washroomBlock: complaint.washroomBlock || null,
    ...(complaint.unitNumber ? { unitNumber: Number(complaint.unitNumber) } : {})
  });
};

export const updateComplaintStatus = async (id: string, status: ComplaintStatus): Promise<void> => {
  const complaintRef = doc(db, COMPLAINTS_COL, id);
  const updateData: any = { status };
  if (status === 'In Progress') updateData.startedAt = new Date().toISOString();
  await updateDoc(complaintRef, updateData);
};
