
'use server';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData } from 'firebase/firestore';
import type { Expense, Budget, TaxRule } from '@/lib/types';

// Helper to convert Firestore doc to our type
function toObject<T>(docData: DocumentData): T {
    const obj = { ...docData } as T;
    // You might need to handle Date conversions if you store Timestamps
    // For example: if (obj.date) obj.date = obj.date.toDate();
    return obj;
}

// Expenses
const expensesCollection = collection(db, 'expenses');

export async function getExpenses(): Promise<Expense[]> {
    const snapshot = await getDocs(expensesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Expense, 'id'>>(doc.data()) }));
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    const docRef = await addDoc(expensesCollection, expense);
    return docRef.id;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
    const docRef = doc(db, 'expenses', id);
    await updateDoc(docRef, data);
}

export async function deleteExpense(id: string): Promise<void> {
    const docRef = doc(db, 'expenses', id);
    await deleteDoc(docRef);
}

// Budgets
const budgetsCollection = collection(db, 'budgets');

export async function getBudgets(): Promise<Budget[]> {
    const snapshot = await getDocs(budgetsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<Budget, 'id'>>(doc.data()) }));
}

export async function addBudget(budget: Omit<Budget, 'id'>): Promise<string> {
    const docRef = await addDoc(budgetsCollection, budget);
    return docRef.id;
}

export async function updateBudget(id: string, budget: Partial<Budget>): Promise<void> {
    const docRef = doc(db, 'budgets', id);
    await updateDoc(docRef, budget);
}

export async function deleteBudget(id: string): Promise<void> {
    const docRef = doc(db, 'budgets', id);
    await deleteDoc(docRef);
}

// Tax Rules
const taxRulesCollection = collection(db, 'taxRules');

export async function getTaxRules(): Promise<TaxRule[]> {
    const snapshot = await getDocs(taxRulesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...toObject<Omit<TaxRule, 'id'>>(doc.data()) }));
}

export async function addTaxRule(rule: Omit<TaxRule, 'id'>): Promise<string> {
    const docRef = await addDoc(taxRulesCollection, rule);
    return docRef.id;
}

export async function updateTaxRule(id: string, data: Partial<TaxRule>): Promise<void> {
    const docRef = doc(db, 'taxRules', id);
    await updateDoc(docRef, data);
}

export async function deleteTaxRule(id: string): Promise<void> {
    const docRef = doc(db, 'taxRules', id);
    await deleteDoc(docRef);
}
