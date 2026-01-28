
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
  getDoc
} from "firebase/firestore";
import { db } from './firebase';
import { Complaint, ComplaintStatus, ComplaintCategory } from '../types';

const COMPLAINTS_COL = 'complaints';

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
  const q = query(collection(db, COMPLAINTS_COL), where('uid', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => sanitizeData(doc.id, doc.data()))
    .sort((a, b) => b.timestamp - a.timestamp);
};

export const fetchCommunityComplaints = async (floor: number): Promise<Complaint[]> => {
  // Washrooms on same floor OR any Mess complaint
  const washroomQuery = query(
    collection(db, COMPLAINTS_COL),
    where('floor', '==', floor),
    where('locationType', '==', 'Washroom')
  );
  const messQuery = query(collection(db, COMPLAINTS_COL), where('locationType', '==', 'Mess'));
  const [wSnap, mSnap] = await Promise.all([getDocs(washroomQuery), getDocs(messQuery)]);
  const results = [
    ...wSnap.docs.map(d => sanitizeData(d.id, d.data())),
    ...mSnap.docs.map(d => sanitizeData(d.id, d.data()))
  ];
  return results.sort((a, b) => b.timestamp - a.timestamp);
};

export const fetchComplaintsByFloor = async (
  floor: number, 
  category?: ComplaintCategory, 
  status?: ComplaintStatus
): Promise<Complaint[]> => {
  let q = query(collection(db, COMPLAINTS_COL), where('floor', '==', floor));
  if (category) q = query(q, where('complaintCategory', '==', category));
  if (status) q = query(q, where('status', '==', status));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map(doc => sanitizeData(doc.id, doc.data()))
    .sort((a, b) => b.timestamp - a.timestamp);
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
