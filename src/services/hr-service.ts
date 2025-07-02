
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, Timestamp, query, where } from 'firebase/firestore';
import type { StaffMember, LeaveRequest, LoanRequest, JobOpening, Applicant, AttendanceRecord, PerformanceReview, Payslip, Role } from '@/lib/types';

// Helper to convert Firestore doc to our type, handling Timestamps
function toObject<T>(docData: DocumentData): T {
    const obj: { [key: string]: any } = {};
    for (const key in docData) {
        if (docData[key] instanceof Timestamp) {
            obj[key] = docData[key].toDate();
        } else {
            obj[key] = docData[key];
        }
    }
    return obj as T;
}

const getCollection = <T>(collectionName: string) => collection(db, collectionName);

// Generic Service Functions
async function getAll<T>(collectionName: string): Promise<T[]> {
    const snapshot = await getDocs(getCollection<T>(collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<T, 'id'>>(doc.data()) }));
}

async function add<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(getCollection<T>(collectionName), data as DocumentData);
    return docRef.id;
}

async function update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, data as DocumentData);
}

async function remove(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
}

// Staff
export async function getStaff() { return await getAll<StaffMember>('staff'); }
export async function addStaff(data: Omit<StaffMember, 'id'>) { return await add<StaffMember>('staff', data); }
export async function updateStaff(id: string, data: Partial<StaffMember>) { return await update<StaffMember>('staff', id, data); }
export async function deleteStaff(id: string) { return await remove('staff', id); }
export async function getUsersByRole(role: Role): Promise<StaffMember[]> {
    const q = query(collection(db, 'staff'), where("role", "==", role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<StaffMember, 'id'>>(doc.data()) }));
}

// Leave Requests
export async function getLeaveRequests() { return await getAll<LeaveRequest>('leaveRequests'); }
export async function addLeaveRequest(data: Omit<LeaveRequest, 'id'>) { return await add<LeaveRequest>('leaveRequests', data); }
export async function updateLeaveRequest(id: string, data: Partial<LeaveRequest>) { return await update<LeaveRequest>('leaveRequests', id, data); }

// Loan Requests
export async function getLoanRequests() { return await getAll<LoanRequest>('loanRequests'); }
export async function addLoanRequest(data: Omit<LoanRequest, 'id'>) { return await add<LoanRequest>('loanRequests', data); }
export async function updateLoanRequest(id: string, data: Partial<LoanRequest>) { return await update<LoanRequest>('loanRequests', id, data); }

// Job Openings
export async function getJobOpenings() { return await getAll<JobOpening>('jobOpenings'); }
export async function addJobOpening(data: Omit<JobOpening, 'id'>) { return await add<JobOpening>('jobOpenings', data); }

// Applicants
export async function getApplicants() { return await getAll<Applicant>('applicants'); }
export async function addApplicant(data: Omit<Applicant, 'id'>) { return await add<Applicant>('applicants', data); }

// Attendance
export async function getAttendance() { return await getAll<AttendanceRecord>('attendance'); }
export async function addAttendance(data: Omit<AttendanceRecord, 'id'>) { return await add<AttendanceRecord>('attendance', data); }

// Performance Reviews
export async function getPerformanceReviews() { return await getAll<PerformanceReview>('performanceReviews'); }
export async function addPerformanceReview(data: Omit<PerformanceReview, 'id'>) { return await add<PerformanceReview>('performanceReviews', data); }

// Payslips
export async function getPayslips() { return await getAll<Payslip>('payslips'); }
export async function addPayslip(data: Omit<Payslip, 'id'>) { return await add<Payslip>('payslips', data); }
export async function updatePayslip(id: string, data: Partial<Payslip>) { return await update<Payslip>('payslips', id, data); }
