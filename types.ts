
export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved';
export type ComplaintCategory = 'Electrical' | 'Plumbing' | 'Cleanliness' | 'Mess' | 'Other';
export type LocationType = 'Room' | 'Washroom' | 'Mess';
export type UserRole = 'Student' | 'Admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  floor: number;
  roomNumber: string;
  regNo: string;
  branch: string;
}

export interface Complaint {
  id?: string;
  studentName: string;
  uid: string;
  floor: number;
  roomNumber: string;
  complaintCategory: ComplaintCategory;
  locationType: LocationType;
  messBranch?: 'A' | 'B';
  washroomBlock?: string; // e.g. T-21
  unitNumber?: number;
  subLocation: string;
  description: string;
  status: ComplaintStatus;
  timestamp: any;
  startedAt?: string;
  supportUids?: string[];
  resolveOTP: string;
}
