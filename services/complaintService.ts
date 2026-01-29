
import { 
  collection, 
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
  addDoc,
  QueryConstraint
} from "firebase/firestore";
import { db } from './firebase';
import { Complaint, ComplaintStatus, ComplaintCategory } from '../types';

const COMPLAINTS_COL = 'complaints';
const FETCH_LIMIT = 50;
const RESOLVED_DAYS_LIMIT = 3;

const getResolvedCutoff = () => Date.now() - (RESOLVED_DAYS_LIMIT * 24 * 60 * 60 * 1000);

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

/**
 * Generic helper to perform the "Smart Filter" on a set of base constraints
 */
async function fetchSmartFiltered(baseConstraints: QueryConstraint[]): Promise<Complaint[]> {
  const resolvedCutoff = getResolvedCutoff();

  // Query 1: Active (Pending or In Progress) - No Time Limit
  const activeQuery = query(
    collection(db, COMPLAINTS_COL),
    ...baseConstraints,
    where('status', 'in', ['Pending', 'In Progress']),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  );

  // Query 2: Resolved - 3 Day Limit
  const resolvedQuery = query(
    collection(db, COMPLAINTS_COL),
    ...baseConstraints,
    where('status', '==', 'Resolved'),
    where('timestamp', '>=', resolvedCutoff),
    orderBy('timestamp', 'desc'),
    limit(FETCH_LIMIT)
  );

  const [activeSnap, resolvedSnap] = await Promise.all([
    getDocs(activeQuery),
    getDocs(resolvedQuery)
  ]);

  const results = [
    ...activeSnap.docs.map(d => sanitizeData(d.id, d.data())),
    ...resolvedSnap.docs.map(d => sanitizeData(d.id, d.data()))
  ];

  // Combine, sort by newest, and cap total
  return results
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, FETCH_LIMIT);
}

export const fetchMyComplaints = async (uid: string): Promise<Complaint[]> => {
  return fetchSmartFiltered([where('uid', '==', uid)]);
};

export const fetchCommunityComplaints = async (floor: number): Promise<Complaint[]> => {
  // We need to fetch for two distinct categories: Washroom (on floor) and Mess (global)
  // Each must respect the Active + Recent Resolved logic.
  
  const washroomResults = await fetchSmartFiltered([
    where('floor', '==', floor),
    where('locationType', '==', 'Washroom')
  ]);

  const messResults = await fetchSmartFiltered([
    where('locationType', '==', 'Mess')
  ]);

  const combined = [...washroomResults, ...messResults];
  return combined
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, FETCH_LIMIT);
};

export const fetchFilteredComplaints = async (
  floor: number, // 0 means All Floors
  category?: ComplaintCategory | 'All',
  status?: ComplaintStatus
): Promise<Complaint[]> => {
  const baseConstraints: QueryConstraint[] = [];
  
  if (floor !== 0) {
    baseConstraints.push(where('floor', '==', floor));
  }
  
  if (category && category !== 'All') {
    baseConstraints.push(where('complaintCategory', '==', category));
  }

  // If a specific status is requested, handle accordingly
  if (status) {
    const constraints = [...baseConstraints, where('status', '==', status)];
    
    // If specifically viewing Resolved, apply the 3-day cleanup limit
    if (status === 'Resolved') {
      constraints.push(where('timestamp', '>=', getResolvedCutoff()));
    }
    
    const q = query(collection(db, COMPLAINTS_COL), ...constraints, orderBy('timestamp', 'desc'), limit(FETCH_LIMIT));
    const snap = await getDocs(q);
    return snap.docs.map(doc => sanitizeData(doc.id, doc.data()));
  }

  // If status is "All" (not provided), use the smart split-logic
  return fetchSmartFiltered(baseConstraints);
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
