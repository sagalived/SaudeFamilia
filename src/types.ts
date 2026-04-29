import { Timestamp } from 'firebase/firestore';

export enum UserRole {
  PARENT = 'parent',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  cpf?: string;
  crm?: string;
  familyId?: string;
  createdAt: Timestamp;
}

export interface Family {
  id: string;
  name: string;
  members: string[]; // UIDs
}

export interface Dependent {
  id: string;
  familyId: string;
  name: string;
  dob: string; // ISO Date
  sex: 'M' | 'F';
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  photoUrl?: string;
  createdAt: Timestamp;
}

export interface GrowthMetric {
  id: string;
  dependentId: string;
  date: string; // ISO Date or Timestamp
  height: number; // in cm
  weight: number; // in kg
}

export interface Vaccination {
  id: string;
  dependentId: string;
  vaccineName: string;
  dose: string;
  date: string;
  status: 'applied' | 'pending';
}

export interface MedicalRecord {
  id: string;
  dependentId: string;
  date: string;
  specialty: string;
  doctorName: string;
  doctorCrm?: string;
  symptoms: string;
  diagnosis?: string;
  prescription?: string;
  attachments?: string[];
}
